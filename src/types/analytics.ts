/**
 * The analytics surface the API exposes under `/api/analytics` (CON-93 §7,
 * extended by CON-125 and CON-153). Mirrors the Go shapes in
 * `models/post_analytics.go` and `repository/post_analytics.go`.
 *
 * Two kinds of endpoint live behind that prefix, and they behave differently
 * when something is missing:
 *
 * - **Stored series** (`/posts`, `/followers`) are served from the isolated
 *   analytics database. When the deployment runs without one, every read
 *   answers **503** rather than an empty body — "we don't know", not "zero".
 * - **Live insights** (`/best-times`, `/content-decay`, `/posting-frequency`)
 *   proxy Zernio per request and always answer 200, wrapping the payload in
 *   {@link InsightEnvelope} with `available: false` when the tenant has no
 *   profile or lacks the Analytics add-on.
 *
 * Only the stored post series is consumed today — see `services/api/analytics`.
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
 * How the three live-proxy insight endpoints answer. They never fail for a
 * tenant that simply isn't set up: `available: false` with a `reason`
 * (`not_configured`, `addon_required`) is the normal answer, so a caller
 * renders an explanation rather than an error.
 */
export type InsightEnvelope<T> = {
  available: boolean
  reason?: string
  data: T | null
}
