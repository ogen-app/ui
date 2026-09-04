import type { QualityDimensionKey } from '@/types/quality'

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
  | 'views'
  | 'followers'
  | 'published'

/**
 * How a measure *behaves*. What it is *called* is in the catalogue, under
 * `analytics.measures.<id>` — read it with `measureCopy` (`format.ts`).
 *
 * The split is not tidiness. A table of labels at module scope freezes
 * whichever language loaded first (CLAUDE.md), and these labels are read in
 * pure functions as well as components, so there is no render to rebuild them
 * on. Keeping the arithmetic here and the words there also means a measure's
 * copy can be argued with without anyone touching how it is drawn.
 *
 * Three of those catalogue keys are worth knowing about from here:
 *
 * - `label` — the measure on its own, mid-sentence and in a picker.
 * - `periodLabel` — the measure shown *over a period*. "Reach" and "Followers"
 *   are the same word for two different quantities: one is everything earned
 *   across the window, the other is where the number stands today. A tab
 *   reading "Reach 184.9K" beside one reading "Followers 14.2K" invites both to
 *   be read as period totals, and one of them isn't; "Cumulative reach" and
 *   "Current followers" cost a word and remove the ambiguity everywhere.
 * - `hint` — where the number comes from, when the label doesn't say. Empty
 *   for the two whose labels already do.
 */
export interface MeasureMeta {
  id: MeasureId
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
   * How the detail chart draws it.
   *
   * A **running** total climbs from nothing to the headline figure. A **level**
   * is a line through where the number stood each day. **Columns** are for a
   * quantity that is re-derived every day and doesn't carry over — a daily rate
   * is seven separate answers to the same question, and joining them with a
   * line claims a continuity between Tuesday's rate and Wednesday's that does
   * not exist. Followers stay a line for the opposite reason: today's figure
   * *is* yesterday's, plus or minus.
   */
  chart: 'running' | 'level' | 'columns'
  /**
   * Which direction is good news. Held per measure rather than assumed,
   * because the moment unfollows or hides arrive the assumption breaks.
   */
  better: 'up' | 'down'
}

export const MEASURES: Record<MeasureId, MeasureMeta> = {
  reach: {
    id: 'reach',
    format: 'count',
    kind: 'flow',
    chart: 'running',
    better: 'up',
  },
  impressions: {
    id: 'impressions',
    format: 'count',
    kind: 'flow',
    chart: 'running',
    better: 'up',
  },
  interactions: {
    id: 'interactions',
    format: 'count',
    kind: 'flow',
    chart: 'running',
    better: 'up',
  },
  engagement_rate: {
    id: 'engagement_rate',
    format: 'percent',
    kind: 'level',
    chart: 'columns',
    better: 'up',
  },
  saves: {
    id: 'saves',
    format: 'count',
    kind: 'flow',
    chart: 'running',
    better: 'up',
  },
  clicks: {
    id: 'clicks',
    format: 'count',
    kind: 'flow',
    chart: 'running',
    better: 'up',
  },
  views: {
    id: 'views',
    format: 'count',
    kind: 'flow',
    chart: 'running',
    better: 'up',
  },
  followers: {
    id: 'followers',
    format: 'count',
    kind: 'level',
    chart: 'level',
    better: 'up',
  },
  published: {
    id: 'published',
    format: 'count',
    kind: 'flow',
    chart: 'running',
    better: 'up',
  },
}

/** Every measure, in the order a picker offers them. */
export const MEASURE_IDS = Object.keys(MEASURES) as MeasureId[]

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
  /**
   * The band the post's own quality assessment put it in (CON-85).
   *
   * A sleeve like any other — a named subset of the posts — and the only one
   * cut on something we knew *before* publishing. That is what makes it worth
   * having: every other dimension describes the post, this one describes the
   * judgement we made about it, so holding it against results asks whether the
   * judgement was worth anything.
   *
   * It has a card of its own (`QualitySection`) rather than waiting for Side by
   * side, because it is the one sleeve where the interesting cut is *within* the
   * dimension — four elements, each banded — and a single row per sleeve can't
   * show that. When Side by side arrives this dimension works there too, at the
   * coarser overall band.
   */
  | 'quality'

/**
 * Every dimension, in the order a picker offers them. What each is *called* is
 * `analytics.sleeves.<id>` in the catalogue — see the note on {@link MeasureMeta}
 * for why the words are not here.
 */
export const SLEEVE_DIMENSION_IDS: SleeveDimension[] = [
  'platform',
  'account',
  'campaign',
  'format',
  'theme',
  'origin',
  'weekday',
  'quality',
]

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
}

/**
 * How much of the campaign or workspace the numbers actually describe.
 *
 * `measured` is load-bearing rather than decorative: at zero there is nothing
 * to draw, and the card says *no data yet* instead of charting a flat line
 * through a period that hasn't reported. The counts are the switch, not a
 * caption — what the reader sees at the foot of the card is the freshness.
 */
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

/**
 * A post going out, placed on the same timeline the chart is drawn on.
 *
 * Carried apart from `RankedPost` on purpose. The performers card holds the
 * posts it can *rank*, which is a filtered set — a post the platform never
 * reported on, or one too young to place, is missing from it and is exactly the
 * post the reader is trying to account for when a line bends. This is every post
 * that went out, ranked or not, measured or not.
 *
 * ISO rather than the display date `RankedPost` carries: the mark has to line up
 * with a point in a series, which means it has to be the same kind of thing as
 * that point's `date`, not a string a human formatted.
 */
export interface Publication {
  id: string
  /** ISO date, `YYYY-MM-DD`. */
  date: string
  /** What went out — the mark's tooltip, and the reason a mark is worth a hover. */
  title: string
  /** The account it went out on. Absent on a workspace that has only one. */
  account?: string
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
  /**
   * When posts actually went out, drawn as a rail under the chart.
   *
   * The chart says *something moved on the 6th*; only this says *because two
   * posts went out on the 5th*. Without it the reader has to hold the campaign's
   * publishing schedule in their head to read the shape at all, and every bend
   * is equally likely to be a post, a re-share or the platform recounting.
   *
   * It belongs on the temporal view rather than in a card of its own because it
   * is the x-axis of that view annotated, not a second picture: a mark here is
   * only meaningful *against* the line above it.
   */
  publications?: Publication[]
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
 *
 * Each rung is written three ways in the catalogue, under
 * `analytics.outcomes.signal*`, and all three are load-bearing:
 * `signalNoun` names it inside "Measured by …"; `signalShort` is short enough
 * to sit under a figure, because every number carries its rung and 412 read as
 * enquiries when it counts visits is exactly the misreading the ladder exists
 * to prevent; `signalBadge` names the *connection* rather than the count, which
 * is what makes the missing rung obvious.
 */
export type GoalSignal = 'unmeasured' | 'clicks' | 'sessions' | 'conversions'

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
 * Where a post sits against what this workspace normally does. `null` while it
 * is too young — or too thinly seen — for the comparison to say anything.
 */
export type PacePlacement = 'ahead' | 'usual' | 'behind'

/**
 * What "best" and "worst" are being measured by. The rules behind each one live
 * in `criteria.ts`; the ids are here because the view carries a typical value
 * keyed by them.
 */
export type PerformerCriterionId =
  | 'pace'
  | 'reach'
  | 'engagement_rate'
  | 'save_rate'
  | 'follow_rate'

/**
 * The connected account a post went out on.
 *
 * Carried rather than flattened into a platform label because the row leads
 * with the picture: a workspace running four Instagram accounts asks *which
 * one* long before it asks which platform, and the account is also the only
 * thing on the row that says why the same words earned twice as much twice.
 */
export interface PostAccount {
  id: string
  /** The account's own name — `Ogen Dental`, `@ogen`. */
  name: string
  /** Profile picture. Absent falls back to an initial — see `AccountAvatar`. */
  avatarUrl?: string
  /** Our platform id, or the wire slug — see `resolvePlatformInfo`. */
  platform: string
}

/**
 * One post, and everything it has earned so far.
 *
 * This is the rung between a workspace total and a single post — the headline
 * says 184.9K and the only honest follow-up is *from what?* But a straight
 * ranking of that answer is a lie, because a post from this morning has barely
 * begun earning and a post from three weeks ago has finished. Rank them
 * together and the list is sorted by age wearing the clothes of quality; drop
 * the young ones and the section can't answer anything about the work done this
 * week.
 *
 * There are two ways out of that, and the card uses both (see `criteria.ts`):
 *
 * - **Correct for age.** `matured` is the share of its lifetime earning that
 *   has already landed, read off this workspace's own curve; a total divided
 *   through it is where the post lands once it finishes.
 * - **Ask a question age doesn't change.** A ratio — interactions per person
 *   reached, saves per thousand — settles long before a total does, because
 *   both halves of it arrive together. `pace` is the same trick applied to a
 *   total: this post against what a typical post of this workspace had earned
 *   *by the same age*.
 *
 * Which is why the metrics are held as a bag rather than one `value`: the
 * criterion the reader picks decides which of them is being ranked, and a rate
 * needs both its numerator and its denominator on hand.
 */
export interface RankedPost {
  id: string
  title: string
  /**
   * Human, not ISO — `4 Aug 26`. The year is carried even inside a 28-day
   * window: every one of these lists gets screenshotted eventually, and a date
   * with no year is undateable the moment it leaves the screen.
   */
  publishedAt: string
  /** How long it has been earning — `6 hours`, `13 days`. */
  age: string
  /**
   * Where it went out — one account, on one platform.
   *
   * A post sent to four accounts is four rows here, not one. Totalling them
   * would add a LinkedIn impression to an Instagram reach, and the sum is a
   * quantity neither platform defines; worse, it hides the finding, which is
   * that the same words did well on one account and nothing on another.
   */
  account: PostAccount
  maturity: PostMaturity
  /**
   * What it has earned so far, per measure. Absent means *not reported* rather
   * than zero — a platform that doesn't hand back saves must not rank last on
   * saves.
   *
   * `followers` on a post is follows *gained*, not a standing count: the
   * measure is a level everywhere else, and per post it is the only reading
   * that makes sense.
   */
  metrics: Partial<Record<MeasureId, number>>
  /** Share of its lifetime earning already in, 0–1. `1` once settled. */
  matured: number
  /** Against a typical post at the same age: `1` is typical, `2` is twice. */
  pace: number | null
  /**
   * Share of the period's reach, 0–1, on what has actually been earned rather
   * than any projection. The anomaly check: one post at a quarter of the month
   * is the difference between a good month and one lucky afternoon.
   */
  share: number
}

export interface PerformersView {
  /** The window the posts are drawn from — the card names it in its title. */
  period: Period
  /** Every post in the period. Which of them can be ranked is per criterion. */
  posts: RankedPost[]
  /**
   * The maturation curve the age correction is read off — this workspace's own,
   * not an industry benchmark.
   *
   * `null` when there aren't enough finished posts to build one, and that is a
   * real state rather than a missing field: with no curve nothing young can be
   * corrected, so the criteria that lean on it withdraw and the ratios — which
   * never needed it — carry the card.
   */
  curve: { sample: number; confidence: Confidence; floor: string } | null
  /**
   * What this workspace normally does, per criterion. The centre line of every
   * bar on the card, and the reason a figure means anything: 5.0% is a good
   * engagement rate or a poor one depending entirely on this.
   *
   * A criterion missing from here still ranks — it just loses its bar, and the
   * column says so rather than drawing a comparison against nothing.
   */
  typical: Partial<Record<PerformerCriterionId, number>>
  insights: Insight[]
}

/* --------------------------------------------------------------- quality -- */

/**
 * What the pre-publish quality check made of a post (CON-85), reduced to what
 * analytics needs.
 *
 * The assessment is a *prediction*, made from the words alone before anything
 * was published, which is why it can never be a `MeasureId`: nothing about it
 * is measured, and putting it in a row of tiles beside reach would invite it to
 * be read as an outcome. It is a property of the post — a sleeve — and the only
 * honest question to ask of it is whether it agreed with what happened next.
 *
 * `overall` is the backend's weighted roll-up and is never recomputed here: the
 * weights are keyed by the post's type and live on the server (see
 * `types/quality.ts`).
 */
export interface PostQuality {
  /** 0–100. The weighted overall, as stored. */
  overall: number
  /** 0–10 per element, as the model scored them. */
  scores: Record<QualityDimensionKey, number>
  /**
   * The post was edited after it was scored, so the score describes a draft
   * that is not what went out.
   *
   * Carried rather than filtered upstream because the card has to *say* it: a
   * post silently dropped from a comparison is a post the reader goes looking
   * for. Excluded from every figure, counted in the note at the foot.
   */
  stale?: boolean
}

/** A ranked post that also carries what we thought of it before it went out. */
export type ScoredPost = RankedPost & { quality: PostQuality }

/**
 * Quality against results — did the score predict anything?
 *
 * **Outside the date lens, unlike every other card built on posts.** Whether a
 * scoring element earns its keep is a property of this campaign's content, not
 * of the last 28 days; and the sample makes the point on its own, because a
 * 28-day window on a campaign holds six to fourteen posts and this card needs
 * several in each of three bands before it may say anything at all. Windowing
 * it would produce a card that is permanently too thin and occasionally, on a
 * busy month, confidently wrong.
 *
 * The two counts beside `posts` are states the card has to distinguish, and
 * neither is zero: never scored and scored-but-nothing-back-yet are different
 * reasons for a post to be absent from the comparison, and each sends the
 * reader somewhere different. The third reason — scored against words that have
 * since changed — stays *in* `posts`, flagged, because a post silently dropped
 * is a post the reader goes looking for.
 */
export interface QualityView {
  /**
   * Every post of this campaign that was scored *and* has reported figures —
   * the only posts that can be in the comparison at all.
   */
  posts: ScoredPost[]
  /** Scored, published, and the platforms have not reported yet. */
  awaiting: number
  /** Published and never scored. */
  unscored: number
  /**
   * The maturation curve, on the same terms as `PerformersView.curve`. The
   * bands hold posts of wildly different ages by construction, so what they are
   * compared on has to survive that: `null` retires the criteria that need
   * correcting and leaves the ratios, exactly as it does on the performers card.
   */
  curve: { sample: number; confidence: Confidence; floor: string } | null
  /** What this workspace normally does, per criterion. */
  typical: Partial<Record<PerformerCriterionId, number>>
  insights: Insight[]
}

/* ------------------------------------------------------- platform filter -- */

/**
 * One platform the workspace can publish to, with how much of it is actually
 * wired up.
 *
 * The account count is not decoration. "Instagram" in a filter means something
 * different when it is one account and when it is four, and a workspace whose
 * Facebook figure looks thin usually has one page connected out of three. The
 * number is the difference between "Facebook is not working" and "we are only
 * looking at a third of Facebook".
 */
export interface PlatformOption {
  /** Our platform id, or the wire slug — see `resolvePlatformInfo`. */
  id: string
  label: string
  /** Connected accounts. `0` means the platform is offered but not wired up. */
  accounts: number
}

/** Which surface a composition is rendering. */
export type AnalyticsScope =
  | { kind: 'workspace'; label: string }
  | { kind: 'campaign'; label: string; campaignId: string; evergreen: boolean }

/** Everything a workspace or campaign surface renders, once settled. */
export interface AnalyticsData {
  /**
   * Everything the surface *could* be counting. Which of them it is actually
   * counting is UI state, held above the surface — the filter is overarching,
   * so it cannot belong to any one section's view.
   */
  platforms: PlatformOption[]
  now: NowView
  outcomes: OutcomesView
  performers: PerformersView
  quality: QualityView
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
 *
 * It is also what decides *what a figure is held against*: a post that is still
 * counting is compared with what a typical post had earned **by the same age**,
 * never with the range finished posts land in. See `PostMetric.typical`.
 */
export type PostMaturity = 'unpublished' | 'counting' | 'settling' | 'final'

/**
 * One measure on one post, with the two things that make the number readable.
 *
 * A bare "18,420" is unreadable — the reader has no idea whether that is a good
 * afternoon or a career best. `typical` answers *how does this compare with what
 * we normally do*, `expected` answers *is it outside our usual range at all*;
 * they are the same pair the campaign card's tiles carry, so the two cards read
 * identically. Both are optional because a workspace three weeks old has neither.
 */
export interface PostMetric {
  measure: MeasureId
  value: number
  /**
   * What a typical post of this workspace has on the same measure.
   *
   * **Age-corrected while the post is still counting** — a four-hour-old post
   * held against the totals of finished posts is the age lie with extra steps,
   * so for `counting` and `settling` this is what a typical post had earned by
   * the same age (the workspace's own maturation curve, applied to its typical
   * final figure). Rates are the exception: an engagement rate is roughly itself
   * from the first hour, so it is compared with the plain typical throughout.
   */
  typical?: number
  /** The range this workspace's posts normally land in, on the same basis. */
  expected?: { low: number; high: number }
}

/**
 * How a post's own history is read — the one control a measure card carries.
 *
 * Three answers on one switch rather than a mode and a bucket on two, because
 * the reader is picking a **picture**, not composing one out of two settings.
 * The pair was honest and unusable: the bucket had no effect on a running total,
 * so it had to appear and disappear, and a control that comes and goes is a
 * control people stop trusting.
 *
 * - `total` — the running total since publishing. Answers *what has it earned*,
 *   and its last point is the figure above the chart. That correspondence is
 *   why it is the default.
 * - `hour` — what arrived in each hour. Answers *when did it earn it*, which is
 *   the reading that shows a post still moving, the hour it peaked, and the
 *   re-share on day three. Almost everything a post earns arrives in its first
 *   day, so this is the granularity the question is actually asked at.
 * - `day` — the same, for the other end: a post three weeks old has five hundred
 *   hourly buckets and a flat tail, and nobody reads that.
 */
export type PostSeriesReading = 'total' | 'hour' | 'day'

/** The bucket a reading is summed into. Derived from it, never chosen apart. */
export type PostInterval = 'hour' | 'day'

/**
 * Whether a chart shows the running total or what arrived in each bucket.
 *
 * The two answer different questions and neither substitutes for the other,
 * which is why the switch above offers both rather than picking one: a running
 * total that flattens and an hourly reading that has gone quiet are the same
 * fact, and only one of them is legible at a glance.
 */
export type PostSeriesMode = 'cumulative' | 'interval'

/** The mode and bucket a reading resolves to. */
export function readingShape(reading: PostSeriesReading): {
  mode: PostSeriesMode
  interval: PostInterval
} {
  return {
    mode: reading === 'total' ? 'cumulative' : 'interval',
    // A running total is drawn from hourly buckets: the bucket only decides how
    // many points the line is made of, and the finer one draws the smoother line.
    interval: reading === 'day' ? 'day' : 'hour',
  }
}

export interface PostSeriesPoint {
  /** ISO timestamp at the **end** of the bucket. */
  at: string
  /** Hours since publishing at the end of the bucket. */
  hour: number
  /**
   * What arrived **in this bucket** — never a running total.
   *
   * Held as the interval value in one direction only: a running total can be
   * derived from buckets, buckets cannot be recovered from a running total
   * without knowing it was never revised, and platforms do revise. The raw
   * thing is what gets carried; everything else on screen is computed from it.
   */
  value: number
}

/**
 * One measure's history on one post, in hourly buckets since publishing.
 *
 * **Flows only.** A rate has no bucket value that can be summed or accumulated —
 * "cumulative engagement rate" is the mistake `MeasureMeta.kind` exists to
 * prevent — so the rate chart is recomputed from interactions and reach at
 * whatever bucketing is on screen rather than carried as a series of its own.
 * That also makes it impossible for the rate chart to disagree with the two
 * charts above it.
 *
 * **Nothing exposes this yet.** The rows are there — Zernio is swept every
 * thirty minutes and the snapshots are kept for ninety days, which is finer than
 * the hour this is bucketed to — but no endpoint hands back the history, only
 * the latest figures. This shape is the ask: `GET /api/analytics/posts/:id/series`
 * with a granularity, over the snapshot table.
 */
export interface PostSeries {
  measure: MeasureId
  points: PostSeriesPoint[]
}

/**
 * A post's own numbers — everything the post surface is built from.
 *
 * One view behind several cards rather than one card: which post this is, then
 * an overview carrying every figure it reported and what we make of them, then a
 * card per measure with its own history and its own switch for how to read it.
 * They are cards for the same reason the campaign's sections are — a card is a
 * promise that its number is maintained, and a measure the platform never
 * reported simply has no card rather than a gap inside one.
 *
 * The tiles, the insight boxes and the note at the foot are the campaign's, on
 * purpose: a post is a campaign of one, and giving the smallest surface its own
 * visual language meant two things to learn and two places for the copy to
 * drift apart. Only what is compared differs — a post has no previous period, so
 * every figure is held against a typical post of yours instead.
 *
 * What it does *not* carry is a per-account breakdown. This screen is one post,
 * and a post that went to four accounts is four rows on the campaign's
 * performers card, where a row is already one post on one account — see
 * `RankedPost.account`.
 */
export interface PostPerformanceView {
  maturity: PostMaturity
  /** Which post this is. The first card, and the only one that never withdraws. */
  post: PostIdentity
  /**
   * How long the figures cover — `4 hours`, `26 hours`, `12 days`.
   *
   * The post's age, said as a span rather than as a date, because that is the
   * question the figures raise: 7,210 reach is a different post at four hours
   * than at three weeks. It sits in the card's header, which is the beat that
   * owns *the window this card is describing* — the same slot the campaign uses
   * for "over last 28 days".
   *
   * Distinct from `post.publishedAgo`, which reads the same and answers
   * something else: one is when it went out, the other is how long it has been
   * earning. They are the same number today and stop being it the moment a
   * platform stops reporting on a post that is still live.
   */
  measuredOver?: string
  /**
   * Rank against this workspace's own history, 0–100. `null` under sample, and
   * `null` while the post is still counting — a rank against finished posts is
   * the one comparison age correction cannot rescue.
   */
  percentile: number | null
  metrics: PostMetric[]
  /** How many measured posts the comparisons are read off. */
  sample?: number
  /**
   * This post's own history, one entry per measure it was reported on.
   *
   * Empty is a real state and not an error: a post published before the sweep
   * started, or one whose platform only ever hands back a current total, has
   * figures and no history. The card drops the charts and says so rather than
   * drawing a line through two points.
   *
   * What used to sit here was the *workspace's* maturation curve with a marker
   * for this post — a stand-in for a series nothing exposed. It was the same
   * picture on every finished post, so it said nothing about the post it was on.
   */
  series: PostSeries[]
  /** Why it did what it did. The percentile line is derived, not carried. */
  insight: Insight | null
  /** When these numbers last moved — the note at the foot, as on every card. */
  lastRefreshedAt?: string
}

/**
 * Which post this is — the answer to the question every figure below it is
 * useless without.
 *
 * It gets a card, first, above the overview. A percentile and a delta are
 * claims about *a* post, and a screen that opens on "Better than 94% of your
 * posts" without saying which post, where it went, or when, is a screen that
 * cannot be screenshotted, sent to anyone, or argued with. The analytics cards
 * are all conditional — they withdraw when there is no history, no sample,
 * nothing reported — and this one never is: it is true the moment the post
 * exists, which is why it can hold the top of the surface.
 *
 * Every field here is display-ready. The formatting lives wherever the post is
 * loaded, so this stays the same shape whether it came from the post editor's
 * document or from an analytics response.
 */
export interface PostIdentity {
  /** The post's own title, or the first line of its caption. */
  title: string
  /** Platform slug or sqid — anything `resolvePlatformInfo` answers to. */
  platform: string
  /** The handle it actually went out as. "Instagram" is not an account. */
  account: string
  /** Reel, Single image, Carousel — what the platform received. */
  format: string
  /**
   * Absolute and local — `14 Aug 2026, 09:15`.
   *
   * Carried beside the relative age rather than instead of it, because they
   * answer different questions: "4 hours ago" is how much of this post's life
   * is still ahead of it, and the date is the only part that survives a
   * screenshot.
   */
  publishedOn?: string
  /** Human, never ISO — `12 days ago`, `4 hours ago`. */
  publishedAgo?: string
  /** For a post that hasn't gone yet. Absent means not scheduled either. */
  scheduledFor?: string
  /** The campaign it belongs to, named rather than linked-to-and-unnamed. */
  campaign?: string
  /** Where it lives on the platform, for the reader who wants the real thing. */
  permalink?: string
}
