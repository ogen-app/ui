/**
 * The vocabulary of the analytics surfaces.
 *
 * One primitive underlies every screen: **measure × sleeve × axis**. A
 * *measure* is a number we can track; a *sleeve* is a named subset of the data
 * (a platform, an account, a theme, a way of writing); the *axis* is what gets
 * held up against what — either one sleeve at two points in time ("what
 * happened, and is it unusual?") or two sleeves at the same time ("where does
 * the next hour go?"). Every shape below exists to serve that primitive.
 *
 * The second structural idea is that **not everything is period-bound**. A
 * date lens governs the comparison and nothing else: what we have learned
 * about this workspace's content — when it lands, how long it lives, what
 * wins — accumulates over all history, and what we expect next points forward.
 * That is why these surfaces are called Analytics and not Performance.
 */

/** A number we can track. */
export type MeasureId =
  | 'reach'
  | 'impressions'
  | 'interactions'
  | 'engagement_rate'
  | 'saves'
  | 'clicks'
  | 'followers'
  | 'published'

export interface MeasureMeta {
  id: MeasureId
  label: string
  format: 'count' | 'percent'
  /**
   * Whether the measure accumulates or stands at a level.
   *
   * A **flow** (reach, interactions, clicks) is earned day by day and totals
   * over a period, so its chart is a running total and its expectation is a
   * cone that widens as the window fills. A **level** (followers, engagement
   * rate) simply *is* a number on any given day; summing it produces a
   * quantity that does not exist. Getting this wrong is how a dashboard ends
   * up drawing "cumulative engagement rate".
   */
  kind: 'flow' | 'level'
  /**
   * Which direction is good news. Held per measure rather than assumed,
   * because the moment unfollows or hides arrive the assumption breaks.
   */
  better: 'up' | 'down'
  /** Where the number comes from, when the label doesn't say it. */
  hint?: string
}

export const MEASURES: Record<MeasureId, MeasureMeta> = {
  reach: {
    id: 'reach',
    label: 'Reach',
    format: 'count',
    kind: 'flow',
    better: 'up',
    hint: 'Distinct accounts that saw a post',
  },
  impressions: {
    id: 'impressions',
    label: 'Impressions',
    format: 'count',
    kind: 'flow',
    better: 'up',
    hint: 'Times a post was shown, the same person counted more than once',
  },
  interactions: {
    id: 'interactions',
    label: 'Interactions',
    format: 'count',
    kind: 'flow',
    better: 'up',
    hint: 'Likes, comments, shares and saves together',
  },
  engagement_rate: {
    id: 'engagement_rate',
    label: 'Engagement rate',
    format: 'percent',
    kind: 'level',
    better: 'up',
    hint: 'Interactions as a share of reach',
  },
  saves: {
    id: 'saves',
    label: 'Saves',
    format: 'count',
    kind: 'flow',
    better: 'up',
    hint: 'People keeping a post to come back to',
  },
  clicks: {
    id: 'clicks',
    label: 'Clicks',
    format: 'count',
    kind: 'flow',
    better: 'up',
    hint: 'Taps on a link out of the post',
  },
  followers: {
    id: 'followers',
    label: 'Followers',
    format: 'count',
    kind: 'level',
    better: 'up',
  },
  published: {
    id: 'published',
    label: 'Posts published',
    format: 'count',
    kind: 'flow',
    better: 'up',
  },
}

/** What a set of sleeves is cut along. */
export type SleeveDimension =
  | 'platform'
  | 'account'
  | 'campaign'
  | 'format'
  | 'theme'
  /** How the post came to exist: generated, generated-then-edited, written. */
  | 'origin'
  | 'weekday'

export const SLEEVE_DIMENSIONS: Record<SleeveDimension, string> = {
  platform: 'Platform',
  account: 'Account',
  campaign: 'Campaign',
  format: 'Format',
  theme: 'Theme',
  origin: 'How it was written',
  weekday: 'Day of week',
}

/** A named subset of the data. */
export interface Sleeve {
  id: string
  label: string
  /**
   * How many measured posts sit behind it. Every comparison is gated on this:
   * a sleeve of four posts is an anecdote, and rendering it beside a sleeve of
   * ninety invites a decision it can't carry.
   */
  sample: number
  /** Chart key colour, 1–5, assigned by the caller so it stays stable. */
  tone?: 1 | 2 | 3 | 4 | 5
}

export interface Point {
  /** ISO date, `YYYY-MM-DD`. */
  date: string
  value: number
}

export interface Period {
  label: string
  from: string
  to: string
  days: number
}

export type Confidence = 'low' | 'medium' | 'high'

/**
 * One measure over the lens period: where it is, where it was, and where we
 * expected it to be.
 *
 * `expected` is what makes the temporal axis worth having. A delta against the
 * previous period says *different*; a delta against the band this workspace
 * normally lands in says **unusual**, which is the only one of the two that
 * deserves someone's attention.
 */
export interface MeasureReading {
  measure: MeasureId
  value: number
  /** The same measure over the comparison period; `null` if there isn't one. */
  previous: number | null
  /**
   * The range this workspace normally lands in over a stretch this long.
   *
   * A **period total**, in the same unit as `value` — not a daily rate. The
   * chart has to put it on the same scale as the line, which is why the
   * headline chart accumulates: a band of 120K–165K drawn against a daily
   * series of ~6K squashes the line into the bottom of the box and looks empty.
   */
  expected: { low: number; high: number } | null
  /** Per-day values across the period. */
  series: Point[]
  /** The comparison period's own series, drawn as a ghost behind the current. */
  previousSeries?: Point[]
}

/** A sentence the surface is willing to say out loud. */
export interface Insight {
  id: string
  text: string
  tone: 'positive' | 'negative' | 'neutral'
  /** What it is derived from — sample size, method, caveat. */
  basis?: string
  /** Where the user would go to act on it. */
  action?: { label: string }
}

/** How much of the campaign or workspace the numbers actually describe. */
export interface Coverage {
  measured: number
  published: number
  lastRefreshedAt?: string
  /**
   * When the next refresh lands, e.g. `in 9 minutes`.
   *
   * Worth carrying next to the last one: "updated 2 hours ago" on its own
   * leaves someone wondering whether it is stuck. Saying when it comes back
   * turns a stale-looking screen into a scheduled one.
   */
  nextRefreshIn?: string
}

/** The temporal axis: this sleeve, now versus before. */
export interface NowView {
  period: Period
  /**
   * The day the comparison is anchored to, ISO — normally `period.from`, so
   * the screen reads *today vs 15 Jul*: the same rolling window, measured now
   * and measured then. `null` when there is no comparable past yet.
   *
   * A date rather than a phrase on purpose. "The 28 days before" makes the
   * reader do arithmetic to find out what they are looking at, and every
   * screenshot of it is undateable.
   */
  comparedToDate: string | null
  readings: MeasureReading[]
  insights: Insight[]
  coverage: Coverage
}

export interface SleeveReading {
  sleeve: Sleeve
  value: number
  previous: number | null
  /** The measure divided by posts published — the effort-adjusted view. */
  perPost: number
  series: Point[]
}

/** The sleeve axis: several sleeves, same period, ranked. */
export interface SideBySideView {
  dimension: SleeveDimension
  measure: MeasureId
  rows: SleeveReading[]
  /** Where the next hour goes. `null` when the samples can't support a call. */
  verdict: Insight | null
}

/** Something we have learned that does not belong to any one period. */
export interface Pattern {
  id: string
  title: string
  detail: string
  confidence: Confidence
  sample: number
}

/**
 * Standing knowledge. Deliberately outside the date lens: "your posts land on
 * Tuesday evenings" is not a fact about the last 28 days, and putting it under
 * a window control implies it is.
 */
export interface PatternsView {
  /**
   * 7 rows (Mon–Sun) × 24 columns, each 0–1 relative to the best cell — plus
   * the conclusion the grid is there to support. A heatmap without the slot
   * named underneath it makes the reader squint for the darkest square and
   * guess; and the count is what stops "Tuesday 10:00" that rests on a single
   * post from reading like a finding.
   */
  bestTimes: {
    grid: number[][]
    best: { day: number; hour: number; sample: number } | null
    sample: number
    confidence: Confidence
  } | null
  shelfLife: ShelfLife | null
  winners: Pattern[]
  fading: Pattern[]
}

/**
 * How a post matures: what share of everything it will ever earn has arrived by
 * each hour since publishing.
 *
 * A half-life on its own is a single number that reads as a rule of thumb. The
 * curve is what makes it operational — the gap between 50% and 95% is the
 * window in which boosting, re-sharing or replying still changes the outcome,
 * and it is also the reason a post's numbers are marked as still counting.
 */
export interface ShelfLife {
  /** Cumulative share earned by each hour, `share` 0–1. */
  curve: { hour: number; share: number }[]
  /** The hours at which the curve crosses each share. Ordered by share. */
  milestones: { share: number; hour: number }[]
  sample: number
  confidence: Confidence
}

/**
 * Plan against reality. An evergreen campaign has no finish line, so its
 * pacing is a rate and nothing else — projecting a total for it would be
 * inventing an end date the user never set.
 */
export interface Pacing {
  kind: 'bounded' | 'evergreen'
  published: number
  planned: number
  /** "this week", "this month" — the cadence period, from the campaign. */
  periodLabel: string
  /** Bounded only: where the campaign lands by its end date. */
  projected?: number
  target?: number
  endsOn?: string
}

export type Urgency = 'now' | 'soon' | 'whenever'

/**
 * The connective tissue back into work. Every action names the place it would
 * be done — analytics that only leads to more analytics is a dead end.
 */
export interface NextAction {
  id: string
  title: string
  detail: string
  urgency: Urgency
  /** The label of the destination, e.g. "Open the calendar". */
  target: string
}

/** Forward-looking, and equally outside the date lens. */
export interface NextView {
  pacing: Pacing | null
  actions: NextAction[]
}

/* -------------------------------------------------------------- outcomes -- */

/**
 * How well we can currently see a goal — and the reason a goal can be declared
 * long before it can be tracked.
 *
 * The ladder runs `unmeasured` → `clicks` (platforms already report these) →
 * `sessions` (an analytics source is connected) → `conversions` (that source
 * reports the goal itself). Every rung above the first is cheaper than it
 * looks because Ogen publishes the links and can therefore stamp them, but the
 * point of carrying the rung on the goal is honesty: a goal measured by clicks
 * says *clicks to /book*, never *bookings*. Nothing on screen may claim a rung
 * it isn't standing on.
 */
export type GoalSignal = 'unmeasured' | 'clicks' | 'sessions' | 'conversions'

export const GOAL_SIGNAL_NOUN: Record<GoalSignal, string> = {
  unmeasured: 'not measurable yet',
  clicks: 'clicks on the link',
  sessions: 'visits that arrived from a post',
  conversions: 'completions your website reported',
}

/**
 * The same rung, short enough to sit under a figure.
 *
 * Every number carries its rung, including the ones in a row of tiles — two
 * goals side by side can be watched through different signals, and 412 read as
 * enquiries when it counts visits is exactly the misreading the ladder exists
 * to prevent.
 */
export const GOAL_SIGNAL_SHORT: Record<GoalSignal, string> = {
  unmeasured: 'not measured',
  clicks: 'link clicks',
  sessions: 'site visits',
  conversions: 'reported goals',
}

/**
 * Something the workspace is actually trying to cause. Optional target,
 * because a goal without a number is still worth declaring — it tells every
 * other surface what "working" means here.
 */
export interface Goal {
  id: string
  label: string
  /** Where the goal happens, when there is a URL for it. */
  destination?: string
  signal: GoalSignal
  /** What we can see at that rung. `null` while unmeasured. */
  value: number | null
  previous: number | null
  target?: { value: number; per: 'week' | 'month' }
  series: Point[]
  /** What drove it, best first — usually posts. */
  topContributors?: { label: string; value: number }[]
  /** What we make of this goal. The card's summary, once it is selected. */
  insight?: Insight
}

export interface OutcomesView {
  goals: Goal[]
  /** The best rung this workspace could reach today. */
  bestAvailableSignal: GoalSignal
  /** What connecting the next rung would buy, when there is one to offer. */
  upgrade: { label: string; detail: string } | null
  /** How the goals are counted at all — the note at the foot of the card. */
  basis?: string
}

/* ---------------------------------------------- performers and outliers -- */

/**
 * Where a post sits against what this workspace normally does **at the same
 * age**, once its numbers have been age-corrected. `null` while it is too young
 * for the correction to say anything.
 */
export type PacePlacement = 'ahead' | 'usual' | 'behind'

/**
 * One post, corrected for how old it is.
 *
 * This is the rung between a workspace total and a single post — the headline
 * says 184.9K and the only honest follow-up is *from what?* But a straight
 * ranking of that answer is a lie, because a post from this morning has barely
 * begun earning and a post from three weeks ago has finished. Rank them
 * together and the list is sorted by age wearing the clothes of quality; drop
 * the young ones and the section can't answer anything about the work done this
 * week.
 *
 * So every reading here is corrected against the workspace's own maturation
 * curve (`ShelfLife`) before anything is compared:
 *
 * - `matured` — what share of its lifetime earning has already landed, read off
 *   the curve at this post's age.
 * - `projected` — `value / matured`. Where it lands once it finishes. This is
 *   what the list is **ranked** by, so "most impactful" keeps meaning impact
 *   rather than seniority.
 * - `pace` — `value` against what a typical post of this workspace had earned
 *   *by the same age*. A dimensionless multiple, so it needs no projection to
 *   be fair, and it is what decides `placement`.
 *
 * The two answer different questions and both are on the row: projection says
 * how big, pace says how good. A modest post at 3× pace and a huge post at 1.1×
 * are both worth knowing about, and neither number finds the other one.
 */
export interface RankedPost {
  id: string
  title: string
  /** Human, not ISO — `4 Aug`. */
  publishedAt: string
  /** How long it has been earning — `6 hours`, `13 days`. */
  age: string
  /** Where it went out. Labelled, because per-platform numbers don't sum. */
  sleeve: Sleeve
  maturity: PostMaturity
  /** What it has earned so far, in the measure's unit. */
  value: number
  /** Share of its lifetime earning already in, 0–1. `1` once settled. */
  matured: number
  /** Where the correction says it lands. `null` once settled — `value` is it. */
  projected: number | null
  /** Against a typical post at the same age: `1` is typical, `2` is twice. */
  pace: number | null
  placement: PacePlacement | null
  /**
   * Share of the period's total for this measure, 0–1, on what has actually
   * been earned rather than the projection. The anomaly check: one post at a
   * quarter of the month is the difference between a good month and one lucky
   * afternoon.
   */
  share: number
}

export interface PerformersView {
  measure: MeasureId
  /** Every post in the period, placed or not. The bands are counted from these. */
  posts: RankedPost[]
  /**
   * The maturation curve the correction is read off — this workspace's own, not
   * an industry benchmark.
   *
   * `null` when there aren't enough finished posts to build one, and that is a
   * real state rather than a missing field: with no curve there is nothing to
   * correct against, so nothing young can be placed and the section falls back
   * to ranking what has already settled.
   */
  curve: { sample: number; confidence: Confidence; floor: string } | null
  insight?: Insight
}

/** Which surface a composition is rendering. */
export type AnalyticsScope =
  | { kind: 'workspace'; label: string }
  | { kind: 'campaign'; label: string; campaignId: string; evergreen: boolean }

/** Everything a workspace or campaign surface renders, once settled. */
export interface AnalyticsData {
  now: NowView
  outcomes: OutcomesView
  performers: PerformersView
  sideBySide: SideBySideView
  patterns: PatternsView
  next: NextView
}

/** The states a surface can be in, mirroring what the hook will hand it. */
export interface AnalyticsSurfaceState {
  data?: AnalyticsData
  isPending: boolean
  isError: boolean
  /** The workspace has no analytics database — nothing is being measured. */
  isUnavailable: boolean
  /** Published but nothing measured yet, or nothing published at all. */
  isCold: boolean
}

/* ------------------------------------------------------------------ post -- */

/**
 * How far along a post's numbers are. Ranking a six-hour-old post against a
 * six-week-old one is the single most common lie in social analytics, so
 * maturity is carried on the post rather than inferred at the call site.
 */
export type PostMaturity = 'unpublished' | 'counting' | 'settling' | 'final'

export interface PostMetric {
  measure: MeasureId
  value: number
}

export interface PostStatsData {
  maturity: PostMaturity
  publishedAt?: string
  /** Rank against this workspace's own history, 0–100. `null` under sample. */
  percentile: number | null
  metrics: PostMetric[]
  /** One row per account when the same post went to several. */
  perAccount: { sleeve: Sleeve; metrics: PostMetric[] }[]
  /** Share of eventual engagement earned by each hour since publishing. */
  decay: { hour: number; share: number }[] | null
  insight: Insight | null
}
