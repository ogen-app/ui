import type { GoalCadence } from '@/lib/postGoal'
import type { ViewContext } from '@/lib/viewContext'
import type { AppliedUIAction } from '@/lib/assistantUiActions'
import type { AnalyticsOverview, PerformersBoard } from '@/types/analytics'
import type { AssetsState } from '@/services/api/content'

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
  | 'goal_updated'
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
  sources: GroundingSource[]
}

/**
 * One piece of the workspace's material an output drew on (CON-469): the
 * asset (`id`), and — when known — the analysis it was read through and the
 * idea it reached the output by.
 */
export type GroundingSource = {
  id: string
  title: string
  analysisId?: string
  ideaId?: string
  /**
   * `post` for a post cited as a source (CON-479): an example whose idea
   * cites nothing else. Absent for an asset, which is every other source.
   */
  kind?: 'post'
}

/** An entity kind a turn changed, for the client to refresh. */
export type TouchedKind =
  'idea' | 'post' | 'asset' | 'campaign' | 'fact' | 'note'

/** What a turn changed. No `id` means every entity of that kind. */
export type Touched = { kind: string; id?: string }

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
  brief?: { applied: boolean; undoId?: string; grounding?: Grounding }
  dates?: {
    startDate: string
    endDate: string
    postsOutsideRange: number
    undoId?: string
  }
  /** What updateCampaignPlatforms added and removed, in the server's words. */
  platforms?: { added: string; removed?: string; undoId?: string }
  /** The post goal setCampaignGoal raised (CON-468): a rate per period. */
  goal?: {
    perPeriod: number
    cadence: GoalCadence
    /** The posts the whole campaign now aims for. */
    target: number
    undoId?: string
  }
  redistribute?: { postsUpdated: number; phaseCount: number }
}

/**
 * A draft the content-plan / targeted-generation flows have *already
 * persisted*, seen mid-stream before the authoritative refetch. Shaped to
 * merge into the campaign's post list by id.
 */
export type StreamedPost = {
  id: string
  /** Its campaign, when the event said (CON-481): drafts from any thread. */
  campaign_id?: string
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
  /** The option the card leads with, when the server marks one (CON-467). */
  recommended?: string
  status: ProposalStatus
  /** The option it was answered with. */
  chosen?: string
  /** When it was confirmed, for the line it collapses into ("confirmed 15:12"). */
  answeredAt?: string
  /** Why it could not be answered — gone, expired, refused. */
  error?: string
  /**
   * What the card shows beyond the summary (CON-476): the confirm button's
   * verb, what the work draws on and makes. The words are the server's, like
   * the summary (CON-490 asks for the facts behind them); absent, the card is
   * the summary and CONFIRM.
   */
  card?: ProposalDetails
}

export type ProposalDetails = {
  verb?: string
  /** Follows the headline: "from this brochure", "from 4 assets". */
  meta?: string
  rows: ProposalRow[]
  sources: { id: string; title: string; type?: string }[]
  footnote?: string
  /** The examples a "more like these" offer would follow (CON-479). */
  trail?: TrailStep[]
  /** The same work over more sources than the narrow default offered. */
  widen?: { note: string; label: string; instruction: string }
}

/**
 * One detail of an offer. `kind` lays it out: a `dates` row formats its own
 * `start`/`end` and keeps `value` for an open window the server words, a
 * `grounding` row sits in the amber slot.
 */
export type ProposalRow = {
  kind: 'destination' | 'type' | 'dates' | 'grounding' | 'tags' | string
  value: string
  note?: string
  start?: string
  end?: string
}

/**
 * `pending` waits on the user; `stale` was confirmed but ran nothing, because
 * what it was offered on changed while it waited (CON-467) — what still holds
 * comes back as a fresh offer, or the refusal says why; `superseded` is an
 * offer a later turn moved past without answering — it may still be live server-side, but the card no
 * longer stands in the thread as the thing to answer.
 */
export type ProposalStatus =
  | 'pending'
  | 'confirming'
  | 'confirmed'
  | 'stale'
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
  /** The bank's state, when the turn read it for its card (`readAssetsState`). */
  state?: AssetsBankState
  ask?: AssetsAsk
  analysis?: AnalysisRead
  compare?: AssetComparison
  savedViews?: SavedViewList
  campaign?: CampaignFromAssets
}

/** What a question about the assets searched, and where it found it. */
export type AssetsAsk = {
  scope: 'asked' | 'open_asset' | 'campaign' | 'workspace'
  /** `type` is the asset's kind — PDF, DOC, IMG… — for its badge. */
  excerpts: { assetId: string; title: string; type?: string; pages: string }[]
}

/** The bank's state as a turn read it: the counts and the first of each list. */
export type AssetsBankState = AssetsState & {
  waitingAssets: { id: string; title: string }[]
  failedAssets: { id: string; title: string }[]
}

/** A lens: a campaign's, or the workspace's when `campaignId` is absent. */
export type AnalysisLens = {
  campaignId?: string
  campaignName?: string
  /** ready | pending | running | failed | skipped | not_read */
  status: string
  readAt?: string
  /**
   * How many ideas this lens distilled from the asset; absent from a turn
   * recorded before the server sent it, when it is unknown rather than zero.
   */
  ideaCount?: number
}

/** What one lens's analysis found in an asset (`readAnalysis`). */
export type AnalysisRead = {
  assetId: string
  title: string
  /** The asset's kind and length, when known. */
  type?: string
  pageCount?: number
  durationMs?: number
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
  views: {
    id: string
    name: string
    shared: boolean
    count?: number
    /** The list endpoint's own query string the group stands for. */
    filter: string
  }[]
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
  /** When the yes made it. */
  createdAt?: string
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
  /** What `getBrand` read (CON-477): drawn only when the turn just read. */
  brand?: BrandRead
  expiredFacts?: ExpiredFact[]
  brandCheck?: BrandCheck
}

/**
 * One field an edit changed (CON-477): its value before and after, or for a
 * list, the lines added and removed. `field` is the server's slug — a voice
 * rule's name, `channelNotes.<channel>` — worded here, never by the model.
 */
export type FieldChange = {
  field: string
  before?: string
  after?: string
  added?: string[]
  removed?: string[]
}

/** The whole brand as `getBrand` read it, for the cards a plain read draws. */
export type BrandRead = {
  voices: {
    id: string
    name: string
    isDefault: boolean
    rules: number
    samples: number
    channelNotes: number
  }[]
  /** Every fact, current and expired. */
  factsTotal: number
  look?: {
    /** Each colour with its role: "primary", "accent". */
    palette: { hex: string; role: string }[]
    typefaces: string[]
    logos: number
  }
  templates: {
    id: string
    name: string
    role: string
    ratios: string[]
    platforms: string[]
    isDefault: boolean
  }[]
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
  /** What an update changed; empty for an add or a remove. */
  changes: FieldChange[]
  undoId?: string
}

export type AudienceChange = {
  change: BrandChangeKind
  id: string
  name: string
  who: string
  readsOn: string
  unbound: number
  changes: FieldChange[]
  undoId?: string
}

export type GuardrailsChange = {
  changes: FieldChange[]
  undoId?: string
}

/** A fact added, changed, renewed or removed. */
export type FactChange = {
  change: BrandChangeKind | 'renewed'
  id: string
  statement: string
  source: string
  expiresAt: string
  undoId?: string
}

/** What a bulk edit did to one kind of item. */
export type EditCounts = { added: number; updated: number; removed: number }

/** A bulk change (`editBrand`): each change has its own undo id. */
export type BulkBrandEdit = {
  done: number
  /** What it made, by kind — what the headline says. */
  made: { facts: EditCounts; voices: EditCounts; audiences: EditCounts }
  undoIds: string[]
  /** Facts it left alone on purpose, and why. */
  kept: { factId: string; statement: string; reason: string }[]
  failed: { what: string; reason: string }[]
  stopped?: string
}

/** A brand reading (CON-399): started, running, ready or failed. */
export type DistillState = {
  runId: string
  /** pending | running | ready | failed | committed */
  status: string
  /** The server's sentence, when it sent one. */
  failure?: string
  /** `no_usable_sources` and the rest, worded here when there is no sentence. */
  failureCode?: string
  counts: {
    voices: number
    audiences: number
    guardrails: number
    facts: number
    questions: number
  }
  questions: { id: string; text: string }[]
  /** What the read reads: a website, its pages, and documents. */
  sources?: { website?: string; pages: number; assets: number }
  /** The questions an answering round answered, and where from. */
  answered: {
    questionId: string
    question: string
    answer: string
    from?: string
  }[]
  grounding?: Grounding
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
  /** Every campaign running it; a run with no rhythm is occasional. */
  runsIn: { campaignId: string; campaignName: string; rhythm?: SeriesRhythm }[]
}

export type SeriesList = { campaignId?: string; series: SeriesBrief[] }

export type SeriesChange = SeriesBrief & {
  change: BrandChangeKind
  undoId?: string
  /** A series made and run in one step: the run, under the series' undo. */
  run?: SeriesRunChange
  /** Why it was made but not run, in the server's words. */
  notRun?: string
}

export type SeriesRunChange = {
  campaignId: string
  campaignName: string
  seriesId: string
  seriesName: string
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
  /** Posts read that broke nothing. */
  clean: number
  /** Posts past the cap that weren't read. */
  left: number
  /** Findings left out because the user dismissed them. */
  dismissed: number
  /** The voices and guardrails the posts were read against. */
  checkedAgainst: {
    voices: { id: string; name: string }[]
    guardrails: boolean
  }
  findings: BrandFinding[]
}

export type BrandFinding = {
  /** Dismisses it while the post stays the same. */
  key: string
  postId: string
  /** The post's title. */
  title: string
  /** voice | never_claim | banned_word | unbacked_claim | disclaimer … */
  rule: string
  severity: string
  issue: string
  /** The post's campaign: where IGNORE dismisses it, and where it opens. */
  campaignId: string
  fixes: RepairFix[]
}

/**
 * One way to repair a finding (CON-454/462). It carries an offer to confirm
 * (`proposalId`), or is a post to open; everything else is what the offer
 * will do, for the card to say. The title is the server's words.
 */
export type RepairFix = {
  /**
   * redistribute | plan_window | open_post | move_post | enable_post_type |
   * enable_platform | convert_post_type | unschedule | delete |
   * improve_brief | revise_post
   */
  kind: string
  title: string
  postId?: string
  /** The posts a convert, unschedule or delete fix changes. */
  postIds?: string[]
  proposalId?: string
  /**
   * The offer's own card (CON-478): a fix that carries one — a delete naming
   * its posts, a type put back — or a choice (a move's free slots) opens as
   * an offer under its row rather than running on the click.
   */
  card?: ProposalDetails
  options?: {
    id: string
    title: string
    description?: string
    recommended?: boolean
  }[]
}

/** A calendar problem with the fixes that would resolve it. */
export type CalendarFinding = {
  /** Dismisses it while its posts stay the same. */
  key: string
  code: string
  severity: 'warning' | 'info'
  /** The server's words. */
  message: string
  /** More under the message: what it will cost, or the rule it breaks. */
  detail?: string
  /** Its posts will be refused when they publish: the number is amber. */
  blocksPublishing: boolean
  postIds: string[]
  /** The posts by title and day, when the server names them. */
  posts: { id: string; title: string; date?: string }[]
  fixes: RepairFix[]
}

/**
 * A campaign calendar's open problems (CON-454), each with the fixes that
 * would resolve it. Message and titles are the server's words.
 */
export type CalendarFindings = {
  campaignId: string
  findings: CalendarFinding[]
  /** Findings left out because the user dismissed them. */
  dismissed: number
  /** Those findings, without fixes, for SHOW and RESTORE. */
  dismissedFindings: CalendarFinding[]
  /** When the calendar was read. */
  checkedAt?: string
}

/** A brief or post finding from `reviewCampaign` (CON-462). */
export type CampaignReviewFinding = {
  kind: 'brief' | 'post'
  key: string
  severity?: ReviewSeverity
  /** The brief's aspect, worded, or the post's title. */
  label?: string
  postId?: string
  issue: string
  suggestion?: string
  fixes: RepairFix[]
}

/**
 * The campaign's brief and posts reviewed against each other — by
 * `reviewCampaign`, or by `checkBrief` / `checkPostsConsistency`, which
 * answer in the same shape since CON-478.
 */
export type CampaignReview = {
  campaignId: string
  postsChecked: number
  findings: CampaignReviewFinding[]
  dismissed: number
  /** Those findings, without fixes, for SHOW and RESTORE. */
  dismissedFindings: CampaignReviewFinding[]
  /** What it read: `brief`, `posts`. */
  readFrom: string[]
  checkedAt?: string
}

/** One move of a plan or a run: from a day (and time) to another. */
export type CalendarMove = {
  postId: string
  title: string
  /** Days, YYYY-MM-DD, in the campaign's timezone. */
  from: string
  to: string
  /** The exact times, when the server sends them. */
  fromAt?: string
  toAt?: string
  status?: string
}

/** The moves `optimiseCalendar` offers, and the posts it leaves in place. */
export type CalendarPlan = {
  campaignId: string
  proposalId?: string
  /** The days the moves spread over, both included. */
  window?: { from: string; to: string }
  moves: CalendarMove[]
  /** Scheduled posts: a copy waits to publish, so they never move. */
  locked: { postId: string; title: string; date: string; at?: string }[]
  checkedAt?: string
}

/** What `applyCalendarMoves` did: each move, counted by status, and its UNDO. */
export type CalendarMoved = {
  moved: number
  moves: CalendarMove[]
  /** Moves by the post's status: `draft`, `ready_for_publish`… */
  byStatus: Record<string, number>
  /** Scheduled posts left where they were. */
  locked: number
  skipped: string[]
  undoId?: string
}

/** One post a fix changed: its name, and what it was and is now. */
export type ChangedPost = {
  postId: string
  title: string
  platformId?: string
  platform?: string
  fromStatus: string
  toStatus?: string
  /** The time it had, for a post taken off the calendar. */
  wasAt?: string
  /** The time it keeps. */
  scheduledAt?: string
  /** A conversion's types, and what it kept: `caption`, `picture`. */
  fromType?: string
  toType?: string
  kept: string[]
}

/** What a repair fix did to posts: converted, unscheduled or deleted. */
export type PostsChanged = {
  changed: number
  /** Scheduled posts being withdrawn from publishing; no undo reaches them. */
  withdrawing: number
  /** Posts left as they were; the reason is the server's words. */
  skipped: { postId: string; reason: string }[]
  /** Each post it changed, by name (CON-478). */
  posts: ChangedPost[]
  undoId?: string
}

/**
 * What the repair pack's calendar and review tools did this turn (CON-462),
 * read from `results.repair` — each tool's last output. The calendar check
 * itself is the turn's `findings`, as the stream already delivers it.
 */
export type RepairResults = {
  review?: CampaignReview
  /** `checkBrief` and `checkPostsConsistency`, in the review's shape. */
  briefReview?: CampaignReview
  postsReview?: CampaignReview
  plan?: CalendarPlan
  /** `applyCalendarMoves`: a plan confirmed, or one post moved. */
  moved?: CalendarMoved
  /** `changePostType`. */
  converted?: PostsChanged
  /** `unschedulePosts`. */
  unscheduled?: PostsChanged
  /** `deletePosts`: never undone. */
  deleted?: PostsChanged
  /** `revisePost`: one post rewritten, kept as a version. */
  revised?: PostRevised
}

export type PostRevised = {
  postId: string
  /** Where it opens, and what it is called. */
  campaignId?: string
  title?: string
  /** The voice it was rewritten in. */
  voiceName?: string
  undoId?: string
  revised: boolean
  versioned: boolean
  /** The post's own; absent when it never was known. */
  grounding?: Grounding
}

/**
 * What an analytics read was narrowed to (CON-463), which its card cites:
 * the days (inclusive), the platforms (empty for every one), the campaign
 * (absent for the whole workspace), or the one post it is about — and what it
 * can't be narrowed by, in the server's words.
 */
export type AnalyticsApplied = {
  from?: string
  to?: string
  platforms: string[]
  campaign?: { id: string; name: string }
  postId?: string
  note?: string
  /** The relative span the dates resolve (`30d`, `12w`, `6mo`); absent for dates picked by hand. */
  preset?: string
}

/** A read's data, or why it has none (`not_configured`, `no_data`, …). */
export type AnalyticsRead<T, S = undefined> = {
  applied: AnalyticsApplied
  data?: T
  /** What the server worked out from the data, for the card's headline (CON-479). */
  summary?: S
  unavailable?: string
}

/** One weekday-and-hour slot as the summary ranks it; Monday is 0. */
export type RankedSlot = {
  day: number
  hour: number
  /** Average interactions per post — a count, not a rate. */
  interactions: number
  posts: number
}

export type BestTimesSummary = {
  best?: RankedSlot
  /** The best slot on another day. */
  runnerUp?: RankedSlot
  weakest?: RankedSlot
  /** Too few posts in any slot to rank. */
  tooFew: boolean
  minPosts: number
}

/** Hours until a post has half its final engagement, and the age bucket that falls in. */
export type HalfLife = { hours: number; bucket: string }

export type DecaySummary = {
  halfLife?: HalfLife
  /** Each connected platform's own curve, when the read wasn't narrowed. */
  platforms: { platform: string; halfLife?: HalfLife; buckets: DecayBucket[] }[]
}

/** How often the workspace actually posts, through Ogen (CON-479). */
export type PostingCadence = {
  /** Posts per ISO week, oldest first; `current` is this week. */
  weeks: { weekStart: string; posts: number; current: boolean }[]
  perWeek: number
  lastMonth: number
  platforms: { platform: string; perWeek: number }[]
}

export type FrequencySummary = {
  cadence?: PostingCadence
  unavailable?: string
}

/** The day the followers grew most, and the post that reached most then. */
export type FollowerDay = { date: string; gain: number; postTitle?: string }

/** The publisher's engagement in one weekday-and-hour slot; Monday is 0. */
export type BestTimeSlot = {
  day: number
  hour: number
  engagement: number
  posts: number
}

/** How much of its final engagement a post has by one age. */
export type DecayBucket = {
  label: string
  /** 0–100. */
  pct: number
  posts: number
}

/** The engagement at one posting cadence, on one platform. */
export type FrequencyRow = {
  platform: string
  perWeek: number
  /** Percent. */
  rate: number
  weeks: number
}

export type FollowerAccount = {
  id: string
  platform: string
  username: string
  followers: number
  growth: number
  growthPct: number
  /** Followers by day, oldest first. */
  series: number[]
}

/**
 * One published post's figures. The result doesn't say which metric the list
 * was sorted on, so every row shows the same two.
 */
export type PostFigures = {
  postId: string
  title: string
  /** The platform's display name, as the analytics store keeps it. */
  platform: string
  publishedAt?: string
  reach: number
  /** A fraction: 0.031 is 3.1%. */
  rate: number
}

export type PostsList = {
  items: PostFigures[]
  /** Every post the list matched, not just this page. */
  total: number
  /** What the list was sorted on (`engagement_rate`, `reach`…), and which way. */
  sortBy?: string
  order?: 'asc' | 'desc'
}

/** One overview metric over both periods; the change is the server's. */
export type PeriodMetric = {
  metric: string
  label: string
  /** A count changes by a percent of itself; a rate by points. */
  unit: 'count' | 'rate'
  first: number
  second: number
  /** For a rate, in points. */
  change: number
  /** Null when the first period's figure is zero. */
  changePct: number | null
}

export type PeriodComparison = {
  first: AnalyticsApplied
  second: AnalyticsApplied
  metrics: PeriodMetric[]
  unavailable?: string
}

/** An asset on a trail, with its kind for the badge. */
export type TrailAsset = { id: string; title: string; type?: string }

/**
 * An example post, and what it was made from (CON-479): its rate, then each
 * idea, the analysis behind it, the asset and the passages the analysis cited.
 */
export type TrailStep = {
  postId: string
  title: string
  /** The post's engagement rate, a fraction. */
  rate?: number
  ideas: {
    id: string
    title: string
    analysis?: { id: string; campaignId?: string; campaignName?: string }
    asset?: TrailAsset
    /** "p. 12", "Slide 4", "12:03–12:47". */
    passages: string[]
  }[]
  assets: TrailAsset[]
  /** Nothing recorded: the post's own words are the only source. */
  noTrail: boolean
}

/** "More like these" (CON-463): the trail, then the ideas it saved. */
export type MoreLikeThese = {
  trail: TrailStep[]
  /** The Ideas list's query for just the ideas this run saved. */
  filter?: string
  /** The campaign's other sources the writer could draw on. */
  grounding: { id: string; title: string }[]
  campaignId?: string
  ideas: {
    id: string
    title: string
    angle?: string
    /** What this idea cites, each asset through its trail idea. */
    grounding?: Grounding
  }[]
}

/**
 * The analytics pack's typed results (CON-463), each tool's last output in
 * the turn, from `complete.results.analytics`.
 */
export type AnalyticsResults = {
  overview?: AnalyticsRead<AnalyticsOverview>
  topPosts?: AnalyticsRead<PerformersBoard>
  /** Cited only: the lessons stay with the model. */
  lessons?: AnalyticsRead<unknown>
  /** Cited only. */
  postStats?: AnalyticsRead<unknown>
  bestTimes?: AnalyticsRead<BestTimeSlot[], BestTimesSummary>
  decay?: AnalyticsRead<DecayBucket[], DecaySummary>
  frequency?: AnalyticsRead<FrequencyRow[], FrequencySummary>
  followers?: AnalyticsRead<FollowerAccount[], FollowerDay>
  posts?: AnalyticsRead<PostsList>
  compare?: PeriodComparison
  more?: MoreLikeThese
}

/**
 * A run of days of the activity log (CON-464): the daily report's totals over
 * the range, and the days that had something, oldest first.
 */
export type ActivityRange = {
  from: string
  to: string
  tz: string
  published: number
  failed: number
  failedPosts: {
    postId: string
    /** The post's title, when the server looked it up (CON-480). */
    title?: string
    status: string
    reason: string
  }[]
  created: number
  scheduled: number
  campaignsCreated: number
  /** Ideas decided inside the range's local days (CON-480). */
  ideasDecided: number
  /** The next post to go out, for a range where nothing has yet. */
  nextScheduled?: { postId: string; title: string; at: string }
  /**
   * Whether the server looked the next post up (CON-480): without it, no
   * `nextScheduled` says nothing about whether one is scheduled.
   */
  nextKnown: boolean
  /** The campaign the range was narrowed to. */
  campaign?: { id: string; name: string }
  days: {
    date: string
    published: number
    failed: number
    created: number
    campaignsCreated: number
  }[]
}

/** The workspace's setup: its zone, auto-publishing and accounts' health. */
export type WorkspaceSetup = {
  timezone: string
  /** Platform slugs that publish on their own; absent when unread. */
  autoPublish?: string[]
  accounts: {
    id: string
    platform: string
    username: string
    needsReconnect: boolean
    /** `valid`, `expiring`, … as the publisher reports it. */
    health?: string
    tokenExpiresAt?: string
    autoPublish: boolean
    /** When it stopped working, while it isn't (CON-480). */
    unhealthySince?: string
    /** Scheduled posts that go out through it. */
    waitingPosts: number
  }[]
}

/** A weekly report figure: the email's own value and change. */
export type DigestFigure = { value: string; delta?: string; good: boolean }

/**
 * The weekly report for one finished week, as the Monday email renders it
 * (CON-401). The values are the email's own strings, already formatted by
 * the server; the labels around them are ours.
 */
export type WeeklyDigest = {
  from: string
  to: string
  empty: boolean
  headline: string
  lede: string
  attention: { text: string; detail?: string }[]
  publishing?: {
    published: DigestFigure
    failed?: string
    failures: { title: string; meta: string; reason: string }[]
    nextWeek?: string
  }
  performance?: {
    reach: DigestFigure
    interactions: DigestFigure
    engagement: DigestFigure
    followers: DigestFigure
    top: { title: string; meta: string; reach: string; multiple: string }[]
  }
  campaigns?: {
    rows: { name: string; goal: string; status: string; met: boolean }[]
    summary?: string
  }
  ideas?: {
    waiting?: string
    summary?: string
    /** The week's ideas decided and still waiting, as numbers (CON-480). */
    decided: number
    waitingCount: number
  }
  team?: string
}

/** Why the weekly report didn't go to someone (CON-480). */
export type DigestSkipReason =
  'not_member' | 'opted_out' | 'already_sent' | 'failed' | string

/** `emailWeeklyDigest`: whom the week went to, and whom it didn't. */
export type DigestSent = {
  from: string
  to: string
  /**
   * Who it went to; absent from a server before CON-480, which sent it to
   * the asker without saying so — unknown, not "no one".
   */
  sent?: { userId: string; name: string; role: string; email: string }[]
  notSent: { recipient: string; reason: DigestSkipReason }[]
  /** When it was queued; absent when it went to no one. */
  sentAt?: string
}

/** Which change a history entry is (CON-480). */
export type HistoryChange =
  | 'version'
  | 'scheduled'
  | 'rescheduled'
  | 'unscheduled'
  | 'status'
  | 'failed'
  | 'retried'
  | 'copied'
  | 'compiled'
  | 'restored'

/** One entry in a post's history, newest first. */
export type PostHistoryEntry = {
  at: string
  kind: 'version' | 'event'
  /** Which change; absent from a server that predates CON-480. */
  change?: HistoryChange | string
  /** The server's words for what happened. */
  what: string
  /** A schedule's times: the one it had and the one it got. */
  from?: string
  to?: string
  /** Why the post failed to go out, on its latest failure. */
  reason?: string
  version?: number
  /** Who, in the server's words — a member's name, or "the system". */
  by: string
  byId?: string
  /**
   * Who made it: `user`, `assistant` or `system`. For the assistant, `by`
   * is who asked it.
   */
  source?: string
}

export type PostHistory = {
  postId: string
  title: string
  entries: PostHistoryEntry[]
  more: boolean
  /** Some versions predate people being recorded on them. */
  unrecorded: boolean
  /** When versions started saying who saved them. */
  unrecordedBefore?: string
  /** The workspace's, for showing the times. */
  timezone?: string
  /** How the history was narrowed. */
  scope?: { since?: string; changes: string[] }
}

/** The workspace pack's typed results (CON-464), from `results.workspace`. */
export type WorkspaceResults = {
  activity?: ActivityRange
  setup?: WorkspaceSetup
  digest?: WeeklyDigest
  /** `emailWeeklyDigest`: whom the week went to, and whom it didn't. */
  emailed?: DigestSent
  history?: PostHistory
  /** `setAutoPublish`: what changed, and the list as it now stands. */
  autoPublish?: {
    platforms: string[]
    undoId?: string
    /** The platform switched and which way (CON-480). */
    platform?: string
    platformLabel?: string
    on?: boolean
    /** Its posts already scheduled the other way, which keep their route. */
    scheduledUnaffected: number
  }
}

/** An idea as the ideas pack names it (CON-465). */
/** A planned post compiled from ideas, on one platform. */
export type CompiledPost = {
  postId: string
  title: string
  platformId?: string
  /** Its post type's slug (CON-481); absent while automatic. */
  postType?: string
  /** YYYY-MM-DD; absent when the post is undated. */
  date?: string
}

export type IdeaBrief = {
  id: string
  title: string
  /** `yes`, `later`, `no`; absent while it is on the desk. */
  verdict?: 'yes' | 'later' | 'no'
  /**
   * When a `later` idea comes back (CON-481). Past it the idea is woken: it
   * sits on the desk although its verdict stays `later`.
   */
  remindAt?: string
  campaignId?: string
  fitScore?: number
  /** How many posts were made from it (CON-470); absent when not said. */
  posts?: number
  /** What it is planned as; absent fields aren't planned. */
  plan?: IdeaPlanBrief
}

/** An idea's plan, as the ideas pack sends it. */
export type IdeaPlanBrief = {
  platformId?: string
  postType?: string
  phaseId?: string
  targetDate?: string
}

/** A compiled post's thesis: one per idea, with its points (CON-481). */
export type IdeaThesis = { title: string; points: string[] }

/** A bulk change over ideas: how many, which failed, its undo. */
export type IdeasChanged = {
  done: number
  failed: number
  /** Why the run stopped early, in the server's words. */
  stopped?: string
  undoId?: string
}

/** A shared value across a selection, and which ideas share it. */
export type IdeasShared = { value: string; label: string; ideaIds: string[] }

/** The ideas pack's typed results (CON-465), from `results.ideas`. */
export type IdeasResults = {
  found?: {
    ideas: IdeaBrief[]
    total: number
    /** The pile the filter named, counted with no other filter (CON-481). */
    pileTotal?: number
  }
  /** `setIdeaVerdict`. */
  decided?: { idea: IdeaBrief; undoId?: string }
  /**
   * `setIdeaVerdicts`: the ideas as they are now, and what the triage set
   * (CON-481) — `none` is back on the desk.
   */
  decidedMany?: IdeasChanged & {
    ideas: IdeaBrief[]
    verdict?: 'yes' | 'later' | 'no' | 'none'
    remindAt?: string
  }
  moved?: IdeasChanged & { ideas: IdeaBrief[] }
  /** Never undone. */
  deleted?: IdeasChanged
  /**
   * One planned post per platform (CON-470), in the order asked for; one
   * UNDO deletes them all or none.
   */
  compiled?: {
    posts: CompiledPost[]
    campaignId: string
    ideas: number
    /** The ideas, in their theses' order (CON-481). */
    builtFrom: { id: string; title: string }[]
    theses: IdeaThesis[]
    grounding: Grounding
    undoId?: string
  }
  drafted?: {
    posts: DraftedIdeaPost[]
    warnings: string[]
  }
  /** `getIdea`: why it fits, where it came from, what it became. */
  idea?: {
    idea: IdeaBrief
    angle?: string
    rationale?: string
    fit?: {
      score?: number
      lens: 'campaign' | 'workspace'
      campaignId?: string
      criteria: {
        key: string
        level: number
        why: string
        phase?: string
        campaign?: string
      }[]
      caps: string[]
    }
    sourceAsset?: { id: string; title: string }
    analysisGist?: string
    /** The lens the analysis it came from read in; none is the workspace's. */
    lens?: { campaignId?: string; campaignName?: string }
    posts: { id: string; title: string; status: string; campaignId: string }[]
  }
  edited?: {
    idea: IdeaBrief
    changed: string[]
    /** The editable fields before the edit (CON-481). */
    before?: { title: string; note?: string; plan: IdeaPlanBrief }
    /** The note as it now reads; absent when it is empty. */
    note?: string
    undoId?: string
  }
  similar?: {
    ideaId: string
    title: string
    items: { idea: IdeaBrief; why: string[] }[]
  }
  common?: {
    ideas: { id: string; title: string }[]
    shared: { kind: string; values: IdeasShared[] }[]
    /** The thread they share, in a few words and a sentence (CON-481). */
    theme?: string
    angle?: string
    /** Where they differ: a field and every value they hold of it. */
    splits: { field: string; values: IdeasShared[] }[]
  }
  duplicates?: {
    groups: { keepId: string; similarity: number; ideas: IdeaBrief[] }[]
    total: number
  }
  /** Each group merged (CON-481); `stopped` when a later one failed. */
  merged?: {
    groups: { idea: IdeaBrief; deleted: number }[]
    stopped?: string
  }
}

/** A draft written from ideas: the result's rows and each streamed event. */
export type DraftedIdeaPost = {
  postId: string
  title: string
  platformId: string
  /** YYYY-MM-DD; absent when the draft is unscheduled (CON-470). */
  publishDate?: string
  /** The post's own campaign (CON-481), for OPEN in any thread. */
  campaignId?: string
  /** The ideas it was written from. */
  ideaIds: string[]
  /** The start of its body. */
  excerpt?: string
  grounding: Grounding
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
  /** Posts it means to write, when it says (CON-481's draftIdeas). */
  planned?: number
  /** The tool refused the call or hit a conflict (`tool_result.ok: false`). */
  failed?: boolean
  /**
   * What the step read or made, from `tool_result.step` (CON-476): worded at
   * render time like the label. Streamed only, so a reloaded thread's steps
   * have none.
   */
  detail?: StepDetail
  startedAt: number
  endedAt: number | null
}

export type StepDetail = {
  /** An asset, a campaign, or a campaign's lens, by name. */
  subject?: string
  /** The step read the workspace's lens. */
  workspace?: boolean
  passages?: number
  analyses?: number
  sources?: number
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
  /** Findings ignored from this turn's cards, by key. */
  ignored?: string[]
  /** What the repair tools did this turn (CON-462). */
  repair?: RepairResults
  /** What the assets pack's tools found this turn (CON-460). */
  assets?: AssetsResults
  /** What the brand tools did this turn (CON-461). */
  foundation?: FoundationResults
  /** What the analytics tools read or wrote this turn (CON-463). */
  analytics?: AnalyticsResults
  /** What the workspace pack read or changed this turn (CON-464). */
  workspace?: WorkspaceResults
  /** What the ideas pack read or changed this turn (CON-465). */
  ideas?: IdeasResults
  /**
   * Drafts from ideas as they are written (CON-481): drawn in the rail while
   * the turn runs, replaced by the summary card when it completes.
   */
  liveDrafts?: { posts: DraftedIdeaPost[]; done: number; total: number }
  /**
   * Refusals the server named with a code (CON-481) — `idea_read_only` —
   * which the reply draws as a card of its own.
   */
  refusals?: { tool: string; code: string }[]
  /** How an offer answered from its card went, on the reply it ran in. */
  answered?: OfferOutcome
  /** What this turn did to the screen, and where each can be put back to. */
  uiActions?: AppliedUIAction[]
  /**
   * User turns: this is the server's record of an offer answered from its
   * card ("Confirmed: …"), drawn as a resolved line rather than as words the
   * user typed.
   */
  answer?: 'confirmed' | 'dismissed'
  /** When a stored turn was recorded — history only. */
  at?: string
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

/**
 * How a confirmed offer went (CON-467), read off the confirm's
 * `complete.result`: re-offered because what it was made on changed, or run
 * with some of it left undone — each with why, and the items worth trying
 * again offered on a card of their own.
 */
export type OfferOutcome = {
  /** Nothing ran; what still holds waits on a fresh card. */
  reoffered: boolean
  notMade: OfferNotMade[]
  /** The fresh offer of just what is worth retrying. */
  retryProposalId?: string
  /**
   * Assets tagged from an offer, with the undo that takes the tags back. The
   * assets pack doesn't record a tagging among its results, so this is the
   * only place it reaches the client.
   */
  tagged?: { count: number; undoId?: string }
  /**
   * The budget guard's "replace the weakest drafts" (CON-468): the drafts
   * deleted for good to make room, and those kept because they changed
   * since the offer or outnumbered the posts written. The new drafts are the
   * campaign pack's own card.
   */
  replaced?: { deleted: number; kept: number }
}

/** An item a run left undone. `title` is missing where the tool names none. */
export type OfferNotMade = { id: string; title?: string; reason: string }
