import { apiJson } from "./http";
import { ApiError } from "./errors";
import type {
  PostAnalyticsAnswer,
  PostAnalyticsPending,
  PostAnalyticsSnapshot,
} from "@/types/analytics";

/**
 * One post's own figures — `GET /api/posts/:id/analytics` (CON-93 FR4).
 *
 * The endpoint has existed since CON-93 and nothing in this app has ever called
 * it; the campaign and workspace surfaces read `/api/analytics/*`, which is
 * tenant-scoped and cannot answer about a single post. See
 * `docs/analytics-contract.md` §5.
 *
 * It lives here rather than in `analytics.ts` because it is not on that prefix,
 * and the difference is load-bearing: its 503 says "post analytics is not
 * available" where `/api/analytics/posts` says "analytics is not available", so
 * `isAnalyticsUnavailable` does **not** match it. Two messages for one
 * condition is the server's, not ours — {@link isPostAnalyticsUnavailable} is
 * the matching half.
 */

/** The message the Go handler sends with its no-analytics-database 503. */
const UNAVAILABLE_MESSAGE = "post analytics is not available";

/**
 * Whether a failure means this deployment has no analytics database.
 *
 * Matched on the message as well as the status for the same reason
 * `isAnalyticsUnavailable` is: a gateway answers 503 during a redeploy, and
 * that body never parses to this message.
 */
export function isPostAnalyticsUnavailable(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 503 &&
    error.message === UNAVAILABLE_MESSAGE
  );
}

/**
 * Whether the post was never published through a publisher — the normal answer
 * for a draft, and not a fault.
 *
 * The body carries `{code: "not_published_via_publisher", error: <prose>}` and
 * `errorMessage` keeps only the prose, so the code never reaches us. The status
 * is enough: 409 is the sole conflict this endpoint raises.
 */
export function isNotPublishedViaPublisher(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

/** Whether the sweep has simply not reached this post yet. */
export function isPending(
  answer: PostAnalyticsAnswer,
): answer is PostAnalyticsPending {
  return (answer as PostAnalyticsPending).status === "pending";
}

/** Narrowed the other way, so a caller reads figures without a cast. */
export function isMeasured(
  answer: PostAnalyticsAnswer,
): answer is PostAnalyticsSnapshot {
  return !isPending(answer);
}

/**
 * This post's current figures, or `pending` while it waits for the sweep.
 *
 * Everything else throws: 404, the 409 above, and the 503 above — each of which
 * a caller tells apart with the predicates in this file rather than by reading
 * the message.
 */
export async function fetchPostAnalytics(
  postId: string,
): Promise<PostAnalyticsAnswer> {
  return apiJson<PostAnalyticsAnswer>(
    `/api/posts/${postId}/analytics`,
    "Unable to fetch analytics for this post",
  );
}
