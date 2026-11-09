import { scopedFetch } from './base'
import { apiJson } from './http'
import { errorMessage } from './errors'
import { isRecord } from './json'
import { readSSEStream } from '@/lib/sse'
import { humanizeStep } from '@/lib/assistantTools'
import type { ViewContext } from '@/lib/viewContext'
import type {
  AssistantAction,
  AssistantProposal,
  AssistantResultDetails,
  CampaignAssistantAction,
  Grounding,
  PostAssistantAction,
  ReviewFinding,
  ReviewSeverity,
  StreamedPost,
  ThreadSubject,
  Touched,
} from '@/types/assistant'

/**
 * The universal assistant (CON-444/450): one endpoint, one thread per scope.
 * A turn is `POST /api/assistant` with the instruction and the view context it
 * was sent from; the thread is named by the view context's scope. The campaign
 * and post assistants are packs behind it now, and their events stream through
 * the same response.
 */

/** A persisted turn. A model row's `content` is its `complete` event's JSON. */
export type AssistantHistoryMessage = {
  id: string
  role: 'user' | 'model'
  content: string
  view_context?: Record<string, unknown>
  created_at: string
}

/**
 * What a turn did, read out of its `complete` payload. The campaign and post
 * packs report their own structured results; everything else is prose plus
 * what the turn touched.
 */
export type AssistantTurnResult = {
  explanation: string
  action: AssistantAction
  /** Campaign-pack results — the plan, the dates, the reviews. */
  details: AssistantResultDetails
  /** Post-pack results. */
  saveVersion: boolean
  versionNote?: string
  /** A clone the post pack created (CON-59). */
  clonePostId?: string
  /** What the turn changed, for the client to refresh. */
  touched: Touched[]
  /** The turn ran but could not be stored, so it won't survive a reload. */
  unsaved: boolean
  /** Offers the turn made, waiting for the user's yes (CON-446). */
  proposals: AssistantProposal[]
}

export type AssistantStreamEvent =
  | { type: 'explanation_delta'; delta: string }
  // Each delta is the whole document so far, not a patch — concatenating the
  // deltas reproduces the full updated content (verified against the API).
  | { type: 'content_delta'; delta: string }
  | {
      type: 'tool_call'
      name: string
      ref?: string
      input?: Record<string, unknown>
    }
  /** `ok` is false when the tool refused the call or hit a conflict. */
  | { type: 'tool_result'; ref?: string; ok: boolean }
  /**
   * The turn restarted with another pack's tools. The reply streamed before
   * it is void.
   */
  | { type: 'pack_loaded'; pack: string }
  | { type: 'complete'; result: AssistantTurnResult }
  /** A draft the draftPost sub-flow has already persisted. */
  | { type: 'post_generated'; post: StreamedPost }
  /** The assistant cloned the post into a new, already-persisted one (CON-59). */
  | { type: 'clone_complete'; newPostId: string }
  /** An offer made this turn, once the reply is final. */
  | { type: 'proposal_created'; proposal: AssistantProposal }
  /** An offer answered — by a typed "yes", or from its card. */
  | {
      type: 'proposal_resolved'
      id: string
      status: 'confirmed' | 'dismissed'
      chosen?: string
    }
  /** `status` is the HTTP status the server put on the failure, when it did. */
  | { type: 'error'; message: string; status?: number }
  /** Namespaced sub-flow progress, annotating the running tool step. */
  | { type: 'progress'; step: string }

/** The scope segment the history route takes. */
export function threadScope(subject: ThreadSubject): string {
  switch (subject.kind) {
    case 'workspace':
      return 'workspace'
    case 'campaign':
      return `campaign:${subject.campaignId}`
    case 'post':
      return `post:${subject.postId}`
  }
}

export function listThreadMessages(
  subject: ThreadSubject,
): Promise<AssistantHistoryMessage[]> {
  return apiJson<AssistantHistoryMessage[] | null>(
    `/api/assistant/threads/${encodeURIComponent(threadScope(subject))}/messages`,
    'Unable to load the conversation',
  ).then(orderHistory)
}

/**
 * A turn's user and model rows are persisted together and share a
 * `created_at`, and history can come back with the model row first — which
 * renders the reply above the question it answers. Sort by time, breaking ties
 * in favour of the user's message.
 */
function orderHistory(
  rows: AssistantHistoryMessage[] | null,
): AssistantHistoryMessage[] {
  const list = rows ?? []
  return [...list].sort((a, b) => {
    const ta = Date.parse(a.created_at) || 0
    const tb = Date.parse(b.created_at) || 0
    return ta - tb || (a.role === 'user' ? 0 : 1) - (b.role === 'user' ? 0 : 1)
  })
}

/**
 * Reads a model row back into a result. Two shapes reach here: the universal
 * assistant's `complete` payload, with the packs' results under `results`, and
 * the rows migrated from the per-subject tables, which are a campaign or post
 * result at the top level. Anything unreadable shows as plain prose rather
 * than failing the load.
 */
export function parseHistoryResult(
  content: string,
  kind: ThreadSubject['kind'],
): AssistantTurnResult {
  const parsed = safeParse(content)
  if (typeof parsed.explanation !== 'string') {
    return { ...emptyResult(), explanation: content }
  }
  if (record(parsed.results) || kind === 'workspace') {
    return turnResult(parsed)
  }
  // A migrated row: the subject's own pack result, at the top level.
  return turnResult({
    explanation: parsed.explanation,
    action: kind === 'post' ? undefined : parsed.action,
    results: { [kind]: parsed },
  })
}

function emptyResult(): AssistantTurnResult {
  return {
    explanation: '',
    action: 'answered',
    details: {},
    saveVersion: false,
    touched: [],
    unsaved: false,
    proposals: [],
  }
}

/** Reads a `complete` payload — streamed, or stored in history. */
function turnResult(parsed: Record<string, unknown>): AssistantTurnResult {
  const results = record(parsed.results) ?? {}
  const campaign = record(results.campaign)
  const post = record(results.post)
  const result = emptyResult()

  result.explanation =
    str(parsed.explanation) ||
    str(campaign?.explanation) ||
    str(post?.explanation)

  // The packs' actions say what changed; the orchestrator's says only whether
  // the request was taken. The more specific one labels the turn.
  result.action = parsed.action === 'declined' ? 'declined' : 'answered'
  if (campaign) {
    result.details = resultDetails(campaign)
    const action = campaignAction(campaign.action)
    if (action !== 'answered') result.action = action
  }
  if (post) {
    const action = postAction(post.action)
    if (action) result.action = action
    result.saveVersion = post.saveVersion === true
    result.versionNote = optStr(post.versionNote)
    const clone = record(post.cloneResult)
    result.clonePostId = optStr(clone?.newPostId)
  }

  result.touched = touched(parsed.touched)
  result.unsaved = parsed.unsaved === true
  result.proposals = Array.isArray(parsed.proposals)
    ? parsed.proposals
        .filter(isRecord)
        .map(proposal)
        .filter((p): p is AssistantProposal => p !== null)
    : []
  return result
}

/** Reads a proposal card; null for one without an id or a summary. */
function proposal(card: Record<string, unknown>): AssistantProposal | null {
  const id = str(card.id)
  const summary = str(card.summary)
  if (!id || !summary) return null
  return {
    id,
    tool: str(card.tool),
    summary,
    expiresAt: optStr(card.expiresAt),
    options: Array.isArray(card.options)
      ? card.options
          .filter(isRecord)
          .map((o) => ({
            id: str(o.id),
            title: str(o.title),
            description: optStr(o.description),
          }))
          .filter((o) => o.id && o.title)
      : [],
    // Not sent yet: the option the assistant would pick (API ask). When it
    // arrives, that option gets the one dark button.
    recommended: optStr(card.recommended),
    status: 'pending',
  }
}

/**
 * Runs one turn and dispatches its SSE events.
 *
 * Every write lands server-side as the tools run — the events describe work
 * that has already happened, and aborting does not roll any of it back. Never
 * write a result back; refresh what the turn touched instead.
 */
export function streamAssistantTurn(
  body: { instruction: string; viewContext: ViewContext },
  onEvent: (event: AssistantStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  return streamTurn('/api/assistant', body, onEvent, signal)
}

/**
 * Runs an offer exactly as it was proposed (CON-446) — the same work a typed
 * "yes" does, without a model call — and streams it like a turn: the work's
 * own events, `proposal_resolved`, then `complete`. An offer that is gone,
 * already answered or expired ends in an `error` event with its status.
 */
export function confirmProposal(
  proposalId: string,
  optionId: string | undefined,
  onEvent: (event: AssistantStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  return streamTurn(
    `/api/assistant/proposals/${encodeURIComponent(proposalId)}/confirm`,
    optionId ? { optionId } : {},
    onEvent,
    signal,
  )
}

/** Withdraws an offer. Nothing runs; the answer joins the thread. */
export async function dismissProposal(proposalId: string): Promise<void> {
  await apiJson<unknown>(
    `/api/assistant/proposals/${encodeURIComponent(proposalId)}/dismiss`,
    'Unable to dismiss the offer',
    { method: 'POST' },
  )
}

/**
 * Reverses a change the assistant made (CON-446). 409 when the entity was
 * changed again since — the undo would bury that change — or was already
 * undone; 404 when there is nothing to undo.
 */
export function undoAssistantAction(
  actionId: string,
): Promise<{ undone: boolean; kind: string; entityId: string }> {
  return apiJson(
    `/api/assistant/actions/${encodeURIComponent(actionId)}/undo`,
    'Unable to undo',
    { method: 'POST' },
  )
}

async function streamTurn(
  path: string,
  body: unknown,
  onEvent: (event: AssistantStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await scopedFetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok || !res.body) {
    throw new Error(
      await errorMessage(res, 'The assistant could not be reached'),
    )
  }

  await readSSEStream(res.body, ({ event, data }) => {
    const parsed = safeParse(data)
    switch (event) {
      case 'explanation_delta':
        if (typeof parsed.delta === 'string') {
          onEvent({ type: 'explanation_delta', delta: parsed.delta })
        }
        return
      case 'content_delta':
        if (typeof parsed.delta === 'string') {
          onEvent({ type: 'content_delta', delta: parsed.delta })
        }
        return
      case 'tool_call':
        onEvent({
          type: 'tool_call',
          name: typeof parsed.name === 'string' ? parsed.name : 'tool',
          ref: optStr(parsed.ref),
          input: isRecord(parsed.input) ? parsed.input : undefined,
        })
        return
      case 'tool_result':
        onEvent({
          type: 'tool_result',
          ref: optStr(parsed.ref),
          ok: parsed.ok !== false,
        })
        return
      case 'pack_loaded':
        onEvent({ type: 'pack_loaded', pack: str(parsed.pack) })
        return
      case 'complete':
        onEvent({ type: 'complete', result: turnResult(parsed) })
        return
      case 'proposal_created': {
        const card = proposal(parsed)
        if (card) onEvent({ type: 'proposal_created', proposal: card })
        return
      }
      case 'proposal_resolved':
        if (
          typeof parsed.id === 'string' &&
          (parsed.status === 'confirmed' || parsed.status === 'dismissed')
        ) {
          onEvent({
            type: 'proposal_resolved',
            id: parsed.id,
            status: parsed.status,
            chosen: optStr(parsed.chosen),
          })
        }
        return
      // The draftPost sub-flow forwards each draft it has written.
      case 'draft_post_post': {
        const post = streamedPost(parsed)
        if (post) onEvent({ type: 'post_generated', post })
        return
      }
      // The clone is a new, already-persisted post; the store attaches it to
      // the turn so the reply can offer a jump to it. Emitted before `complete`.
      case 'clone_complete':
        if (typeof parsed.newPostId === 'string' && parsed.newPostId) {
          onEvent({ type: 'clone_complete', newPostId: parsed.newPostId })
        }
        return
      case 'error':
        onEvent({
          type: 'error',
          message:
            typeof parsed.message === 'string'
              ? parsed.message
              : 'The assistant failed',
          status: typeof parsed.code === 'number' ? parsed.code : undefined,
        })
        return
      default:
        // Sub-flow events are namespaced per flow and carry a `step` key.
        if (typeof parsed.step === 'string') {
          onEvent({ type: 'progress', step: parsed.step })
        }
    }
  })
}

/**
 * Coerces a post-pack action. `undefined` for anything else — including the
 * campaign actions a migrated row may carry — so it never relabels a turn.
 */
function postAction(value: unknown): PostAssistantAction | undefined {
  switch (value) {
    case 'edited':
    case 'noted':
    case 'cloned':
    case 'restored':
    case 'scheduled':
    case 'declined':
      return value
    default:
      return undefined
  }
}

const CAMPAIGN_ACTIONS: CampaignAssistantAction[] = [
  'answered',
  'declined',
  'proposed',
  'content_plan_generated',
  'posts_generated',
  'post_drafted',
  'brief_enriched',
  'dates_updated',
  'platforms_updated',
  'posts_redistributed',
  'brief_reviewed',
  'posts_reviewed',
]

function campaignAction(value: unknown): CampaignAssistantAction {
  const found = CAMPAIGN_ACTIONS.find((a) => a === value)
  // An unknown action still shows its prose; only the result card is lost.
  return found ?? 'answered'
}

/**
 * Pulls the structured result out of a campaign-pack result. Every key is
 * optional, and the counts are read under their current and their migrated
 * names, so a reloaded turn from before CON-449 still shows its card.
 */
function resultDetails(
  parsed: Record<string, unknown>,
): AssistantResultDetails {
  const details: AssistantResultDetails = {}

  const contentPlan = record(parsed.contentPlan)
  if (contentPlan) {
    details.contentPlan = {
      ideaCount: num(contentPlan.ideaCount ?? contentPlan.postCount),
      warnings: strings(contentPlan.warnings),
      grounding: grounding(contentPlan.grounding),
    }
  }

  const generated = record(parsed.generatedPosts)
  if (generated) {
    details.generatedPosts = {
      ideaCount: num(generated.ideaCount ?? generated.postCount),
      warnings: strings(generated.warnings),
      grounding: grounding(generated.grounding),
    }
  }

  const drafted = record(parsed.draftedPosts)
  if (drafted) {
    // A draft names the documents it drew on (`usedAssets`) rather than a
    // grounding mode, so a non-empty list reads as grounded and an empty one
    // as nothing said — never as "not grounded".
    const used = Array.isArray(drafted.usedAssets)
      ? drafted.usedAssets
          .filter(isRecord)
          .map((s) => ({ id: str(s.id), title: str(s.title) }))
      : []
    details.draftedPosts = {
      postCount: num(drafted.postCount),
      warnings: strings(drafted.warnings),
      ...(used.length > 0
        ? { grounding: { mode: 'grounded' as const, sources: used } }
        : {}),
    }
  }

  // The stream sends `brief: {applied}`; rows migrated from the campaign
  // table flatten it to `briefApplied`. Read both.
  const brief = record(parsed.brief)
  if (brief) {
    details.brief = {
      applied: brief.applied === true,
      undoId: optStr(brief.undoId),
    }
  } else if (typeof parsed.briefApplied === 'boolean') {
    details.brief = { applied: parsed.briefApplied }
  }

  const dates = record(parsed.dates)
  if (dates) {
    details.dates = {
      startDate: str(dates.startDate),
      endDate: str(dates.endDate),
      postsOutsideRange: num(dates.postsOutsideRange),
      undoId: optStr(dates.undoId),
    }
  }

  const platforms = record(parsed.platforms)
  if (platforms) {
    details.platforms = {
      added: str(platforms.added),
      undoId: optStr(platforms.undoId),
    }
  }

  const redistribute = record(parsed.redistribute)
  if (redistribute) {
    details.redistribute = {
      postsUpdated: num(redistribute.postsUpdated),
      phaseCount: num(redistribute.phaseCount),
    }
  }

  const briefReview = record(parsed.briefReview)
  if (briefReview) {
    details.briefReview = {
      consistent: briefReview.consistent === true,
      findings: findings(briefReview.findings),
    }
  }

  const postsReview = record(parsed.postsReview)
  if (postsReview) {
    details.postsReview = {
      checked: num(postsReview.checked),
      total: num(postsReview.total),
      capped: postsReview.capped === true,
      findings: findings(postsReview.findings),
    }
  }

  return details
}

function grounding(value: unknown): Grounding | undefined {
  const g = record(value)
  if (!g || (g.mode !== 'grounded' && g.mode !== 'exploratory'))
    return undefined
  return {
    mode: g.mode,
    sources: Array.isArray(g.sources)
      ? g.sources
          .filter(isRecord)
          .map((s) => ({ id: str(s.id), title: str(s.title) }))
      : [],
  }
}

function touched(value: unknown): Touched[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isRecord)
    .filter((t) => typeof t.kind === 'string' && t.kind)
    .map((t) => ({ kind: str(t.kind), id: optStr(t.id) }))
}

function findings(value: unknown): ReviewFinding[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((f) => ({
    severity: severity(f.severity),
    // Brief findings name their subject `aspect` — a snake_case key like
    // `goal_alignment` — while post findings carry the post's own title.
    label:
      typeof f.aspect === 'string'
        ? sentenceCase(humanizeStep(f.aspect))
        : typeof f.title === 'string'
          ? f.title
          : undefined,
    issue: str(f.issue),
    suggestion: optStr(f.suggestion),
  }))
}

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function severity(value: unknown): ReviewSeverity | undefined {
  return value === 'high' || value === 'medium' || value === 'low'
    ? value
    : undefined
}

/**
 * Normalises a streamed draft into the shape the campaign's post list uses.
 * The row is already persisted, so it carries the same id the refetch will
 * return. Current drafts name the body `content` and the type `postType`;
 * older flows sent `body` and `contentType`.
 */
function streamedPost(parsed: Record<string, unknown>): StreamedPost | null {
  const post = record(parsed.post)
  if (!post) return null
  const id = str(parsed.id) || str(post.postId)
  if (!id) return null
  const publishDate = str(post.publishDate)
  return {
    id,
    title: str(post.title) || `Post ${num(parsed.index) + 1}`,
    content: str(post.content) || str(post.body),
    platform_id: str(post.platformId),
    platform_post_type: str(post.postType) || str(post.contentType),
    // Never `""`: the server refuses an empty phase id (CON-166).
    campaign_type_phase_id: str(post.phaseId) || null,
    // Local noon keeps the post on its calendar day regardless of timezone.
    scheduled_at: publishDate ? `${publishDate}T12:00:00` : null,
  }
}

function safeParse(data: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(data)
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function optStr(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : []
}
