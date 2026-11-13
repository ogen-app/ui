import { scopedFetch } from './base'
import { apiJson } from './http'
import { errorMessage } from './errors'
import { parseGrounding } from './grounding'
import { isRecord } from './json'
import { parseAssetsState } from './content'
import { analyticsResults } from './assistantAnalytics'
import { workspaceResults } from './assistantWorkspace'
import { draftedPost, ideasResults } from './assistantIdeas'
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
  PostsChanged,
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
  ThreadSubject,
  Touched,
  ProposalDetails,
  StepDetail,
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
  | { type: 'tool_result'; ref?: string; ok: boolean; detail?: StepDetail }
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
          reason: str(n.reason),
        }))
        .filter((n) => n.id || n.title)
    : []
  const out = record(r.result)
  const tagged =
    r.status === 'ok' && typeof out?.tagged === 'number'
      ? { count: out.tagged, undoId: optStr(out.undoId) }
      : undefined
  // replaceWeakestDrafts: what it drafted, and the drafts it deleted.
  const replaced =
    r.status === 'ok' && typeof out?.deleted === 'number' && record(out.drafted)
      ? { deleted: out.deleted, kept: strings(out.kept).length }
      : undefined
  const reoffered = r.status === 'proposed'
  if (!reoffered && notMade.length === 0 && !tagged && !replaced)
    return undefined
  return {
    reoffered,
    notMade,
    retryProposalId: optStr(r.retryProposalId),
    tagged,
    replaced,
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

function rhythm(value: unknown): SeriesRhythm | undefined {
  const r = record(value)
  if (!r || (r.per !== 'week' && r.per !== 'month') || num(r.times) < 1)
    return undefined
  return { times: num(r.times), per: r.per }
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
    fixes: repairFixes(f.fixes, campaignId),
  }))
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
    out.revised = {
      postId: str(revised.postId),
      campaignId: optStr(revised.campaignId),
      title: optStr(revised.title),
      voiceName: optStr(revised.voiceName),
      undoId: optStr(revised.undoId),
      revised: revised.revised === true,
      versioned: revised.versioned === true,
      grounding: parseGrounding(revised.grounding),
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
    window: window
      ? {
          from: optStr(window.from),
          to: optStr(window.to),
          platforms: strings(window.platforms),
          campaignId: optStr(window.campaignId),
        }
      : undefined,
    connect:
      connect && str(connect.platform)
        ? {
            platform: str(connect.platform),
            accountId: optStr(connect.accountId),
            reconnect: connect.reconnect === true,
          }
        : undefined,
  }
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
    // At most one option is marked (CON-467): the card leads with it.
    recommended: Array.isArray(card.options)
      ? optStr(
          card.options.filter(isRecord).find((o) => o.recommended === true)?.id,
        )
      : undefined,
    card: proposalDetails(record(card.card)),
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
          detail: stepDetail(record(parsed.step)),
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
              title: drafted.title,
              content: '',
              platform_id: drafted.platformId,
              platform_post_type: '',
              campaign_type_phase_id: null,
              scheduled_at: null,
            },
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
      removed: optStr(platforms.removed),
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
