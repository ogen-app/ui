import { apiJson } from "./http";
import { ApiError } from "./errors";
import type {
  AnalyticsLearnings,
  AnalyticsOverview,
  InsightEnvelope,
  LearningsMetric,
  LearningsSection,
  PerformerSort,
  PerformersBoard,
  PostAnalyticsList,
  PostAnalyticsSort,
} from "@/types/analytics";

const BASE = "/api/analytics";

/**
 * Filters `GET /api/analytics/posts` accepts. Note what is *not* here: there
 * is no campaign, account or date filter on the server, so a campaign-scoped
 * view has to narrow the workspace-wide answer itself — see
 * `lib/campaignAnalytics`.
 */
export type PostAnalyticsQuery = {
  page?: number;
  /** Server caps this at 100 whatever we ask for. */
  limit?: number;
  sortBy?: PostAnalyticsSort;
  order?: "asc" | "desc";
  /** Platform *name* (e.g. "instagram"), not the platform id. */
  platform?: string;
};

function queryString(query: PostAnalyticsQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.sortBy) params.set("sort_by", query.sortBy);
  if (query.order) params.set("order", query.order);
  if (query.platform) params.set("platform", query.platform);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
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
    "Unable to fetch analytics",
  );
}

/**
 * The exact message the Go handler sends with its no-analytics-database 503
 * (`handlers/analytics.go`, CON-125 Track B). Matched verbatim: the status
 * alone can't be trusted, because a proxy or gateway also answers 503 during
 * a redeploy — and that body never parses to this message, so it falls
 * through to the request's fallback text.
 */
const UNAVAILABLE_MESSAGE = "analytics is not available";

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
  );
}

/* ------------------------------------------------ the dashboard endpoints -- */

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
  window?: string;
  /** Inclusive `YYYY-MM-DD`. Only meaningful with `to`. */
  from?: string;
  /** Inclusive `YYYY-MM-DD`. Only meaningful with `from`. */
  to?: string;
};

function windowParams(query: AnalyticsWindowQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.window) params.set("window", query.window);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  return params;
}

function search(params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `?${qs}` : "";
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
  return !envelope.available || envelope.data === null;
}

/**
 * Whether a learnings section has enough history to be read.
 *
 * Each of the three withdraws on its own, so this is asked per section rather
 * than once for the response — a workspace can know when to post and not yet
 * know how long a post lives.
 */
export function hasHistory<T>(
  section: LearningsSection<T>,
): section is T {
  return !(
    typeof section === "object" &&
    section !== null &&
    "insufficient_history" in section &&
    (section as { insufficient_history?: boolean }).insufficient_history === true
  );
}

/**
 * The whole windowed dashboard in one read: five KPI cards, a series per
 * metric, and the deterministic callouts (CON-237).
 *
 * Tenant-scoped — there is no campaign or platform filter, so a campaign screen
 * cannot use this yet. `granularity` is deliberately not exposed: the server
 * buckets weekly past 90 days on its own, and forcing `week` on a short window
 * produces four points where the reader expects twenty-eight.
 */
export async function fetchAnalyticsOverview(
  query: AnalyticsWindowQuery = {},
): Promise<InsightEnvelope<AnalyticsOverview>> {
  return apiJson<InsightEnvelope<AnalyticsOverview>>(
    `${BASE}/overview${search(windowParams(query))}`,
    "Unable to fetch analytics",
  );
}

export type PerformersQuery = AnalyticsWindowQuery & {
  /** Default `against_typical`. Anything outside the union is a 400. */
  by?: PerformerSort;
  /** Rows *per list*, not in total. Clamped to 20. */
  limit?: number;
  /** The wire slug (`linkedin`), matched case-insensitively. */
  platform?: string;
};

/**
 * The window's best and worst posts, each scored against the typical post on
 * its platform at the same age (CON-238).
 *
 * Ranking is the server's: `best`/`worst` come back already ordered under `by`,
 * and the middle of the distribution is never sent, so switching criterion is a
 * refetch rather than a re-sort.
 */
export async function fetchPerformers(
  query: PerformersQuery = {},
): Promise<InsightEnvelope<PerformersBoard>> {
  const params = windowParams(query);
  if (query.by) params.set("by", query.by);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.platform) params.set("platform", query.platform);
  return apiJson<InsightEnvelope<PerformersBoard>>(
    `${BASE}/performers${search(params)}`,
    "Unable to fetch analytics",
  );
}

export type LearningsQuery = {
  /** Lower bound, `YYYY-MM-DD`. Omitted means all-time. */
  since?: string;
  /** `90d`, `12w`, `6mo` — the comparison window for what's fading. */
  trendWindow?: string;
  metric?: LearningsMetric;
};

/**
 * What the workspace has learned, over all of its history (CON-239).
 *
 * Deliberately *not* windowed with the rest of the dashboard: "your posts land
 * on Tuesday evenings" is not a fact about the last 28 days, and putting it
 * under the same date control would imply it is. `since` exists to cut off a
 * past the workspace has disowned, not to make this a period view.
 */
export async function fetchLearnings(
  query: LearningsQuery = {},
): Promise<InsightEnvelope<AnalyticsLearnings>> {
  const params = new URLSearchParams();
  if (query.since) params.set("since", query.since);
  if (query.trendWindow) params.set("trend_window", query.trendWindow);
  if (query.metric) params.set("metric", query.metric);
  return apiJson<InsightEnvelope<AnalyticsLearnings>>(
    `${BASE}/learnings${search(params)}`,
    "Unable to fetch analytics",
  );
}
