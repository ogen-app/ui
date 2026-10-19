import { apiJson } from './http'
import {
  demoLearnings,
  demoMode,
  demoOverview,
  demoPerformers,
} from './analytics.demo'
import type {
  AnalyticsLearnings,
  AnalyticsOverview,
  InsightEnvelope,
  LearningsMetric,
  LearningsSection,
  PerformerSort,
  PerformersBoard,
} from '@/types/analytics'

const BASE = '/api/analytics'

/**
 * Whether this browser has asked to be served simulated numbers instead.
 *
 * Unlike the `STUBBED` constant in `tiers.stub.ts`, these three endpoints exist
 * and answer — the demo is for a dev machine whose analytics database has never
 * seen a refresh sweep, so every card is stuck in its setup state. It is off by
 * default, has to be asked for with `?analytics=demo`, and folds away entirely
 * in a production build. See `analytics.demo.ts`.
 */
function demo(): boolean {
  return demoMode() !== 'live'
}

/**
 * The window every dashboard read is asked for, in the server's own vocabulary.
 *
 * `from`/`to` win over `window` and must be sent together — one alone is a 400.
 * Neither is defaulted here: the server's own default (28 days, ending today,
 * UTC) is the one thing a client must not reimplement, because "today" is a
 * question about the server's clock.
 */
export type AnalyticsWindowQuery = {
  /** `28d`, `12w`, `6mo`. Beyond 400 days the server answers `window_too_large`. */
  window?: string
  /** Inclusive `YYYY-MM-DD`. Only meaningful with `to`. */
  from?: string
  /** Inclusive `YYYY-MM-DD`. Only meaningful with `from`. */
  to?: string
}

function windowParams(query: AnalyticsWindowQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.window) params.set('window', query.window)
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  return params
}

/**
 * The platforms a dashboard read is narrowed to (CON-289), as Zernio slugs.
 *
 * Repeated rather than joined — `?platform=linkedin&platform=instagram` — and
 * the union of them. Empty or absent sends nothing, which is *every* platform:
 * never spell "all" out as the full list, or a platform connected later is left
 * out of a view that claims to be the whole workspace. A slug the server does
 * not know is a 400 `invalid_platform` for the whole request, not a widening.
 */
export type AnalyticsPlatformQuery = {
  platforms?: readonly string[]
}

function appendPlatforms(
  params: URLSearchParams,
  query: AnalyticsPlatformQuery,
): URLSearchParams {
  for (const slug of query.platforms ?? []) params.append('platform', slug)
  return params
}

/**
 * The campaign a dashboard read is narrowed to (CON-288), or none for the whole
 * workspace — which is sent as no parameter, so an un-narrowed read is
 * byte-identical to one from before the dimension existed.
 *
 * Only `/overview` and `/performers` take it. `/learnings` answers **400
 * `campaign_scope_unsupported`** to any value: a lesson mined from one
 * campaign's history is a much thinner claim than a workspace's, so the server
 * keeps lessons workspace-wide and {@link LearningsQuery} has no field for it.
 * A campaign this workspace doesn't have is a **404**, whatever the id looks
 * like — ids are sqids, so a garbled one is simply not found.
 */
export type AnalyticsCampaignQuery = {
  campaignId?: string | null
}

function appendCampaign(
  params: URLSearchParams,
  query: AnalyticsCampaignQuery,
): URLSearchParams {
  if (query.campaignId) params.set('campaign_id', query.campaignId)
  return params
}

function search(params: URLSearchParams): string {
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/**
 * Whether an answer means "there is nothing to show" rather than "here it is".
 *
 * The dashboard endpoints never fail for a workspace that isn't set up or
 * hasn't published: they answer 200 with `available: false` and a reason, which
 * is a state to explain and not an error to retry. Compare
 * {@link isAnalyticsUnavailable}, which is the *other* half of the same idea —
 * `/posts` alone still says it with a 503.
 */
export function envelopeUnavailable(
  envelope: InsightEnvelope<unknown>,
): boolean {
  return !envelope.available || envelope.data === null
}

/**
 * Whether a learnings section has enough history to be read.
 *
 * Each of the three withdraws on its own, so this is asked per section rather
 * than once for the response — a workspace can know when to post and not yet
 * know how long a post lives.
 */
export function hasHistory<T>(section: LearningsSection<T>): section is T {
  return !(
    typeof section === 'object' &&
    section !== null &&
    'insufficient_history' in section &&
    (section as { insufficient_history?: boolean }).insufficient_history ===
      true
  )
}

/**
 * The whole windowed dashboard in one read: five KPI cards, a series per
 * metric, and the deterministic callouts (CON-237).
 *
 * Narrowed by platform like the other two (CON-289), and by campaign
 * (CON-288) — except the followers card, which stays workspace-wide because
 * followers belong to accounts rather than campaigns; the answer says so in
 * `followers_scope`. `granularity` is deliberately not exposed: the server
 * buckets weekly past 90 days on its own, and forcing `week` on a short window
 * produces four points where the reader expects twenty-eight.
 */
export type OverviewQuery = AnalyticsWindowQuery &
  AnalyticsPlatformQuery &
  AnalyticsCampaignQuery

export async function fetchAnalyticsOverview(
  query: OverviewQuery = {},
): Promise<InsightEnvelope<AnalyticsOverview>> {
  if (demo()) return demoOverview(query)
  return apiJson<InsightEnvelope<AnalyticsOverview>>(
    `${BASE}/overview${search(appendCampaign(appendPlatforms(windowParams(query), query), query))}`,
    'Unable to fetch analytics',
  )
}

export type PerformersQuery = AnalyticsWindowQuery &
  AnalyticsPlatformQuery &
  AnalyticsCampaignQuery & {
    /** Default `against_typical`. Anything outside the union is a 400. */
    by?: PerformerSort
    /** Rows *per list*, not in total. Clamped to 20. */
    limit?: number
  }

/**
 * The window's best and worst posts, each scored against the typical post on
 * its platform at the same age (CON-238).
 *
 * Ranking is the server's: `best`/`worst` come back already ordered under `by`,
 * and the middle of the distribution is never sent, so switching criterion is a
 * refetch rather than a re-sort.
 *
 * Under a campaign the board ranks only that campaign's posts, but
 * `against_typical` is still measured against the **workspace's** typical post —
 * "2.1×" means twice your usual post, not twice the campaign's average.
 */
export async function fetchPerformers(
  query: PerformersQuery = {},
): Promise<InsightEnvelope<PerformersBoard>> {
  if (demo()) return demoPerformers(query)
  const params = windowParams(query)
  if (query.by) params.set('by', query.by)
  if (query.limit !== undefined) params.set('limit', String(query.limit))
  appendPlatforms(params, query)
  appendCampaign(params, query)
  return apiJson<InsightEnvelope<PerformersBoard>>(
    `${BASE}/performers${search(params)}`,
    'Unable to fetch analytics',
  )
}

export type LearningsQuery = AnalyticsPlatformQuery & {
  /** Lower bound, `YYYY-MM-DD`. Omitted means all-time. */
  since?: string
  /** `90d`, `12w`, `6mo` — the comparison window for what's fading. */
  trendWindow?: string
  metric?: LearningsMetric
}

/**
 * What the workspace has learned, over all of its history (CON-239).
 *
 * Deliberately *not* windowed with the rest of the dashboard: "your posts land
 * on Tuesday evenings" is not a fact about the last 28 days, and putting it
 * under the same date control would imply it is. `since` exists to cut off a
 * past the workspace has disowned, not to make this a period view.
 *
 * The platform filter *does* reach it, and the server narrows before its
 * minimum-support floors run — so a single platform's thin history comes back
 * as `insufficient_history` per section rather than as a lesson from a handful
 * of posts.
 */
export async function fetchLearnings(
  query: LearningsQuery = {},
): Promise<InsightEnvelope<AnalyticsLearnings>> {
  if (demo()) return demoLearnings(query)
  const params = new URLSearchParams()
  if (query.since) params.set('since', query.since)
  if (query.trendWindow) params.set('trend_window', query.trendWindow)
  if (query.metric) params.set('metric', query.metric)
  appendPlatforms(params, query)
  return apiJson<InsightEnvelope<AnalyticsLearnings>>(
    `${BASE}/learnings${search(params)}`,
    'Unable to fetch analytics',
  )
}
