import { apiUrl } from './base'
import { apiJson } from './http'
import { errorMessage } from './errors'
import { readSSEStream } from '@/lib/sse'
import type {
  AssistantResultDetails,
  CampaignAssistantAction,
  PostAssistantAction,
  ReviewFinding,
  ReviewSeverity,
  StreamedPost,
} from '@/types/assistant'

/**
 * A persisted conversation row. The assistant's own turns store the flow's
 * structured result as a JSON *string* in `content` — see `parseModelContent`
 * and `parseCampaignModelContent`.
 */
export type AssistantHistoryMessage = {
  id: string
  role: 'user' | 'model'
  content: string
  created_at: string
}

export type PostVersion = {
  id: string
  post_id: string
  version_number: number
  content: string
  note: string
  creator: 'user' | 'assistant'
  created_at: string
}

/** The structured result the post flow returns, at `complete` and in history. */
export type AssistantResult = {
  explanation: string
  updatedContent?: string
  action: PostAssistantAction
  saveVersion: boolean
  versionNote?: string
}

/** The structured result the campaign flow returns (CON-112 §6.3). */
export type CampaignAssistantResult = {
  explanation: string
  action: CampaignAssistantAction
  details: AssistantResultDetails
}

export type AssistantStreamEvent =
  | { type: 'explanation_delta'; delta: string }
  // Each delta is the whole document so far, not a patch — concatenating the
  // deltas reproduces the full updated content (verified against the API).
  | { type: 'content_delta'; delta: string }
  | { type: 'tool_call'; name: string; ref?: string; input?: Record<string, unknown> }
  | { type: 'tool_result'; ref?: string }
  | { type: 'complete'; result: AssistantResult }
  | { type: 'campaign_complete'; result: CampaignAssistantResult }
  /** A post the generation sub-flow has already persisted. */
  | { type: 'post_generated'; post: StreamedPost }
  | { type: 'error'; message: string }
  /** Namespaced sub-flow progress, annotating the running tool step. */
  | { type: 'progress'; step: string }

export function listPostMessages(postId: string): Promise<AssistantHistoryMessage[]> {
  return apiJson<AssistantHistoryMessage[] | null>(
    `/api/posts/${postId}/messages`,
    'Unable to load the conversation',
    // A post with no history answers `null`, not `[]`.
  ).then(orderHistory)
}

export function listCampaignMessages(campaignId: string): Promise<AssistantHistoryMessage[]> {
  return apiJson<AssistantHistoryMessage[] | null>(
    `/api/campaigns/${campaignId}/messages`,
    'Unable to load the conversation',
  ).then(orderHistory)
}

export function listPostVersions(postId: string): Promise<PostVersion[]> {
  return apiJson<PostVersion[] | null>(
    `/api/posts/${postId}/versions`,
    'Unable to load versions',
  ).then((rows) => rows ?? [])
}

export function createPostVersion(postId: string, note: string): Promise<PostVersion> {
  return apiJson<PostVersion>(`/api/posts/${postId}/versions`, 'Unable to save a version', {
    method: 'POST',
    body: { note },
  })
}

/**
 * A turn's user and model rows are persisted together and share a
 * `created_at`, and history can come back with the model row first — which
 * renders the reply above the question it answers. Sort by time, breaking ties
 * in favour of the user's message.
 */
function orderHistory(rows: AssistantHistoryMessage[] | null): AssistantHistoryMessage[] {
  const list = rows ?? []
  return [...list].sort((a, b) => {
    const ta = Date.parse(a.created_at) || 0
    const tb = Date.parse(b.created_at) || 0
    return ta - tb || (a.role === 'user' ? 0 : 1) - (b.role === 'user' ? 0 : 1)
  })
}

/**
 * Parses a post-assistant history row's `content`. Older or malformed rows
 * fall back to being shown as plain explanation text rather than failing the
 * load.
 */
export function parseModelContent(content: string): AssistantResult {
  const parsed = safeParse(content)
  if (typeof parsed.explanation === 'string') {
    return {
      explanation: parsed.explanation,
      action: parsed.action === 'edited' ? 'edited' : 'declined',
      saveVersion: parsed.saveVersion === true,
      versionNote: typeof parsed.versionNote === 'string' ? parsed.versionNote : undefined,
    }
  }
  return { explanation: content, action: 'declined', saveVersion: false }
}

/** The history counterpart for campaign turns (stored as compact JSON). */
export function parseCampaignModelContent(content: string): CampaignAssistantResult {
  const parsed = safeParse(content)
  if (typeof parsed.explanation === 'string') {
    return {
      explanation: parsed.explanation,
      action: campaignAction(parsed.action),
      details: resultDetails(parsed),
    }
  }
  return { explanation: content, action: 'answered', details: {} }
}

/**
 * Runs one post-assistant turn and dispatches its SSE events.
 *
 * The server applies the edit to the post itself — `updatedContent` is what it
 * *saved*, not a patch for the client to persist. Never write it back; refetch
 * the post instead.
 */
export function streamPostAssistant(
  postId: string,
  instruction: string,
  onEvent: (event: AssistantStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  return streamAssistant(`/api/posts/${postId}/assistant`, instruction, signal, (event, parsed) => {
    switch (event) {
      case 'content_delta':
        if (typeof parsed.delta === 'string') {
          onEvent({ type: 'content_delta', delta: parsed.delta })
        }
        return true
      case 'complete':
        onEvent({
          type: 'complete',
          result: {
            explanation: str(parsed.explanation),
            updatedContent:
              typeof parsed.updatedContent === 'string' ? parsed.updatedContent : undefined,
            action: parsed.action === 'edited' ? 'edited' : 'declined',
            saveVersion: parsed.saveVersion === true,
            versionNote: typeof parsed.versionNote === 'string' ? parsed.versionNote : undefined,
          },
        })
        return true
      default:
        return false
    }
  }, onEvent)
}

/**
 * Runs one campaign-assistant turn (CON-112).
 *
 * Every mutating tool writes as it goes — the content-plan flow persists each
 * draft inline — so the events describe work that has *already happened*.
 * Aborting mid-stream does not roll any of it back.
 */
export function streamCampaignAssistant(
  campaignId: string,
  instruction: string,
  onEvent: (event: AssistantStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  return streamAssistant(
    `/api/campaigns/${campaignId}/assistant`,
    instruction,
    signal,
    (event, parsed) => {
      if (event === 'complete') {
        onEvent({
          type: 'campaign_complete',
          result: {
            explanation: str(parsed.explanation),
            action: campaignAction(parsed.action),
            details: resultDetails(parsed),
          },
        })
        return true
      }
      // Both generation flows forward their per-post events under their own
      // namespace; the payload shape is the same.
      if (event === 'content_plan_post' || event === 'generate_posts_post') {
        const post = streamedPost(parsed)
        if (post) onEvent({ type: 'post_generated', post })
        return true
      }
      return false
    },
    onEvent,
  )
}

/**
 * The shared half of both flows: opens the stream and dispatches the events
 * they have in common. `handle` claims the subject-specific ones and returns
 * true when it has; anything left over is treated as sub-flow progress.
 */
async function streamAssistant(
  path: string,
  instruction: string,
  signal: AbortSignal | undefined,
  handle: (event: string, parsed: Record<string, unknown>) => boolean,
  onEvent: (event: AssistantStreamEvent) => void,
): Promise<void> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ instruction }),
    signal,
  })

  if (!res.ok || !res.body) {
    throw new Error(await errorMessage(res, 'The assistant could not be reached'))
  }

  await readSSEStream(res.body, ({ event, data }) => {
    const parsed = safeParse(data)
    if (handle(event, parsed)) return

    switch (event) {
      case 'explanation_delta':
        if (typeof parsed.delta === 'string') {
          onEvent({ type: 'explanation_delta', delta: parsed.delta })
        }
        break
      case 'tool_call':
        onEvent({
          type: 'tool_call',
          name: typeof parsed.name === 'string' ? parsed.name : 'tool',
          ref: typeof parsed.ref === 'string' ? parsed.ref : undefined,
          input: isRecord(parsed.input) ? parsed.input : undefined,
        })
        break
      case 'tool_result':
        onEvent({
          type: 'tool_result',
          ref: typeof parsed.ref === 'string' ? parsed.ref : undefined,
        })
        break
      case 'error':
        onEvent({
          type: 'error',
          message: typeof parsed.message === 'string' ? parsed.message : 'The assistant failed',
        })
        break
      default:
        // Sub-flow events are namespaced per flow and carry a `step` key.
        if (typeof parsed.step === 'string') {
          onEvent({ type: 'progress', step: parsed.step })
        }
        break
    }
  })
}

const CAMPAIGN_ACTIONS: CampaignAssistantAction[] = [
  'answered',
  'declined',
  'content_plan_generated',
  'posts_generated',
  'brief_enriched',
  'dates_updated',
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
 * Pulls the structured result out of a campaign `complete` payload. Every key
 * is optional and only one is ever populated, so each is read defensively.
 */
function resultDetails(parsed: Record<string, unknown>): AssistantResultDetails {
  const details: AssistantResultDetails = {}

  const contentPlan = record(parsed.contentPlan)
  if (contentPlan) {
    details.contentPlan = { postCount: num(contentPlan.postCount), warnings: strings(contentPlan.warnings) }
  }

  const generated = record(parsed.generatedPosts)
  if (generated) {
    details.generatedPosts = { postCount: num(generated.postCount), warnings: strings(generated.warnings) }
  }

  const brief = record(parsed.brief)
  if (brief) details.brief = { applied: brief.applied === true }

  const dates = record(parsed.dates)
  if (dates) {
    details.dates = {
      startDate: str(dates.startDate),
      endDate: str(dates.endDate),
      postsOutsideRange: num(dates.postsOutsideRange),
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

function findings(value: unknown): ReviewFinding[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((f) => ({
    severity: severity(f.severity),
    // Brief findings name their subject `aspect`, post findings `title`.
    label: typeof f.aspect === 'string' ? f.aspect : typeof f.title === 'string' ? f.title : undefined,
    issue: str(f.issue),
    suggestion: typeof f.suggestion === 'string' ? f.suggestion : undefined,
  }))
}

function severity(value: unknown): ReviewSeverity | undefined {
  return value === 'high' || value === 'medium' || value === 'low' ? value : undefined
}

/**
 * Normalises a streamed `DraftPost` (camelCase, `publishDate`) into the shape
 * the campaign's post list uses. The row is already persisted, so it carries
 * the same id the refetch will return.
 */
function streamedPost(parsed: Record<string, unknown>): StreamedPost | null {
  const post = record(parsed.post)
  if (!post) return null
  const id = typeof parsed.id === 'string' && parsed.id ? parsed.id : null
  if (!id) return null
  const publishDate = typeof post.publishDate === 'string' ? post.publishDate : ''
  return {
    id,
    title: str(post.title) || `Post ${num(parsed.index) + 1}`,
    content: str(post.body),
    platform_id: str(post.platformId),
    platform_post_type: str(post.contentType),
    campaign_type_phase_id: typeof post.phaseId === 'string' ? post.phaseId : null,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function record(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}
