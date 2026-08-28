/**
 * The analytics surface the API exposes under `/api/analytics` (CON-93 §7,
 * extended by CON-125, CON-153 and the CON-236–239 dashboard). Mirrors the Go
 * shapes in `models/post_analytics.go`, `repository/post_analytics.go` and the
 * `analytics/{overview,performers,learnings}` packages.
 *
 * Three kinds of endpoint live behind that prefix, and they behave differently
 * when something is missing:
 *
 * - **The stored post list** (`/posts`) is served from the isolated analytics
 *   database. When the deployment runs without one it answers **503** rather
 *   than an empty body — "we don't know", not "zero". It is the only endpoint
 *   here that still does.
 * - **Live insights** (`/best-times`, `/content-decay`, `/posting-frequency`,
 *   `/followers`) proxy or read per request and always answer 200, wrapping the
 *   payload in {@link InsightEnvelope} with `available: false` when the tenant
 *   has no profile or lacks the Analytics add-on.
 * - **The dashboard** (`/overview`, `/performers`, `/learnings`) uses that same
 *   envelope, and adds `no_data` to its reasons — the workspace is configured
 *   and simply hasn't published anything the window can describe.
 *
 * CON-236 reworked the storage under all of this without changing a field:
 * `last_refreshed_at` is now the internal `last_checked_at`, so freshness
 * survives the change-detection dedup that keeps the trend table honest.
 *
 * What the wire still has no answer for: a **campaign** dimension (nothing here
 * takes a `campaign_id`) and a **per-post series** (the snapshot history is
 * written and retained, but no endpoint reads it). Both are what
 * `campaign-analytics` is waiting on.
 */

/** The engagement block, identical on a post row and inside a platform row. */
export type AnalyticsMetrics = {
  impressions: number
  reach: number
  likes: number
  comments: number
  shares: number
  saves: number
  clicks: number
  views: number
  /** A fraction, not a percentage: 0.031 is 3.1%. */
  engagement_rate: number
}

/**
 * One post's numbers, as of the last refresh sweep.
 *
 * `platform` and `title` are denormalised into the analytics database at
 * refresh time (the read can't join across databases), so they describe the
 * post as it was when it was measured — a post renamed since will still carry
 * its old title here.
 */
export type PostAnalyticsItem = {
  post_id: string
  publisher_post_id: string
  title: string
  publisher: string
  platform: string
  published_at: string | null
  sync_status: string
  /** The publisher's own "numbers computed at"; with `last_refreshed_at` it
   *  tells stale numbers from a stale fetch. */
  metrics_last_updated: string | null
  last_refreshed_at: string
  analytics: AnalyticsMetrics
}

/** Summed over the whole filtered set, not just the returned page. */
export type PostAnalyticsOverview = {
  post_count: number
  impressions: number
  reach: number
  likes: number
  comments: number
  shares: number
  saves: number
  clicks: number
  views: number
  engagement_rate_avg: number
}

export type AnalyticsPagination = {
  page: number
  limit: number
  total: number
  pages: number
}

export type PostAnalyticsList = {
  items: PostAnalyticsItem[]
  pagination: AnalyticsPagination
  overview: PostAnalyticsOverview
}

/** The closed set the server accepts; anything else is a 400. */
export type PostAnalyticsSort =
  | 'engagement'
  | 'impressions'
  | 'reach'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'saves'
  | 'clicks'
  | 'views'
  | 'published_at'

/**
 * How every endpoint but `/posts` answers. They never fail for a tenant that
 * simply isn't set up: `available: false` with a `reason` is the normal answer,
 * so a caller renders an explanation rather than an error.
 *
 * The reasons in circulation are `not_configured` (no Zernio profile, or this
 * deployment has no analytics database), `addon_required` (the tenant's Zernio
 * plan lacks the Analytics add-on) and — new with CON-237/238/239 —
 * **`no_data`**, which is not a fault at all: the workspace is wired up and has
 * published nothing the window can describe. `reason` stays a plain string
 * because the server is free to add one, and a caller that has to narrow it
 * must handle the value it has never heard of by explaining rather than
 * crashing.
 *
 * Note the asymmetry this leaves: `/posts` alone still answers **503** when the
 * deployment has no analytics database, so a screen that reads both has two
 * unavailabilities to tell apart — see `isAnalyticsUnavailable` and
 * `envelopeUnavailable` in `services/api/analytics`.
 */
export type InsightEnvelope<T> = {
  available: boolean
  reason?: string
  data: T | null
}

/* ------------------------------------------------ the dashboard endpoints -- */

/**
 * The wire shapes behind `/api/analytics/{overview,performers,learnings}`
 * (CON-237/238/239, landed 2026-08-27). Mirrors `analytics/overview`,
 * `analytics/performers` and `analytics/learnings` in the Go repo.
 *
 * Two things about them that catch a client out, said once here:
 *
 * - **Everything is tenant-scoped.** None of the three takes a `campaign_id`,
 *   and only `/performers` takes a `platform`. A campaign screen still cannot
 *   ask the server its own question — which is why `campaign-analytics` is
 *   still off.
 * - **Every window is resolved by the server and echoed back.** Never re-derive
 *   the dates from the shorthand that was sent: `28d` includes today, so its
 *   `from` is 27 days back, and a client that computes its own labels drifts by
 *   a day the first time it runs near midnight UTC.
 */

/** The server's resolved window. `granularity` is on `/overview` only. */
export type AnalyticsWindow = {
  /** Inclusive, `YYYY-MM-DD`. */
  from: string
  /** Inclusive, `YYYY-MM-DD` — the server has already subtracted the day. */
  to: string
  days: number
  granularity?: 'day' | 'week' | 'month'
}

/**
 * One deterministic callout. No model wrote this: the rules are pure predicates
 * over the window's aggregates (`analytics/insights`), which is why the text is
 * English from the server rather than a key.
 *
 * `severity` is **not** polarity — `info` and `note` say how loudly to render a
 * sentence, not whether its news is good. Nothing on the wire says that, so a
 * surface that colours insights has to decide from the id.
 */
export type AnalyticsInsight = {
  id: string
  severity: 'info' | 'note'
  text: string
  /** An optional second line. */
  note?: string
}

/** The five the overview reports. There is no series for anything else. */
export type OverviewMetric =
  | 'reach'
  | 'interactions'
  | 'engagement_rate'
  | 'followers'
  | 'posts_published'

export type OverviewCard = {
  metric: OverviewMetric
  /** Server-authored English ("Cumulative reach"). Not a catalogue key. */
  label: string
  value: number
  /** Already a percentage, to one decimal — `12.4` is +12.4%, not 0.124. */
  delta_pct: number
  /** From `delta_pct` with a ±0.5% dead band, so `flat` is a real answer. */
  direction: 'up' | 'down' | 'flat'
  /**
   * `insufficient_history` until a tenant has accrued enough prior windows —
   * which is every tenant today, so the usual-range band is never drawn yet.
   */
  baseline: string
  /** The same array as `series[metric].current`. */
  sparkline: number[]
}

/** One bucket's usual range. Absent from every response until baselines exist. */
export type OverviewBand = {
  lower: number
  upper: number
}

export type OverviewSeries = {
  /** ISO date of each bucket's start. */
  buckets: string[]
  current: number[]
  /**
   * The previous window, **index-aligned to `buckets`** rather than carrying
   * its own dates: it is drawn as a ghost behind the current line, so day 3 of
   * then sits under day 3 of now. Labelling these points with `buckets[i]` is
   * therefore wrong by exactly one window.
   */
  previous: number[]
  band?: OverviewBand[]
}

export type AnalyticsOverview = {
  window: AnalyticsWindow
  /**
   * The newest `last_checked_at` across the rows behind this answer — when Ogen
   * last *looked*, not when the numbers last moved. The Go zero time
   * (`0001-01-01T00:00:00Z`) means nothing has ever been checked.
   */
  updated_at: string
  cards: OverviewCard[]
  series: Record<OverviewMetric, OverviewSeries>
  insights: AnalyticsInsight[]
}

/** What `/performers` will rank by. Anything else is a 400 `invalid_sort`. */
export type PerformerSort =
  | 'against_typical'
  | 'reach'
  | 'engagement_rate'
  | 'interactions'

/**
 * The account a row went out on. Every field is omitted when empty, and
 * `display_name`/`avatar_url` are not populated yet — the server fills
 * `display_name` from the username and leaves the avatar out (enrichment from
 * `social_accounts` is a follow-up), so a row's picture has to fall back.
 *
 * The **platform is not here**: it is `PerformerRow.platform`, one level up.
 */
export type PerformerAccount = {
  id?: string
  username?: string
  display_name?: string
  avatar_url?: string
}

export type PerformerMetrics = {
  impressions: number
  likes: number
  comments: number
  shares: number
  engagement_rate: number
}

export type PerformerRow = {
  post_id: string
  publisher_post_id: string
  title: string
  /** The wire slug (`linkedin`), not our platform id. */
  platform: string
  account: PerformerAccount
  /** Reach is the headline and sits outside `metrics`, which holds the rest. */
  reach: number
  /** The post is younger than three days, so its total is still moving. */
  reach_still_accruing: boolean
  /** Share of the window's reach, 0–1. */
  period_share: number
  metrics: PerformerMetrics
  /**
   * Against the typical post on this platform *at the same age* — 1 is typical,
   * 2 is twice. `null` when the platform has fewer than three measured posts to
   * build a curve from; those rows carry `baseline: "insufficient_history"` and
   * were ranked on the raw metric instead.
   */
  against_typical: number | null
  /** Present only alongside a multiplier. */
  direction?: 'above' | 'typical' | 'below'
  /** Present only *instead of* one. */
  baseline?: string
  /** RFC3339. */
  published_at: string
  age_days: number
}

/**
 * Best and worst for the window.
 *
 * `best` and `worst` are capped at `limit` (default 5, clamped to 20) and do not
 * overlap; `total_posts` is how many the window actually held. There is no way
 * to ask for the middle, so re-ranking by another criterion is a refetch with a
 * different `by`, never a client-side sort.
 */
export type PerformersBoard = {
  window: AnalyticsWindow
  updated_at: string
  by: PerformerSort
  total_posts: number
  best: PerformerRow[]
  worst: PerformerRow[]
  insights: AnalyticsInsight[]
}

/** What `/learnings` mines. Anything else is a 400 `invalid_param`. */
export type LearningsMetric = 'reach' | 'saves'

/**
 * A section that can withdraw on its own.
 *
 * Each of the three degrades independently — a workspace can have a heatmap and
 * no lifespan curve — and it says so by sending `{ "insufficient_history": true }`
 * with every other field omitted, which is why the section is a union rather
 * than a bag of optionals. Narrow it with `hasHistory` before reading anything.
 */
export type LearningsSection<T> = { insufficient_history: true } | T

export type HeatmapCell = {
  /** **0 = Sunday**, matching `/best-times` — not Monday-first. */
  day_of_week: number
  /** UTC. */
  hour: number
  /** 0–1, relative to the strongest slot. */
  score: number
  post_count: number
  median: number
}

export type HeatmapSlot = {
  day_of_week: number
  hour: number
  post_count: number
}

/**
 * The cells are **sparse** — one per slot that has a post, not 168 — so a grid
 * has to be built by the caller and the empty slots are absent rather than zero.
 */
export type LearningsHeatmap = {
  metric: string
  cells: HeatmapCell[]
  /** Absent when no slot stands out. */
  strongest?: HeatmapSlot
  measured_posts: number
}

export type LifespanPoint = {
  age_hours: number
  /** 0–1 of everything the post finally earned. */
  share_of_final: number
}

export type LearningsLifespan = {
  settled_posts: number
  t50_hours: number
  t75_hours: number
  t95_hours: number
  /** How far the curve was computed — the last `age_hours` on it. */
  horizon_hours: number
  curve: LifespanPoint[]
}

/**
 * One structural finding. Structural is the point: the mining is over media
 * format, length, hashtags, links, weekday and platform — never over what a
 * post said — so `dimension`/`segment` are a closed vocabulary the server owns
 * and `headline` is its English for the pair.
 */
export type LearningsPattern = {
  id: string
  /** `media_format`, `content_length`, `hashtag_count`, `has_link`, `posting_time`, `platform`. */
  dimension: string
  segment: string
  headline: string
  metric: string
  /** Against the rest of the workspace, e.g. 1.4 = 40% better. `works` only. */
  lift?: number
  /** Movement across the trend window. `fading` only. */
  trend?: number
  /** Posts behind it. */
  support: number
  detail: string
}

export type LearningsPatterns = {
  works?: LearningsPattern[]
  fading?: LearningsPattern[]
}

export type LearningsScope = {
  /** `YYYY-MM-DD`, or `null` for all-time. */
  since: string | null
  trend_window_days: number
  measured_posts: number
  settled_posts: number
  metric: LearningsMetric
}

export type AnalyticsLearnings = {
  scope: LearningsScope
  updated_at: string
  heatmap: LearningsSection<LearningsHeatmap>
  lifespan: LearningsSection<LearningsLifespan>
  patterns: LearningsSection<LearningsPatterns>
}
