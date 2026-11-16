import { scopedFetch } from './base'
import { apiJson } from './http'
import { errorMessage } from './errors'
import { parseGrounding } from './grounding'
import { isRecord } from './json'
import { parseAssetsState } from './content'
import { analyticsResults, trailSteps } from './assistantAnalytics'
import { workspaceResults } from './assistantWorkspace'
import { draftedPost, ideaDraftStarted, ideasResults } from './assistantIdeas'
import { seriesRhythm } from './series'
import { readSSEStream } from '@/lib/sse'
import { humanizeStep } from '@/lib/assistantTools'
import type { ViewContext, ViewEntityKind, ViewScreen } from '@/lib/viewContext'
import type { UIAction } from '@/lib/assistantUiActions'
import type {
  AnalysisLens,
  AnalysisRead,
  BrandChangeKind,
  BrandRead,
  EditCounts,
  FieldChange,
  SeriesRunChange,
  BrandCheck,
  FoundationResults,
  SeriesBrief,
  SeriesRhythm,
  AssetComparedRef,
  AssetComparison,
  AssetsAsk,
  AssetsBankState,
  AssetsResults,
  AnalyticsResults,
  WorkspaceResults,
  IdeasResults,
  OfferOutcome,
  AssistantAction,
  AssistantProposal,
  CalendarFindings,
  CalendarFinding,
  CalendarMove,
  CampaignReview,
  ChangedPost,
  LineRun,
  PostsChanged,
  ProposalOutcome,
  RepairFix,
  RepairResults,
  CampaignFromAssets,
  ComparedClaim,
  SavedViewList,
  AssistantResultDetails,
  CampaignAssistantAction,
  PostAssistantAction,
  ReviewSeverity,
  StreamedPost,
  DraftedIdeaPost,
  IdeaDraftStarted,
  ThreadSubject,
  Touched,
  ProposalDetails,
  StepDetail,
  CampaignCite,
  CampaignState,
  CampaignStateRead,
  GoalPeriod,
  PostRef,
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
  /**
   * A model turn's offers as they stand now (CON-482): what a reload settles
   * its cards from, instead of pairing them with answers by summary.
   */
  offers?: OfferState[]
}

/** An offer as the server holds it now, in a thread's history. */
export type OfferState = {
  id: string
  status: 'pending' | 'confirmed' | 'dismissed' | 'expired' | string
  chosen?: string
  expires_at?: string
  resolved_at?: string
  replaces?: string
  retry_of?: string
  replaced_by?: string
  /**
   * A confirmed offer's answer (CON-495): the server's sentence, how much it
   * made, and what the work returned — the moves, for a move.
   */
  outcome?: { text?: string; made?: number; total?: number; result?: unknown }
}

/**
 * An offer as a conflict names it (CON-495): a 409 on an answered or lapsed
 * offer carries it, shaped like a thread message's offers. Null when the body
 * has none this build can read.
 */
export function offerState(raw: unknown): OfferState | undefined {
  const o = record(raw)
  if (!o || !str(o.id) || !str(o.status)) return undefined
  return {
    id: str(o.id),
    status: str(o.status),
    chosen: optStr(o.chosen),
    expires_at: optStr(o.expires_at),
    resolved_at: optStr(o.resolved_at),
    replaces: optStr(o.replaces),
    retry_of: optStr(o.retry_of),
    replaced_by: optStr(o.replaced_by),
    outcome: record(o.outcome) ?? undefined,
  }
}

/**
 * What a confirmed offer did (CON-495), read off its stored outcome. The work's
 * own result is read for the one thing a fixed finding names: the day a single
 * move landed on — `applyCalendarMoves`' moves, or a move's own `to`.
 */
export function proposalOutcome(
  raw: OfferState['outcome'],
): ProposalOutcome | undefined {
  const o = record(raw)
  if (!o) return undefined
  const result = record(o.result)
  const moves = Array.isArray(result?.moves)
    ? result.moves.filter(isRecord)
    : result && str(result.to)
      ? [result]
      : []
  const [move] = moves
  return {
    text: str(o.text),
    made: typeof o.made === 'number' ? o.made : undefined,
    total: typeof o.total === 'number' ? o.total : undefined,
    movedTo:
      moves.length === 1 && move && str(move.to)
        ? { day: str(move.to), at: optStr(move.toAt) }
        : undefined,
  }
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
  /** The lines a post edit rewrote (CON-495). */
  postLines?: LineRun[]
  versionNote?: string
  /** A clone the post pack created (CON-59). */
  clonePostId?: string
  /** What the turn changed, for the client to refresh. */
  touched: Touched[]
  /** The turn ran but could not be stored, so it won't survive a reload. */
  unsaved: boolean
  /** Offers the turn made, waiting for the user's yes (CON-446). */
  proposals: AssistantProposal[]
  /** Changes to the screen, in order (CON-450, D5). */
  uiActions: UIAction[]
  /** The assets pack's typed results (CON-460); absent when it ran none. */
  assets?: AssetsResults
  /** The brand tools' typed results (CON-461); absent when none ran. */
  foundation?: FoundationResults
  /** The calendar check, as recorded (CON-462); the stream sends it too. */
  findings?: CalendarFindings
  /** The repair pack's other typed results (CON-462). */
  repair?: RepairResults
  /** The analytics pack's typed results (CON-463). */
  analytics?: AnalyticsResults
  /** The workspace pack's typed results (CON-464). */
  workspace?: WorkspaceResults
  /** The ideas pack's typed results (CON-465). */
  ideas?: IdeasResults
  /** How an offer answered from its card went (CON-467). */
  answered?: OfferOutcome
  /** The offers this turn answered, or found changed or expired (CON-482). */
  resolved?: { id: string; status: string }[]
  /** What a campaign turn read, and its starters (CON-483). */
  campaignState?: CampaignStateRead
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
  | {
      type: 'tool_result'
      ref?: string
      ok: boolean
      detail?: StepDetail
      /** A refusal the reply draws a card for (CON-481): `idea_read_only`. */
      code?: string
    }
  /**
   * The turn restarted with another pack's tools. The reply streamed before
   * it is void.
   */
  | { type: 'pack_loaded'; pack: string }
  | { type: 'complete'; result: AssistantTurnResult }
  /** A draft the draftPost sub-flow has already persisted. */
  | { type: 'post_generated'; post: StreamedPost }
  /** A draft written from ideas (CON-481), with how many of the planned. */
  | { type: 'idea_draft'; draft: DraftedIdeaPost; done: number; total: number }
  /** The post `draftIdeas` is about to write (CON-500/510). */
  | { type: 'idea_draft_started'; next: IdeaDraftStarted }
  /** The assistant cloned the post into a new, already-persisted one (CON-59). */
  | { type: 'clone_complete'; newPostId: string }
  /** A calendar check's findings, each with its fixes (CON-454). */
  | { type: 'calendar_findings'; findings: CalendarFindings }
  /** A change to the user's screen, applied when the turn completes. */
  | { type: 'ui_action'; action: UIAction }
  /** An offer made this turn, once the reply is final. */
  | { type: 'proposal_created'; proposal: AssistantProposal }
  /** An offer answered — by a typed "yes", or from its card. */
  | {
      type: 'proposal_resolved'
      id: string
      /**
       * `stale`: a yes ran nothing because what it was made on changed, the
       * offer staying open; `expired`: the yes came after its expiry
       * (CON-482).
       */
      status: 'confirmed' | 'dismissed' | 'stale' | 'expired'
      chosen?: string
      reasons?: string[]
      replacedBy?: string
    }
  /**
   * `status` is the HTTP status the server put on the failure, when it did;
   * `reason` names a conflict drawn its own way (CON-482): `offer_expired`,
   * `offer_answered`, `offer_replaced`.
   */
  | {
      type: 'error'
      message: string
      status?: number
      reason?: string
      /** The offer as it stands, on an answered or lapsed one (CON-495). */
      offer?: OfferState
    }
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
 * A thread the workspace has talked in, as the list shows it before it is
 * opened (CON-459). Threads are the workspace's, not one member's, so this is
 * everyone's.
 */
export type ThreadSummary = {
  subject: ThreadSubject
  /** The post's title for a post thread, else the campaign's name. */
  title: string
  /** The campaign's name, for a campaign or a post thread. */
  campaignTitle: string
  /** The thread's campaign is archived: listed, but no longer active work. */
  archived: boolean
  /** RFC 3339 time of the newest message. */
  lastMessageAt: string
  /** The newest message as one line of plain text, cut short by the server. */
  preview: string
}

export type ThreadSummaryPage = {
  threads: ThreadSummary[]
  /** `before` for the next page, or null when this one wasn't full. */
  next: string | null
}

export const THREAD_PAGE_SIZE = 50

/**
 * The workspace's threads, newest message first, a page at a time: the next
 * page is the threads whose newest message is earlier than this page's last
 * (`before`). The server leaves out a thread whose campaign or post is gone.
 */
export async function listThreads(
  before?: string | null,
): Promise<ThreadSummaryPage> {
  const params = new URLSearchParams({ limit: String(THREAD_PAGE_SIZE) })
  if (before) params.set('before', before)
  const body = await apiJson<unknown>(
    `/api/assistant/threads?${params}`,
    'Unable to load the conversations',
  )
  const rows = Array.isArray(body) ? body.filter(isRecord) : []
  const threads = rows.flatMap((row) => {
    const summary = threadSummary(row)
    return summary ? [summary] : []
  })
  // Paged on the raw rows: one this build skips still counts towards a full
  // page, and still marks where the next one starts.
  const last = rows[rows.length - 1]
  return {
    threads,
    next:
      rows.length >= THREAD_PAGE_SIZE && last
        ? str(last.last_message_at) || null
        : null,
  }
}

/** One list row, or null for a scope this build can't route to. */
function threadSummary(row: Record<string, unknown>): ThreadSummary | null {
  const subject = summarySubject(row)
  if (!subject) return null
  const title = str(row.title)
  return {
    subject,
    title,
    campaignTitle:
      str(row.campaign_title) || (subject.kind === 'campaign' ? title : ''),
    archived: row.archived === true,
    lastMessageAt: str(row.last_message_at),
    preview: str(row.preview).trim(),
  }
}

function summarySubject(row: Record<string, unknown>): ThreadSubject | null {
  const [kindFromScope, idFromScope = ''] = str(row.scope).split(':')
  const kind = str(row.scope_kind) || kindFromScope
  const id = str(row.scope_id) || idFromScope
  switch (kind) {
    case 'workspace':
      return { kind: 'workspace' }
    case 'campaign':
      return id ? { kind: 'campaign', campaignId: id } : null
    case 'post': {
      // A post's thread routes through its campaign.
      const campaignId = str(row.campaign_id)
      return id && campaignId ? { kind: 'post', postId: id, campaignId } : null
    }
    default:
      return null
  }
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
  if (record(parsed.results) || record(parsed.result) || kind === 'workspace') {
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
    uiActions: [],
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
    result.campaignState = campaignStateRead(campaign)
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
    result.postLines = lineRuns(post.lines)
  }

  result.touched = touched(parsed.touched)
  result.unsaved = parsed.unsaved === true
  result.proposals = Array.isArray(parsed.proposals)
    ? parsed.proposals
        .filter(isRecord)
        .map(proposal)
        .filter((p): p is AssistantProposal => p !== null)
    : []
  result.uiActions = Array.isArray(parsed.uiActions)
    ? parsed.uiActions
        .filter(isRecord)
        .map(uiAction)
        .filter((a): a is UIAction => a !== null)
    : []
  result.assets = assetsResults(results)
  result.foundation = foundationResults(results)
  const repair = repairResults(results)
  result.findings = repair.findings
  result.repair = repair.repair
  result.analytics = analyticsResults(results)
  result.workspace = workspaceResults(results)
  result.ideas = ideasResults(results)
  result.answered = offerOutcome(parsed.result)
  result.resolved = (Array.isArray(parsed.resolved) ? parsed.resolved : [])
    .filter(isRecord)
    .map((r) => ({ id: str(r.id), status: str(r.status) }))
    .filter((r) => r.id)
  return result
}

/**
 * Reads a confirm's `result` — the confirmed tool's outcome (CON-467). Absent
 * when it says nothing beyond the packs' results: no re-offer, nothing left
 * undone, no tagging.
 */
export function offerOutcome(raw: unknown): OfferOutcome | undefined {
  const r = record(raw)
  if (!r) return undefined
  const notMade = Array.isArray(r.notMade)
    ? r.notMade
        .filter(isRecord)
        .map((n) => ({
          id: str(n.id),
          title: optStr(n.title),
          platform: optStr(n.platform),
          reason: str(n.reason),
        }))
        .filter((n) => n.id || n.title)
    : []
  const out = record(r.result)
  const tagged =
    r.status === 'ok' && typeof out?.tagged === 'number'
      ? {
          count: out.tagged,
          undoId: optStr(out.undoId),
          changed: typeof out.changed === 'number' ? out.changed : undefined,
          add: strings(out.add),
          remove: strings(out.remove),
          assets: (Array.isArray(out.assets) ? out.assets : [])
            .filter(isRecord)
            .map((a) => ({
              id: str(a.id),
              title: str(a.title),
              added: strings(a.added),
              removed: strings(a.removed),
            }))
            .filter((a) => a.id),
          more: typeof out.more === 'number' ? out.more : 0,
        }
      : undefined
  // How much of the job a run did (CON-482), beside `notMade` — or inside
  // the result, where a pack's result embeds it.
  const count = (key: 'made' | 'total') =>
    typeof r[key] === 'number'
      ? (r[key] as number)
      : typeof out?.[key] === 'number'
        ? (out[key] as number)
        : 0
  const made = count('made') || undefined
  const total = count('total') || undefined
  // replaceWeakestDrafts: what it drafted, and the drafts it deleted.
  // `drafted` is always an object on a replace, but a goal raise that drafted
  // nothing leaves it out: the deletion is what makes it a replace.
  const drafted = record(out?.drafted)
  const replaced =
    r.status === 'ok' && typeof out?.deleted === 'number'
      ? {
          deleted: out.deleted,
          kept: strings(out.kept).length,
          draftedCount: num(drafted?.postCount),
          drafted: postRefs(drafted?.posts),
          draftedGrounding: parseGrounding(drafted?.grounding),
          removed: postRefs(out.removed),
          period: goalPeriod(out.period),
        }
      : undefined
  // A platform removal put off until its scheduled posts are out.
  const laterOut = record(out?.later)
  const later =
    r.status === 'ok' && laterOut && str(laterOut.removed)
      ? { removed: str(laterOut.removed), until: optStr(laterOut.until) }
      : undefined
  const reoffered = r.status === 'proposed'
  // A run that made everything still carries its counts, which a retry's
  // DONE adds up (CON-482).
  if (
    !reoffered &&
    notMade.length === 0 &&
    !tagged &&
    !replaced &&
    !later &&
    made === undefined &&
    total === undefined
  )
    return undefined
  return {
    reoffered,
    made,
    total,
    notMade,
    retryProposalId: optStr(r.retryProposalId),
    tagged,
    replaced,
    later,
  }
}

/**
 * The brand tools' results (CON-461): `results.foundation` holds each tool's
 * last output keyed by tool name, and the repair pack's brand check sits at
 * `results.repair.checkBrand`. A family of tools (add, update, remove) fills
 * one card, and which of them ran is the change it reports.
 */
function foundationResults(
  results: Record<string, unknown>,
): FoundationResults | undefined {
  const f = record(results.foundation) ?? {}
  const out: FoundationResults = {}
  const pick = (
    names: [string, BrandChangeKind][],
  ): [Record<string, unknown>, BrandChangeKind] | null => {
    for (const [name, change] of names) {
      const raw = record(f[name])
      if (raw) return [raw, change]
    }
    return null
  }

  const voice = pick([
    ['removeVoice', 'removed'],
    ['updateVoice', 'updated'],
    ['addVoice', 'added'],
  ])
  const v = voice && record(voice[0].voice)
  if (voice && v && str(v.id)) {
    const rules = record(v.rules)
    out.voice = {
      change: voice[1],
      id: str(v.id),
      name: str(v.name),
      whenToUse: str(v.whenToUse),
      isDefault: v.isDefault === true,
      rules: rules
        ? {
            emoji: str(rules.emoji),
            formality: str(rules.formality),
            person: str(rules.person),
            length: str(rules.length),
          }
        : undefined,
      unbound: num(voice[0].unbound),
      changes: fieldChanges(voice[0].changes),
      undoId: optStr(voice[0].undoId),
    }
  }

  const audience = pick([
    ['removeAudience', 'removed'],
    ['updateAudience', 'updated'],
    ['addAudience', 'added'],
  ])
  const a = audience && record(audience[0].audience)
  if (audience && a && str(a.id)) {
    out.audience = {
      change: audience[1],
      id: str(a.id),
      name: str(a.name),
      who: str(a.who),
      readsOn: str(a.readsOn),
      unbound: num(audience[0].unbound),
      changes: fieldChanges(audience[0].changes),
      undoId: optStr(audience[0].undoId),
    }
  }

  const guard = record(f.updateGuardrails)
  if (guard) {
    out.guardrails = {
      changes: fieldChanges(guard.changes),
      undoId: optStr(guard.undoId),
    }
  }

  // Each fact tool is recorded under its own name (CON-477): a turn keeps the
  // last of them, and the card says which it was.
  const factTool = pick([
    ['removeFact', 'removed'],
    ['renewFact', 'updated'],
    ['updateFact', 'updated'],
    ['addFact', 'added'],
  ])
  const factOut = factTool?.[0]
  const fact = factOut && (record(factOut.fact) ?? factOut)
  if (factTool && factOut && fact && str(fact.id) && str(fact.statement)) {
    out.fact = {
      change: f.renewFact === factOut ? 'renewed' : factTool[1],
      id: str(fact.id),
      statement: str(fact.statement),
      source: str(fact.source),
      expiresAt: str(fact.expiresAt),
      undoId: optStr(factOut.undoId),
    }
  }

  const bulk = record(f.editBrand)
  if (bulk) {
    const made = record(bulk.made) ?? {}
    out.bulk = {
      done: num(bulk.done),
      made: {
        facts: editCounts(made.facts),
        voices: editCounts(made.voices),
        audiences: editCounts(made.audiences),
      },
      undoIds: strings(bulk.undoIds),
      kept: (Array.isArray(bulk.kept) ? bulk.kept : [])
        .filter(isRecord)
        .map((k) => ({
          factId: str(k.factId),
          statement: str(k.statement),
          reason: str(k.reason),
        }))
        .filter((k) => k.factId),
      failed: (Array.isArray(bulk.failed) ? bulk.failed : [])
        .filter(isRecord)
        .map((x) => ({ what: str(x.what), reason: str(x.reason) })),
      stopped: optStr(bulk.stopped),
    }
  }

  const distill =
    record(f.answerDistillQuestions) ??
    record(f.startBrandDistill) ??
    record(f.getBrandDistill)
  if (distill && str(distill.runId)) {
    const counts = record(distill.counts) ?? {}
    const failure = record(distill.failure)
    out.distill = {
      runId: str(distill.runId),
      status: str(distill.status),
      failure: failure
        ? str(failure.message) || str(failure.reason) || undefined
        : undefined,
      failureCode: failure ? optStr(failure.code) : undefined,
      counts: {
        voices: num(counts.voices),
        audiences: num(counts.audiences),
        guardrails: num(counts.guardrails),
        facts: num(counts.facts),
        questions: num(counts.questions),
      },
      questions: (Array.isArray(distill.questions) ? distill.questions : [])
        .filter(isRecord)
        .map((q) => ({ id: str(q.id), text: str(q.text) }))
        .filter((q) => q.id && q.text),
      sources: distillSources(record(distill.sources)),
      answered: (Array.isArray(distill.answered) ? distill.answered : [])
        .filter(isRecord)
        .map((a) => ({
          questionId: str(a.questionId),
          question: str(a.question),
          answer: str(a.answer),
          from: optStr(a.from),
        }))
        .filter((a) => a.question && a.answer),
      grounding: parseGrounding(distill.grounding),
    }
  }

  const saved = record(f.commitBrandDistill)
  if (saved && str(saved.runId)) {
    out.distillSaved = {
      runId: str(saved.runId),
      voices: num(saved.voices),
      audiences: num(saved.audiences),
      guardrails: num(saved.guardrails),
      facts: num(saved.facts),
      skipped: strings(saved.skipped),
    }
  }

  const list = record(f.listSeries)
  if (list) {
    out.seriesList = {
      campaignId: optStr(list.campaignId),
      series: (Array.isArray(list.series) ? list.series : [])
        .filter(isRecord)
        .map(seriesBrief)
        .filter((s): s is SeriesBrief => s !== null),
    }
  }

  const series = pick([
    ['removeSeries', 'removed'],
    ['updateSeries', 'updated'],
    ['createSeries', 'added'],
  ])
  const brief = series && seriesBrief(record(series[0].series) ?? {})
  if (series && brief) {
    out.series = {
      ...brief,
      change: series[1],
      undoId: optStr(series[0].undoId),
      run: seriesRun(record(series[0].run)),
      notRun: optStr(series[0].notRun),
    }
  }

  const run = seriesRun(record(f.stopSeries) ?? record(f.runSeries))
  if (run) out.run = run

  const brand = record(f.getBrand)
  if (brand) out.brand = brandRead(brand)
  if (brand && Array.isArray(brand.expiredFacts)) {
    out.expiredFacts = brand.expiredFacts
      .filter(isRecord)
      .map((x) => ({
        id: str(x.id),
        statement: str(x.statement),
        source: str(x.source),
        expiresAt: str(x.expiresAt),
      }))
      .filter((x) => x.id && x.statement)
  }

  const check = brandCheck(record(record(results.repair)?.checkBrand))
  if (check) out.brandCheck = check

  return Object.keys(out).length > 0 ? out : undefined
}

function fieldChanges(value: unknown): FieldChange[] {
  return (Array.isArray(value) ? value : [])
    .filter(isRecord)
    .map((c) => ({
      field: str(c.field),
      before: optStr(c.before),
      after: optStr(c.after),
      added: strings(c.added),
      removed: strings(c.removed),
    }))
    .filter((c) => c.field)
}

function editCounts(value: unknown): EditCounts {
  const c = record(value) ?? {}
  return {
    added: num(c.added),
    updated: num(c.updated),
    removed: num(c.removed),
  }
}

function distillSources(raw: Record<string, unknown> | null) {
  if (!raw) return undefined
  return {
    website: optStr(raw.website),
    pages: num(raw.pages),
    assets: num(raw.assets),
  }
}

function seriesRun(
  raw: Record<string, unknown> | null,
): SeriesRunChange | undefined {
  if (!raw || !str(raw.seriesId)) return undefined
  return {
    campaignId: str(raw.campaignId),
    campaignName: str(raw.campaignName),
    seriesId: str(raw.seriesId),
    seriesName: str(raw.seriesName),
    running: raw.running === true,
    rhythm: rhythm(raw.rhythm),
    undoId: optStr(raw.undoId),
  }
}

function brandRead(raw: Record<string, unknown>): BrandRead {
  const look = record(raw.look)
  return {
    voices: (Array.isArray(raw.voices) ? raw.voices : [])
      .filter(isRecord)
      .map((v) => ({
        id: str(v.id),
        name: str(v.name),
        isDefault: v.isDefault === true,
        rules: num(v.rules),
        samples: num(v.samples),
        channelNotes: num(v.channelNotes),
      }))
      .filter((v) => v.id && v.name),
    factsTotal: num(raw.factsTotal),
    look: look
      ? {
          palette: (Array.isArray(look.palette) ? look.palette : [])
            .filter(isRecord)
            .map((c) => ({ hex: str(c.hex), role: str(c.role) }))
            .filter((c) => /^#[0-9a-f]{3,8}$/i.test(c.hex)),
          typefaces: strings(look.typefaces),
          logos: strings(look.logos).length,
        }
      : undefined,
    templates: (Array.isArray(raw.templates) ? raw.templates : [])
      .filter(isRecord)
      .map((x) => ({
        id: str(x.id),
        name: str(x.name),
        role: str(x.role),
        ratios: strings(x.ratios),
        platforms: strings(x.platforms),
        isDefault: x.isDefault === true,
      }))
      .filter((x) => x.id && x.name),
  }
}

/** The series' own parser (CON-496), with `every` and `weekday`. */
function rhythm(value: unknown): SeriesRhythm | undefined {
  return seriesRhythm(value) ?? undefined
}

function seriesBrief(raw: Record<string, unknown>): SeriesBrief | null {
  if (!str(raw.id) || !str(raw.name)) return null
  return {
    id: str(raw.id),
    name: str(raw.name),
    recipe: str(raw.recipe),
    runs: raw.runs === true,
    rhythm: rhythm(raw.rhythm),
    defaultRhythm: rhythm(raw.defaultRhythm),
    runsIn: (Array.isArray(raw.runsIn) ? raw.runsIn : [])
      .filter(isRecord)
      .map((r) => ({
        campaignId: str(r.campaignId),
        campaignName: str(r.campaignName),
        rhythm: rhythm(r.rhythm),
      }))
      .filter((r) => r.campaignId),
  }
}

function brandCheck(
  raw: Record<string, unknown> | null,
): BrandCheck | undefined {
  if (!raw) return undefined
  const against = record(raw.checkedAgainst) ?? {}
  return {
    checked: num(raw.checked),
    clean: num(raw.clean),
    left: num(raw.left),
    dismissed: num(raw.dismissed),
    checkedAgainst: {
      voices: (Array.isArray(against.voices) ? against.voices : [])
        .filter(isRecord)
        .map((v) => ({ id: str(v.id), name: str(v.name) }))
        .filter((v) => v.name),
      guardrails: against.guardrails === true,
    },
    findings: (Array.isArray(raw.findings) ? raw.findings : [])
      .filter(isRecord)
      .map((x) => ({
        key: str(x.key),
        postId: str(x.postId),
        title: str(x.title),
        rule: str(x.rule),
        severity: str(x.severity),
        issue: str(x.issue),
        campaignId: str(x.campaignId),
        fixes: repairFixes(x.fixes, str(x.campaignId)),
      }))
      .filter((x) => x.postId && x.issue),
  }
}

/**
 * The assets pack's typed results (CON-460): each tool's last output under
 * `results.assets`, and the core `listSavedViews` under `results.savedViews`.
 * On a campaign's asset page the campaign pack answers the question instead,
 * and reports its search in the same shape at `results.campaign.ask`. A part
 * this build can't read is left out rather than drawn half-empty.
 */
function assetsResults(
  results: Record<string, unknown>,
): AssetsResults | undefined {
  const pack = record(results.assets) ?? {}
  const out: AssetsResults = {}
  const state = bankState(record(pack.state))
  if (state) out.state = state
  const ask =
    assetsAsk(record(pack.ask)) ??
    assetsAsk(record(record(results.campaign)?.ask))
  if (ask) out.ask = ask
  const analysis = analysisRead(record(pack.analysis))
  if (analysis) out.analysis = analysis
  const compare = assetComparison(record(pack.compare))
  if (compare) out.compare = compare
  const views = savedViewList(record(results.savedViews))
  if (views) out.savedViews = views
  const campaign = campaignFromAssets(record(pack.campaign))
  if (campaign) out.campaign = campaign
  const distill = record(pack.distill)
  if (distill)
    out.distill = {
      queued: distill.queued === true,
      grounding: parseGrounding(distill.grounding),
    }
  const page = record(pack.import)
  if (page && str(page.assetId))
    out.import = {
      assetId: str(page.assetId),
      title: str(page.title),
      url: str(page.url),
      status: str(page.status),
      attached: page.attached === true,
      attachError: optStr(page.attachError),
    }
  return Object.keys(out).length > 0 ? out : undefined
}

const ASK_SCOPES: AssetsAsk['scope'][] = [
  'asked',
  'open_asset',
  'campaign',
  'workspace',
]

function assetsAsk(raw: Record<string, unknown> | null): AssetsAsk | undefined {
  if (!raw) return undefined
  const scope = ASK_SCOPES.find((s) => s === raw.scope)
  if (!scope) return undefined
  const excerpts = Array.isArray(raw.excerpts) ? raw.excerpts : []
  return {
    scope,
    excerpts: excerpts
      .filter(isRecord)
      .map((x) => ({
        assetId: str(x.assetId),
        title: str(x.title),
        type: optStr(x.type),
        pages: str(x.pages),
      }))
      .filter((x) => x.assetId),
  }
}

function lens(raw: unknown): AnalysisLens | undefined {
  const l = record(raw)
  if (!l || !str(l.status)) return undefined
  return {
    campaignId: optStr(l.campaignId),
    campaignName: optStr(l.campaignName),
    status: str(l.status),
    readAt: optStr(l.readAt),
    ideaCount: typeof l.ideaCount === 'number' ? l.ideaCount : undefined,
  }
}

function analysisRead(
  raw: Record<string, unknown> | null,
): AnalysisRead | undefined {
  const own = raw ? lens(raw.lens) : undefined
  if (!raw || !own || !str(raw.assetId)) return undefined
  const ideas = record(raw.ideas) ?? {}
  return {
    assetId: str(raw.assetId),
    title: str(raw.title),
    type: optStr(raw.type),
    pageCount: typeof raw.pageCount === 'number' ? raw.pageCount : undefined,
    durationMs:
      typeof raw.durationMs === 'number' && raw.durationMs > 0
        ? raw.durationMs
        : undefined,
    lens: own,
    gist: str(raw.gist),
    summary: str(raw.summary),
    keyPoints: strings(raw.keyPoints),
    ideas: {
      undecided: num(ideas.undecided),
      yes: num(ideas.yes),
      later: num(ideas.later),
      no: num(ideas.no),
    },
    topIdeas: (Array.isArray(raw.topIdeas) ? raw.topIdeas : [])
      .filter(isRecord)
      .map((i) => ({
        id: str(i.id),
        title: str(i.title),
        verdict: optStr(i.verdict),
      }))
      .filter((i) => i.id && i.title),
    failureReason: optStr(raw.failureReason),
    otherLenses: (Array.isArray(raw.otherLenses) ? raw.otherLenses : [])
      .map(lens)
      .filter((l): l is AnalysisLens => l !== undefined),
  }
}

function comparedRefs(value: unknown): AssetComparedRef[] {
  return (Array.isArray(value) ? value : [])
    .filter(isRecord)
    .map((a) => ({
      id: str(a.id),
      title: str(a.title),
      letter: str(a.letter),
      from: (a.from === 'passages' ? 'passages' : 'analysis') as
        'analysis' | 'passages',
    }))
    .filter((a) => a.id)
}

function claims(value: unknown): ComparedClaim[] {
  return (Array.isArray(value) ? value : [])
    .filter(isRecord)
    .map((c) => ({ text: str(c.text), letters: strings(c.letters) }))
    .filter((c) => c.text)
}

function assetComparison(
  raw: Record<string, unknown> | null,
): AssetComparison | undefined {
  if (!raw) return undefined
  const assets = comparedRefs(raw.assets)
  if (assets.length === 0) return undefined
  return {
    mode: raw.mode === 'summarise' ? 'summarise' : 'compare',
    assets,
    summary: str(raw.summary),
    shared: claims(raw.shared),
    partial: claims(raw.partial),
    conflicts: claims(raw.conflicts),
    skipped: comparedRefs(raw.skipped),
    missing: strings(raw.missing).length,
    grounding: parseGrounding(raw.grounding),
  }
}

function savedViewList(
  raw: Record<string, unknown> | null,
): SavedViewList | undefined {
  if (!raw || (raw.list !== 'ideas' && raw.list !== 'assets')) return undefined
  return {
    list: raw.list,
    views: (Array.isArray(raw.views) ? raw.views : [])
      .filter(isRecord)
      .map((v) => ({
        id: str(v.id),
        name: str(v.name),
        shared: v.shared === true,
        count: typeof v.count === 'number' ? v.count : undefined,
        filter: str(v.filter),
      }))
      .filter((v) => v.id && v.name),
  }
}

function campaignFromAssets(
  raw: Record<string, unknown> | null,
): CampaignFromAssets | undefined {
  if (!raw || !str(raw.campaignId)) return undefined
  return {
    campaignId: str(raw.campaignId),
    name: str(raw.name),
    type: str(raw.type),
    startDate: optStr(raw.startDate),
    endDate: optStr(raw.endDate),
    assetIds: strings(raw.assetIds),
    undoId: optStr(raw.undoId),
    createdAt: optStr(raw.createdAt),
  }
}

/**
 * The bank's state a turn read (`readAssetsState`), in the REST endpoint's
 * own snake_case, so one reading of the counts serves both.
 */
function bankState(
  raw: Record<string, unknown> | null,
): AssetsBankState | undefined {
  if (!raw) return undefined
  const names = (value: unknown) =>
    (Array.isArray(value) ? value : [])
      .filter(isRecord)
      .map((a) => ({ id: str(a.id), title: str(a.title) }))
      .filter((a) => a.id)
  return {
    ...parseAssetsState(raw),
    waitingAssets: names(raw.waiting_assets),
    failedAssets: names(raw.failed_assets),
  }
}

/** What a step read or made (`tool_result.step`); undefined when nothing. */
function stepDetail(
  raw: Record<string, unknown> | null,
): StepDetail | undefined {
  if (!raw) return undefined
  const count = (v: unknown) => (typeof v === 'number' && v > 0 ? v : undefined)
  const detail: StepDetail = {
    subject: optStr(raw.subject),
    workspace: raw.workspace === true || undefined,
    passages: count(raw.passages),
    analyses: count(raw.analyses),
    sources: count(raw.sources),
  }
  return Object.values(detail).some((v) => v !== undefined) ? detail : undefined
}

/** An offer's details (`card`), or undefined when it has none. */
function proposalDetails(raw: Record<string, unknown> | null) {
  if (!raw) return undefined
  const widen = record(raw.widen)
  const details: ProposalDetails = {
    verb: optStr(raw.verb),
    meta: optStr(raw.meta),
    rows: (Array.isArray(raw.rows) ? raw.rows : [])
      .filter(isRecord)
      .map((r) => ({
        kind: str(r.kind),
        value: str(r.value),
        note: optStr(r.note),
        start: optStr(r.start),
        end: optStr(r.end),
      }))
      .filter((r) => r.kind && (r.value || r.start || r.end)),
    sources: (Array.isArray(raw.sources) ? raw.sources : [])
      .filter(isRecord)
      .map((s) => ({
        id: str(s.id),
        title: str(s.title),
        type: optStr(s.type),
      }))
      .filter((s) => s.id && s.title),
    footnote: optStr(raw.footnote),
    trail: Array.isArray(raw.trail) ? trailSteps(raw.trail) : undefined,
    widen:
      widen && str(widen.label) && str(widen.instruction)
        ? {
            note: str(widen.note),
            label: str(widen.label),
            instruction: str(widen.instruction),
          }
        : undefined,
  }
  return details
}

function calendarFindings(raw: Record<string, unknown>): CalendarFindings {
  const campaignId = str(raw.campaignId)
  return {
    campaignId,
    dismissed: num(raw.dismissed),
    findings: calendarFindingList(raw.findings, campaignId),
    dismissedFindings: calendarFindingList(raw.dismissedFindings, campaignId),
    checkedAt: optStr(raw.checkedAt),
  }
}

/**
 * A calendar's findings, as the check and the Overview both send them. The
 * fixes are kept as `repairFixes` keeps them: an offer, or a post to open.
 */
export function calendarFindingList(
  value: unknown,
  campaignId: string,
): CalendarFinding[] {
  return (Array.isArray(value) ? value : []).filter(isRecord).map((f) => ({
    key: str(f.key),
    code: str(f.code),
    severity: f.severity === 'warning' ? 'warning' : 'info',
    message: str(f.message),
    detail: optStr(f.detail),
    blocksPublishing: f.blocksPublishing === true,
    postIds: strings(f.postIds),
    posts: (Array.isArray(f.posts) ? f.posts : [])
      .filter(isRecord)
      .map((p) => ({
        id: str(p.id),
        title: str(p.title),
        date: optStr(p.date),
      }))
      .filter((p) => p.id),
    ideas: findingIdeas(f.ideas),
    fixes: repairFixes(f.fixes, campaignId),
  }))
}

/** The ideas a same-idea finding's posts share (CON-495); absent for none. */
export function findingIdeas(value: unknown): CalendarFinding['ideas'] {
  const ideas = (Array.isArray(value) ? value : [])
    .filter(isRecord)
    .map((i) => ({ id: str(i.id), title: str(i.title) }))
    .filter((i) => i.id)
  return ideas.length > 0 ? ideas : undefined
}

/**
 * The runs of lines an edit rewrote (CON-495), as `results.post` and
 * `revisePost` send them. A run with nothing on either side is dropped.
 */
export function lineRuns(value: unknown): LineRun[] | undefined {
  const runs = (Array.isArray(value) ? value : [])
    .filter(isRecord)
    .map((r) => ({ before: lineList(r.before), after: lineList(r.after) }))
    .filter((r) => r.before.length > 0 || r.after.length > 0)
  return runs.length > 0 ? runs : undefined
}

// Blank lines are `""` and count, so not `strings`, which keeps them too but
// says nothing about why.
function lineList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((l): l is string => typeof l === 'string')
    : []
}

/**
 * Whether a converted post passes its new type's rules (CON-495). Absent —
 * the media couldn't be read — stays absent, never a pass.
 */
function typeRules(value: unknown): ChangedPost['rules'] {
  const r = record(value)
  if (!r || typeof r.passes !== 'boolean') return undefined
  if (r.passes) return { passes: true }
  return {
    passes: false,
    broken: (Array.isArray(r.broken) ? r.broken : [])
      .filter(isRecord)
      .map((b) => ({ rule: str(b.rule), message: str(b.message) }))
      .filter((b) => b.message || b.rule),
  }
}

/**
 * A finding's fixes, keeping only those the row can act on: an offer to
 * confirm, or a post to open — which needs the campaign too. One with
 * neither would take the primary slot and leave the row without an action.
 */
function repairFixes(value: unknown, campaignId: string): RepairFix[] {
  return (Array.isArray(value) ? value : [])
    .filter(isRecord)
    .map((x) => ({
      kind: str(x.kind),
      title: str(x.title),
      postId: optStr(x.postId),
      postIds: strings(x.postIds),
      proposalId: optStr(x.proposalId),
      card: proposalDetails(record(x.card)),
      options: fixOptions(x.options),
    }))
    .filter((x) => x.title && (x.proposalId || (x.postId && campaignId)))
}

/** A fix offer's choices — a move's free slots — or none. */
function fixOptions(value: unknown): RepairFix['options'] {
  const options = (Array.isArray(value) ? value : [])
    .filter(isRecord)
    .map((o) => ({
      id: str(o.id),
      title: str(o.title),
      description: optStr(o.description),
      recommended: o.recommended === true || undefined,
    }))
    .filter((o) => o.id && o.title)
  return options.length > 0 ? options : undefined
}

/**
 * A review's findings — `reviewCampaign`'s, and since CON-478 `checkBrief`'s
 * and `checkPostsConsistency`'s, which answer in the same shape.
 */
function campaignReview(
  review: Record<string, unknown> | null,
): CampaignReview | undefined {
  if (!review) return undefined
  const campaignId = str(review.campaignId)
  const list = (value: unknown) =>
    (Array.isArray(value) ? value : [])
      .filter(isRecord)
      .map((f) => ({
        kind: f.kind === 'brief' ? ('brief' as const) : ('post' as const),
        key: str(f.key),
        severity: severity(f.severity),
        label:
          typeof f.aspect === 'string' && f.aspect
            ? sentenceCase(humanizeStep(f.aspect))
            : optStr(f.title),
        postId: optStr(f.postId),
        issue: str(f.issue),
        quote: optStr(f.quote),
        suggestion: optStr(f.suggestion),
        fixes: repairFixes(f.fixes, campaignId),
      }))
      .filter((f) => f.issue)
  return {
    campaignId,
    postsChecked: num(review.postsChecked),
    dismissed: num(review.dismissed),
    findings: list(review.findings),
    dismissedFindings: list(review.dismissedFindings),
    readFrom: strings(review.readFrom),
    checkedAt: optStr(review.checkedAt),
  }
}

function calendarMove(m: Record<string, unknown>): CalendarMove {
  return {
    postId: str(m.postId),
    title: str(m.title),
    from: str(m.from),
    to: str(m.to),
    fromAt: optStr(m.fromAt),
    toAt: optStr(m.toAt),
    status: optStr(m.status),
  }
}

/**
 * The repair pack's typed results (CON-462): `results.repair` holds each
 * tool's last output in the turn. The calendar check is returned apart, as
 * the turn's findings, because the stream delivers it there too.
 */
function repairResults(results: Record<string, unknown>): {
  findings?: CalendarFindings
  repair?: RepairResults
} {
  const r = record(results.repair) ?? {}
  const campaign = record(results.campaign)
  const out: RepairResults = {}
  // The campaign pack's two checks answer in the review's shape (CON-478),
  // so they are drawn as reviews too.
  out.briefReview = campaignReview(record(campaign?.briefReview))
  out.postsReview = campaignReview(record(campaign?.postsReview))

  out.review = campaignReview(record(r.reviewCampaign))

  const plan = record(r.optimiseCalendar)
  if (plan) {
    const window = record(plan.window)
    out.plan = {
      campaignId: str(plan.campaignId),
      proposalId: optStr(plan.proposalId),
      window:
        window && str(window.from) && str(window.to)
          ? { from: str(window.from), to: str(window.to) }
          : undefined,
      moves: (Array.isArray(plan.moves) ? plan.moves : [])
        .filter(isRecord)
        .map(calendarMove),
      locked: (Array.isArray(plan.locked) ? plan.locked : [])
        .filter(isRecord)
        .map((l) => ({
          postId: str(l.postId),
          title: str(l.title),
          date: str(l.date),
          at: optStr(l.at),
        })),
      checkedAt: optStr(plan.checkedAt),
    }
  }

  const moved = record(r.applyCalendarMoves)
  if (moved) {
    const byStatus = record(moved.byStatus) ?? {}
    out.moved = {
      moved: num(moved.moved),
      moves: (Array.isArray(moved.moves) ? moved.moves : [])
        .filter(isRecord)
        .map(calendarMove),
      byStatus: Object.fromEntries(
        Object.entries(byStatus).filter(
          (e): e is [string, number] => typeof e[1] === 'number' && e[1] > 0,
        ),
      ),
      locked: num(moved.locked),
      skipped: strings(moved.skipped),
      undoId: optStr(moved.undoId),
    }
  }

  const changed = (raw: unknown): PostsChanged | undefined => {
    const c = record(raw)
    if (!c) return undefined
    return {
      changed: num(c.changed),
      withdrawing: num(c.withdrawing),
      skipped: (Array.isArray(c.skipped) ? c.skipped : [])
        .filter(isRecord)
        .map((x) => ({ postId: str(x.postId), reason: str(x.reason) })),
      posts: (Array.isArray(c.posts) ? c.posts : [])
        .filter(isRecord)
        .map((p) => ({
          postId: str(p.postId),
          title: str(p.title),
          platformId: optStr(p.platformId),
          platform: optStr(p.platform),
          fromStatus: str(p.fromStatus),
          toStatus: optStr(p.toStatus),
          wasAt: optStr(p.wasAt),
          scheduledAt: optStr(p.scheduledAt),
          fromType: optStr(p.fromType),
          toType: optStr(p.toType),
          kept: strings(p.kept),
          rules: typeRules(p.rules),
        }))
        .filter((p) => p.postId),
      undoId: optStr(c.undoId),
    }
  }
  out.converted = changed(r.changePostType)
  out.unscheduled = changed(r.unschedulePosts)
  out.deleted = changed(r.deletePosts)
  const revised = record(r.revisePost)
  if (revised && str(revised.postId)) {
    const length = record(revised.length)
    out.revised = {
      postId: str(revised.postId),
      length: length
        ? { before: num(length.before), after: num(length.after) }
        : undefined,
      campaignId: optStr(revised.campaignId),
      title: optStr(revised.title),
      voiceName: optStr(revised.voiceName),
      undoId: optStr(revised.undoId),
      revised: revised.revised === true,
      versioned: revised.versioned === true,
      grounding: parseGrounding(revised.grounding),
      lines: lineRuns(revised.lines),
    }
  }

  const check = record(r.checkCalendar)
  const any = Object.values(out).some((v) => v !== undefined)
  return {
    findings: check ? calendarFindings(check) : undefined,
    repair: any ? out : undefined,
  }
}

const UI_ACTION_TYPES: UIAction['type'][] = [
  'navigate',
  'set_filter',
  'select',
  'open_saved_view',
  'set_window',
  'open_connect',
  'open_add_source',
]

function analyticsWindow(
  window: Record<string, unknown> | null,
): UIAction['window'] {
  return window
    ? {
        from: optStr(window.from),
        to: optStr(window.to),
        preset: optStr(window.preset),
        platforms: strings(window.platforms),
        campaignId: optStr(window.campaignId),
      }
    : undefined
}

/** Reads a `ui_action`; null for a type or screen this build can't apply. */
function uiAction(raw: Record<string, unknown>): UIAction | null {
  const type = UI_ACTION_TYPES.find((t) => t === raw.type)
  const screen = str(raw.screen)
  if (!type || !screen) return null
  const focus = record(raw.focus)
  const selection = record(raw.selection)
  const window = record(raw.window)
  const connect = record(raw.connect)
  return {
    type,
    screen: screen as ViewScreen,
    campaignId: optStr(raw.campaignId),
    focus:
      focus && typeof focus.id === 'string'
        ? { kind: str(focus.kind) as ViewEntityKind, id: focus.id }
        : undefined,
    filter: typeof raw.filter === 'string' ? raw.filter : undefined,
    selection: selection
      ? {
          kind: str(selection.kind) as ViewEntityKind,
          ids: strings(selection.ids),
        }
      : undefined,
    savedViewId: optStr(raw.savedViewId),
    savedViewName: optStr(raw.savedViewName),
    window: analyticsWindow(window),
    before: analyticsWindow(record(raw.before)),
    changed: Array.isArray(raw.changed) ? strings(raw.changed) : undefined,
    connect:
      connect && str(connect.platform)
        ? {
            platform: str(connect.platform),
            accountId: optStr(connect.accountId),
            reconnect: connect.reconnect === true,
          }
        : undefined,
    via: raw.via === 'upload' || raw.via === 'page' ? raw.via : undefined,
  }
}

/** What an option asks for before it runs (CON-484), when it asks. */
function optionInput(
  input: Record<string, unknown> | null,
): { kind: string; label: string } | undefined {
  return input && str(input.kind)
    ? { kind: str(input.kind), label: str(input.label) }
    : undefined
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
            why: optStr(o.why),
            input: optionInput(record(o.input)),
          }))
          .filter((o) => o.id && o.title)
      : [],
    // At most one option is marked (CON-467): the card leads with it.
    recommended: Array.isArray(card.options)
      ? optStr(
          card.options.filter(isRecord).find((o) => o.recommended === true)?.id,
        )
      : undefined,
    card: proposalDetails(record(card.card)),
    replaces: optStr(card.replaces),
    retryOf: optStr(card.retryOf),
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
  /** The value an option asked for (CON-484): a page's link. */
  input?: string,
): Promise<void> {
  return streamTurn(
    `/api/assistant/proposals/${encodeURIComponent(proposalId)}/confirm`,
    { ...(optionId ? { optionId } : {}), ...(input ? { input } : {}) },
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
          detail: stepDetail(record(parsed.step)),
          code: optStr(parsed.code),
        })
        return
      case 'pack_loaded':
        onEvent({ type: 'pack_loaded', pack: str(parsed.pack) })
        return
      case 'complete':
        onEvent({ type: 'complete', result: turnResult(parsed) })
        return
      case 'calendar_findings':
        onEvent({
          type: 'calendar_findings',
          findings: calendarFindings(parsed),
        })
        return
      case 'ui_action': {
        const action = uiAction(parsed)
        if (action) onEvent({ type: 'ui_action', action })
        return
      }
      case 'proposal_created': {
        const card = proposal(parsed)
        if (card) onEvent({ type: 'proposal_created', proposal: card })
        return
      }
      case 'proposal_resolved':
        if (
          typeof parsed.id === 'string' &&
          (parsed.status === 'confirmed' ||
            parsed.status === 'dismissed' ||
            parsed.status === 'stale' ||
            parsed.status === 'expired')
        ) {
          onEvent({
            type: 'proposal_resolved',
            id: parsed.id,
            status: parsed.status,
            chosen: optStr(parsed.chosen),
            reasons: Array.isArray(parsed.reasons)
              ? strings(parsed.reasons)
              : undefined,
            replacedBy: optStr(parsed.replacedBy),
          })
        }
        return
      // The draftPost sub-flow forwards each draft it has written.
      case 'draft_post_post': {
        const post = streamedPost(parsed)
        if (post) onEvent({ type: 'post_generated', post })
        return
      }
      // Before each post draftIdeas writes, what it is about to write
      // (CON-500): the rail's placeholder names it.
      case 'idea_draft_started': {
        const next = ideaDraftStarted(parsed)
        if (next) onEvent({ type: 'idea_draft_started', next })
        return
      }
      // The ideas pack's draftIdeas sends each draft as it is saved
      // (CON-466): the same post_generated the draftPost sub-flow gives, so
      // drafts land on the campaign's lists as they are written.
      case 'idea_draft_post': {
        const drafted = draftedPost(parsed)
        if (drafted) {
          onEvent({
            type: 'post_generated',
            post: {
              id: drafted.postId,
              // Its own campaign, so a draft from any thread reaches that
              // campaign's lists; its day, so a dated one waits on the grid
              // rather than in Not scheduled (bugs 2–3).
              campaign_id: drafted.campaignId,
              title: drafted.title,
              content: drafted.excerpt ?? '',
              platform_id: drafted.platformId,
              platform_post_type: '',
              campaign_type_phase_id: null,
              // Midday local: the event names a day, not a time, and midday
              // keeps it on that day in any zone until the refetch has the
              // real one.
              scheduled_at: drafted.publishDate
                ? new Date(`${drafted.publishDate}T12:00:00`).toISOString()
                : null,
            },
          })
          onEvent({
            type: 'idea_draft',
            draft: drafted,
            done: typeof parsed.done === 'number' ? parsed.done : 0,
            total: typeof parsed.total === 'number' ? parsed.total : 0,
          })
        }
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
          reason: optStr(parsed.reason),
          offer: offerState(parsed.offer),
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
  'goal_updated',
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
      grounding: parseGrounding(contentPlan.grounding),
    }
  }

  const generated = record(parsed.generatedPosts)
  if (generated) {
    details.generatedPosts = {
      ideaCount: num(generated.ideaCount ?? generated.postCount),
      warnings: strings(generated.warnings),
      grounding: parseGrounding(generated.grounding),
      windowStart: optStr(generated.windowStart),
      windowEnd: optStr(generated.windowEnd),
      undoId: optStr(generated.undoId),
    }
  }

  const drafted = record(parsed.draftedPosts)
  if (drafted) {
    // Absent when the research's sources aren't known (pasted material):
    // then nothing is said, never "not grounded".
    details.draftedPosts = {
      postCount: num(drafted.postCount),
      warnings: strings(drafted.warnings),
      grounding: parseGrounding(drafted.grounding),
      posts: (Array.isArray(drafted.posts) ? drafted.posts : [])
        .filter(isRecord)
        .map((p) => ({
          id: str(p.id),
          title: str(p.title),
          platformId: str(p.platformId),
          platform: str(p.platform),
          postType: str(p.postType),
          date: optStr(p.date),
        }))
        .filter((p) => p.id),
    }
  }

  // The stream sends `brief: {applied}`; rows migrated from the campaign
  // table flatten it to `briefApplied`. Read both.
  const brief = record(parsed.brief)
  if (brief) {
    details.brief = {
      applied: brief.applied === true,
      undoId: optStr(brief.undoId),
      grounding: parseGrounding(brief.grounding),
      fields: (Array.isArray(brief.fields) ? brief.fields : [])
        .filter(isRecord)
        .map((f) => ({ field: str(f.field), value: str(f.value) }))
        .filter((f) => f.field),
    }
  } else if (typeof parsed.briefApplied === 'boolean') {
    details.brief = { applied: parsed.briefApplied, fields: [] }
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
    const left = record(platforms.postsLeft)
    details.platforms = {
      added: optStr(platforms.added),
      removed: optStr(platforms.removed),
      postsLeft: left
        ? { posts: num(left.posts), scheduled: num(left.scheduled) }
        : undefined,
      kept: (Array.isArray(platforms.kept) ? platforms.kept : [])
        .filter(isRecord)
        .map((k) => ({
          id: str(k.id),
          title: str(k.title),
          platform: str(k.platform),
          postType: optStr(k.postType),
          status: str(k.status),
        }))
        .filter((k) => k.id),
      unscheduled: num(platforms.unscheduled),
      undoId: optStr(platforms.undoId),
    }
  }

  const goal = record(parsed.goal)
  if (goal && num(goal.perPeriod) > 0) {
    details.goal = {
      perPeriod: num(goal.perPeriod),
      cadence: goal.cadence === 'week' ? 'week' : 'month',
      target: num(goal.target),
      undoId: optStr(goal.undoId),
    }
  }

  const redistribute = record(parsed.redistribute)
  if (redistribute) {
    details.redistribute = {
      postsUpdated: num(redistribute.postsUpdated),
      phaseCount: num(redistribute.phaseCount),
    }
  }

  return details
}

/**
 * The campaign as the assistant would read it now, with its starters
 * (CON-483) — the same as a campaign turn's `state`, before the first one
 * and with no model call.
 */
export async function getCampaignAssistantState(
  campaignId: string,
): Promise<CampaignStateRead | null> {
  const body = await apiJson<unknown>(
    `/api/campaigns/${encodeURIComponent(campaignId)}/assistant-state`,
    'Unable to read the campaign for the assistant',
  )
  const parsed = record(body)
  return (parsed && campaignStateRead(parsed)) ?? null
}

/** Posts named on a result card: title, platform name, score. */
function postRefs(value: unknown): PostRef[] {
  return (Array.isArray(value) ? value : [])
    .filter(isRecord)
    .map((p) => ({
      id: str(p.id),
      title: str(p.title),
      platform: str(p.platform),
      fitPct: typeof p.fitPct === 'number' ? p.fitPct : undefined,
    }))
    .filter((p) => p.id)
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * A goal period (CON-503): its cadence, place and days as data, which is what
 * the rail words it from; the English `label` for a server before that.
 */
function goalPeriod(value: unknown): GoalPeriod | undefined {
  const p = record(value)
  if (!p) return undefined
  const cadence =
    p.cadence === 'week' || p.cadence === 'month' ? p.cadence : undefined
  const start = DAY.test(str(p.start)) ? str(p.start) : undefined
  const end = DAY.test(str(p.end)) ? str(p.end) : undefined
  if (!str(p.label) && !(cadence && start && end)) return undefined
  return {
    label: str(p.label),
    ...(cadence && start && end
      ? {
          cadence,
          start,
          end,
          ...(typeof p.index === 'number' ? { index: p.index } : {}),
        }
      : {}),
    target: num(p.target),
    planned: num(p.planned),
    left: num(p.left),
  }
}

const CITES = [
  'goal',
  'period',
  'posts',
  'platforms',
  'sources',
  'calendar',
] as const

const SOURCE_STATUSES = ['ready', 'analysing', 'unreadable'] as const
const STARTER_KINDS = ['fill', 'draft', 'calendar', 'sources'] as const

/**
 * What a campaign turn read (CON-483) — `state` and `starters` on its
 * result, and the same from `GET /api/campaigns/:id/assistant-state`.
 * Undefined when the result carries no state (a server before it).
 */
export function campaignStateRead(
  parsed: Record<string, unknown>,
): CampaignStateRead | undefined {
  const raw = record(parsed.state)
  if (!raw) return undefined
  const state: CampaignState = {}
  const goal = record(raw.goal)
  if (goal) {
    state.goal = {
      cadence: str(goal.cadence),
      perPeriod: num(goal.perPeriod),
      target: num(goal.target),
      planned: num(goal.planned),
      room: num(goal.room),
      unknown: goal.unknown === true,
      period: goalPeriod(goal.period),
    }
  }
  const calendar = record(raw.calendar)
  if (calendar) state.calendar = { total: num(calendar.total) }
  if (typeof raw.posts === 'number' && raw.postsUnknown !== true)
    state.posts = raw.posts
  if (Array.isArray(raw.platforms))
    state.platforms = raw.platforms
      .filter(isRecord)
      .map((p) => ({ id: str(p.id), name: str(p.name) }))
      .filter((p) => p.id && p.name)
  const sources = record(raw.sources)
  if (sources) {
    state.sources = {
      wholeBank: sources.wholeBank === true,
      attached: num(sources.attached),
      notReady: num(sources.notReady),
      items: (Array.isArray(sources.items) ? sources.items : [])
        .filter(isRecord)
        .map((i) => ({
          id: str(i.id),
          title: str(i.title),
          kind: optStr(i.kind),
          status: SOURCE_STATUSES.find((x) => x === i.status) ?? 'analysing',
        }))
        .filter((i) => i.id),
    }
  }
  const starters = (Array.isArray(parsed.starters) ? parsed.starters : [])
    .filter(isRecord)
    .flatMap((x) => {
      const kind = STARTER_KINDS.find((k) => k === x.kind)
      if (!kind) return []
      const period = goalPeriod(x.period)
      return [
        {
          kind,
          instruction: str(x.instruction),
          ...(typeof x.count === 'number' ? { count: x.count } : {}),
          ...(period ? { period } : {}),
        },
      ]
    })
  // What the reply relied on (CON-503): known parts, once each, in order.
  const cites = Array.isArray(parsed.cites)
    ? [
        ...new Set(
          parsed.cites.filter((c): c is CampaignCite =>
            CITES.includes(c as CampaignCite),
          ),
        ),
      ]
    : undefined
  return { state, starters, ...(cites ? { cites } : {}) }
}

function touched(value: unknown): Touched[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isRecord)
    .filter((t) => typeof t.kind === 'string' && t.kind)
    .map((t) => ({ kind: str(t.kind), id: optStr(t.id) }))
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
