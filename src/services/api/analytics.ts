import { apiJson } from './http'
import { ApiError } from './errors'
import type { PostAnalyticsList, PostAnalyticsSort } from '@/types/analytics'

const BASE = '/api/analytics'

/**
 * Filters `GET /api/analytics/posts` accepts. Note what is *not* here: there
 * is no campaign, account or date filter on the server, so a campaign-scoped
 * view has to narrow the workspace-wide answer itself — see
 * `lib/campaignAnalytics`.
 */
export type PostAnalyticsQuery = {
  page?: number
  /** Server caps this at 100 whatever we ask for. */
  limit?: number
  sortBy?: PostAnalyticsSort
  order?: 'asc' | 'desc'
  /** Platform *name* (e.g. "instagram"), not the platform id. */
  platform?: string
}

function queryString(query: PostAnalyticsQuery): string {
  const params = new URLSearchParams()
  if (query.page !== undefined) params.set('page', String(query.page))
  if (query.limit !== undefined) params.set('limit', String(query.limit))
  if (query.sortBy) params.set('sort_by', query.sortBy)
  if (query.order) params.set('order', query.order)
  if (query.platform) params.set('platform', query.platform)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/**
 * One page of per-post engagement, newest snapshot per post, plus the totals
 * over the whole filtered set.
 *
 * Served entirely from the analytics database — no publisher call on the
 * request path — so this is cheap enough to load beside a page rather than
 * behind a click. Posts that have never been through a refresh sweep are
 * absent rather than zeroed; the list covers what has been *measured*, which
 * is a smaller set than what has been published.
 */
export async function listPostAnalytics(
  query: PostAnalyticsQuery = {},
): Promise<PostAnalyticsList> {
  return apiJson<PostAnalyticsList>(
    `${BASE}/posts${queryString(query)}`,
    'Unable to fetch analytics',
  )
}

/**
 * The exact message the Go handler sends with its no-analytics-database 503
 * (`handlers/analytics.go`, CON-125 Track B). Matched verbatim: the status
 * alone can't be trusted, because a proxy or gateway also answers 503 during
 * a redeploy — and that body never parses to this message, so it falls
 * through to the request's fallback text.
 */
const UNAVAILABLE_MESSAGE = 'analytics is not available'

/**
 * Whether a failure means "this deployment has no analytics database" rather
 * than "the request went wrong".
 *
 * The server fails open with a 503 when `ANALYTICS_DSN` is unset (CON-125
 * Track B), which is a normal configuration, not a fault — the UI explains it
 * instead of reporting an error the user can't act on. Anything else — a
 * transient 503 from the platform included — is a real failure and must be
 * reported as one, not presented as a permanent workspace state.
 */
export function isAnalyticsUnavailable(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 503 &&
    error.message === UNAVAILABLE_MESSAGE
  )
}
