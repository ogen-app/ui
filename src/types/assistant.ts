import type { ViewContext } from '@/lib/viewContext'
import type { AppliedUIAction } from '@/lib/assistantUiActions'

/**
 * What an assistant thread is attached to — its scope (CON-450). One thread
 * per subject: the workspace, a campaign, or a post. The screen a turn was sent
 * from is recorded per turn, not per thread, so moving from Ideas to Assets
 * inside a campaign carries on the same conversation.
 */
export type ThreadSubject =
  | { kind: 'post'; postId: string; campaignId: string }
  | { kind: 'campaign'; campaignId: string }
  | { kind: 'workspace' }

/** The campaign a subject sits in, if any. */
export function subjectCampaignId(subject: ThreadSubject): string | undefined {
  return subject.kind === 'workspace' ? undefined : subject.campaignId
}

/**
 * What the post assistant did with the instruction (CON-42).
 *
 * `noted` means the turn wrote one or more notes and left the body alone
 * (CON-188). A turn that did both reports `edited` and carries the notes
 * alongside — so this value is "notes *only*", not "notes happened".
 */
export type PostAssistantAction =
  'edited' | 'declined' | 'noted' | 'cloned' | 'restored' | 'scheduled'

/**
 * What the campaign assistant did (CON-112 and its sub-issues). Every action
 * except `answered`/`declined` corresponds to a tool that already wrote to the
 * campaign — the payload describes what landed, it is never a proposal.
 */
export type CampaignAssistantAction =
  | 'answered'
  | 'declined'
  | 'proposed'
  | 'content_plan_generated'
  | 'posts_generated'
  | 'post_drafted'
  | 'brief_enriched'
  | 'dates_updated'
  | 'platforms_updated'
  | 'posts_redistributed'
  | 'brief_reviewed'
  | 'posts_reviewed'

export type AssistantAction = PostAssistantAction | CampaignAssistantAction

export type ReviewSeverity = 'high' | 'medium' | 'low'

/**
 * Whether generated output came from the workspace's own material (CON-448).
 * Exploratory output is labelled by the client from this, never from the
 * model's wording.
 */
export type Grounding = {
  mode: 'grounded' | 'exploratory'
  sources: { id: string; title: string }[]
}

/** An entity kind a turn changed, for the client to refresh. */
export type TouchedKind =
  'idea' | 'post' | 'asset' | 'campaign' | 'fact' | 'note'

/** What a turn changed. No `id` means every entity of that kind. */
export type Touched = { kind: string; id?: string }

/**
 * One item from a consistency review (CON-116). The backend names the subject
 * `aspect` for brief findings and `title` for post findings; both land here.
 */
export type ReviewFinding = {
  severity?: ReviewSeverity
  label?: string
  issue: string
  suggestion?: string
}

/**
 * The structured half of a campaign turn's `complete` payload. Exactly one key
 * is populated, matching the action — the findings and counts exist nowhere
 * else, so the reply has to render them.
 */
export type AssistantResultDetails = {
  /** Planning writes ideas, not posts (CON-449). */
  contentPlan?: { ideaCount: number; warnings: string[]; grounding?: Grounding }
  generatedPosts?: {
    ideaCount: number
    warnings: string[]
    grounding?: Grounding
  }
  /** Content-first drafts the draftPost tool wrote. */
  draftedPosts?: {
    postCount: number
    warnings: string[]
    grounding?: Grounding
  }
  brief?: { applied: boolean; undoId?: string }
  dates?: {
    startDate: string
    endDate: string
    postsOutsideRange: number
    undoId?: string
  }
  platforms?: { added: string; undoId?: string }
  redistribute?: { postsUpdated: number; phaseCount: number }
  briefReview?: { consistent: boolean; findings: ReviewFinding[] }
  postsReview?: {
    checked: number
    total: number
    capped: boolean
    findings: ReviewFinding[]
  }
}

/**
 * A draft the content-plan / targeted-generation flows have *already
 * persisted*, seen mid-stream before the authoritative refetch. Shaped to
 * merge into the campaign's post list by id.
 */
export type StreamedPost = {
  id: string
  title: string
  content: string
  platform_id: string
  platform_post_type: string
  campaign_type_phase_id: string | null
  scheduled_at: string | null
}

/**
 * An offer the assistant made and is holding for the user's yes (CON-446):
 * bulk work, generating more than a few items, the calendar, anything external
 * or destructive. Confirming runs exactly what was proposed — from the card,
 * or by replying "yes" — with no model re-planning.
 */
export type AssistantProposal = {
  id: string
  tool: string
  /** What it would do, in the server's words. */
  summary: string
  expiresAt?: string
  /** A choice of ways forward (a budget conflict); empty for a plain offer. */
  options: { id: string; title: string; description?: string }[]
  /** The option the assistant would pick, when it says. */
  recommended?: string
  status: ProposalStatus
  /** The option it was answered with. */
  chosen?: string
  /** Why it could not be answered — gone, expired, refused. */
  error?: string
}

/**
 * `pending` waits on the user; `superseded` is an offer a later turn moved
 * past without answering — it may still be live server-side, but the card no
 * longer stands in the thread as the thing to answer.
 */
export type ProposalStatus =
  | 'pending'
  | 'confirming'
  | 'confirmed'
  | 'dismissed'
  | 'expired'
  | 'closed'
  | 'superseded'

/**
 * What the assets pack's tools found this turn (CON-460), as the server puts
 * them under `results.assets` — the last call of each tool — with the core
 * `listSavedViews` beside them. The rail draws a card from each; a turn
 * without them is prose.
 */
export type AssetsResults = {
  ask?: AssetsAsk
  analysis?: AnalysisRead
  compare?: AssetComparison
  savedViews?: SavedViewList
  campaign?: CampaignFromAssets
}

/** What a question about the assets searched, and where it found it. */
export type AssetsAsk = {
  scope: 'asked' | 'open_asset' | 'campaign' | 'workspace'
  excerpts: { assetId: string; title: string; pages: string }[]
}

/** A lens: a campaign's, or the workspace's when `campaignId` is absent. */
export type AnalysisLens = {
  campaignId?: string
  campaignName?: string
  /** ready | pending | running | failed | skipped | not_read */
  status: string
  readAt?: string
}

/** What one lens's analysis found in an asset (`readAnalysis`). */
export type AnalysisRead = {
  assetId: string
  title: string
  lens: AnalysisLens
  gist: string
  summary: string
  keyPoints: string[]
  ideas: { undecided: number; yes: number; later: number; no: number }
  topIdeas: { id: string; title: string; verdict?: string }[]
  failureReason?: string
  /** The asset's other lenses: offered, never mixed in. */
  otherLenses: AnalysisLens[]
}

/** A claim and the lettered assets behind it. */
export type ComparedClaim = { text: string; letters: string[] }

/** A summary or comparison of assets (`compareAssets`). */
export type AssetComparison = {
  mode: 'summarise' | 'compare'
  assets: AssetComparedRef[]
  summary: string
  shared: ComparedClaim[]
  partial: ComparedClaim[]
  conflicts: ComparedClaim[]
  /** Assets with nothing to read, named rather than sent to the model. */
  skipped: AssetComparedRef[]
  /** How many of the ids asked for named no asset, and were left out. */
  missing: number
  grounding?: Grounding
}

export type AssetComparedRef = {
  id: string
  title: string
  letter: string
  /** Read from its analysis for the lens, or from its passages. */
  from: 'analysis' | 'passages'
}

/** A list's smart groups (`listSavedViews`). */
export type SavedViewList = {
  list: 'ideas' | 'assets'
  views: { id: string; name: string; shared: boolean; count?: number }[]
}

/** A campaign set up from assets (`createCampaignFromAssets`). */
export type CampaignFromAssets = {
  campaignId: string
  name: string
  type: string
  startDate?: string
  endDate?: string
  assetIds: string[]
  undoId?: string
}

/**
 * What the foundation and repair packs' brand tools did this turn (CON-461),
 * read from `results.foundation` (each tool's last output, keyed by tool) and
 * `results.repair.checkBrand`. A turn without them is prose.
 */
export type FoundationResults = {
  voice?: VoiceChange
  audience?: AudienceChange
  guardrails?: GuardrailsChange
  fact?: FactChange
  bulk?: BulkBrandEdit
  distill?: DistillState
  distillSaved?: DistillSaved
  seriesList?: SeriesList
  series?: SeriesChange
  run?: SeriesRunChange
  expiredFacts?: ExpiredFact[]
  brandCheck?: BrandCheck
}

/** Which of a tool family ran: its add, its update or its remove. */
export type BrandChangeKind = 'added' | 'updated' | 'removed'

export type VoiceChange = {
  change: BrandChangeKind
  id: string
  name: string
  whenToUse: string
  isDefault: boolean
  rules?: {
    emoji: string
    formality: string
    person: string
    length: string
  }
  /** Campaigns and posts a removed voice was taken off. */
  unbound: number
  undoId?: string
}

export type AudienceChange = {
  change: BrandChangeKind
  id: string
  name: string
  who: string
  readsOn: string
  unbound: number
  undoId?: string
}

export type GuardrailsChange = {
  mayClaim: number
  neverClaim: number
  bannedWords: string[]
  disclaimer: string
  undoId?: string
}

/** A fact changed or renewed (`updateFact`). */
export type FactChange = {
  id: string
  statement: string
  source: string
  expiresAt: string
  undoId?: string
}

/** A bulk change (`editBrand`): each change has its own undo id. */
export type BulkBrandEdit = {
  done: number
  undoIds: string[]
  failed: { what: string; reason: string }[]
  stopped?: string
}

/** A brand reading (CON-399): started, running, ready or failed. */
export type DistillState = {
  runId: string
  /** pending | running | ready | failed | committed */
  status: string
  failure?: string
  counts: {
    voices: number
    audiences: number
    guardrails: number
    facts: number
    questions: number
  }
  questions: { id: string; text: string }[]
}

export type DistillSaved = {
  runId: string
  voices: number
  audiences: number
  guardrails: number
  facts: number
  skipped: string[]
}

export type SeriesRhythm = { times: number; per: 'week' | 'month' }

export type SeriesBrief = {
  id: string
  name: string
  recipe: string
  /** Whether the campaign in scope runs it, and how often. */
  runs: boolean
  rhythm?: SeriesRhythm
  defaultRhythm?: SeriesRhythm
}

export type SeriesList = { campaignId?: string; series: SeriesBrief[] }

export type SeriesChange = SeriesBrief & {
  change: BrandChangeKind
  undoId?: string
}

export type SeriesRunChange = {
  campaignId: string
  seriesId: string
  running: boolean
  rhythm?: SeriesRhythm
  undoId?: string
}

export type ExpiredFact = {
  id: string
  statement: string
  source: string
  expiresAt: string
}

/** Posts checked against their voice and the guardrails (`checkBrand`). */
export type BrandCheck = {
  checked: number
  /** Posts past the cap that weren't read. */
  left: number
  findings: BrandFinding[]
}

export type BrandFinding = {
  postId: string
  /** The post's title. */
  title: string
  /** voice | never_claim | banned_word | unbacked_claim | disclaimer … */
  rule: string
  severity: string
  quote: string
  issue: string
  suggestion: string
  /** The post's campaign, when the server says; else the thread's. */
  campaignId?: string
  fixTitle: string
  proposalId?: string
}

/**
 * A campaign calendar's open problems (CON-454), each with the fixes that
 * would resolve it. A fix carries an offer to confirm, or a post to open.
 * Message and titles are the server's words.
 */
export type CalendarFindings = {
  campaignId: string
  findings: {
    key: string
    code: string
    severity: 'warning' | 'info'
    message: string
    postIds: string[]
    fixes: {
      kind: string
      title: string
      postId?: string
      proposalId?: string
    }[]
  }[]
  /** Findings left out because the user dismissed them. */
  dismissed: number
}

/** Where an undo stands, by the action's undo id. */
export type UndoState = 'pending' | 'undone' | 'changed' | 'gone'

export type ThreadStatus = 'idle' | 'running' | 'error'

/**
 * One entry in the thinking timeline. `plan` opens the turn, `tool` spans a
 * `tool_call` → `tool_result` pair, `compose` is the tail between the last
 * tool finishing and the turn completing.
 */
export type AssistantStep = {
  id: string
  kind: 'plan' | 'tool' | 'compose'
  /** Tool name as reported by the backend, e.g. `searchAssetChunks`. */
  tool?: string
  input?: Record<string, unknown>
  ref?: string
  /**
   * The sub-flow's latest step key, from namespaced `{ step }` events. Worded
   * at render time (`stepDetail`), like the label itself (`stepLabel`), so a
   * step never carries a sentence frozen in the language it ran in.
   */
  progress?: string
  /** Posts a generation step has persisted so far. */
  generated?: number
  /** The tool refused the call or hit a conflict (`tool_result.ok: false`). */
  failed?: boolean
  startedAt: number
  endedAt: number | null
}

export type AssistantTurn = {
  id: string
  role: 'user' | 'assistant'
  /** The user's instruction, or the assistant's explanation. */
  content: string
  /**
   * User turns: the screen the turn was sent from (CON-450). The thread draws a
   * quiet marker where it changes between turns, and history replays it.
   */
  view?: ViewContext
  action?: AssistantAction
  /** Campaign turns only — the structured result behind the action. */
  details?: AssistantResultDetails
  /** Offers this turn made (CON-446). */
  proposals?: AssistantProposal[]
  /** Undos asked for from this turn's results, by undo id. */
  undo?: Record<string, UndoState>
  /** A calendar check this turn ran (CON-454). */
  findings?: CalendarFindings
  /** What the assets pack's tools found this turn (CON-460). */
  assets?: AssetsResults
  /** What the brand tools did this turn (CON-461). */
  foundation?: FoundationResults
  /** What this turn did to the screen, and where each can be put back to. */
  uiActions?: AppliedUIAction[]
  /**
   * User turns: this is the server's record of an offer answered from its
   * card ("Confirmed: …"), drawn as a resolved line rather than as words the
   * user typed.
   */
  answer?: 'confirmed' | 'dismissed'
  /** Post turns only. */
  saveVersion?: boolean
  versionNote?: string
  /**
   * Set when a post turn cloned the post (CON-59): the clone is a new,
   * already-persisted post in the same campaign, and the reply offers a jump to
   * it. `campaignId` is the subject's — resolved in the store, as the event
   * omits it — so the jump can target the clone's editor.
   */
  clone?: { postId: string; campaignId: string }
  steps?: AssistantStep[]
  /** Monotonic (`performance.now`) marks — timeline durations only. */
  startedAt?: number
  endedAt?: number | null
  streaming?: boolean
  /** The turn ended in an error; `content` holds the message. */
  failed?: boolean
  /**
   * The turn was stopped by the user. Campaign flows persist as they go, so a
   * stop is not a rollback — the reply says so.
   */
  cancelled?: boolean
}

export type AssistantThread = {
  /** Derived from the subject, so one subject always maps to one thread. */
  id: string
  subject: ThreadSubject
  /** Post/campaign title, for the thread selector. */
  title: string
  /**
   * The name of the campaign this thread belongs to — its own name for a
   * campaign thread, its parent's for a post thread. The thread list groups by
   * campaign, so every row needs it, including the post rows.
   */
  campaignTitle: string
  turns: AssistantTurn[]
  status: ThreadStatus
  /** Wall-clock ms at which the running turn started, for the elapsed label. */
  runStartedAt: number | null
  /**
   * Wall-clock ms of the last turn started in this tab, so the thread list can
   * sort a live thread among the server's (CON-459). Null until one starts.
   */
  lastActiveAt: number | null
  /** A turn finished while the user was looking somewhere else. */
  unread: boolean
  /** History has been loaded from the server at least once. */
  loaded: boolean
  /**
   * Posts streamed by the running turn, merged into the campaign's post list
   * until the refetch supersedes them. Campaign threads only.
   */
  streamedPosts: StreamedPost[]
}
