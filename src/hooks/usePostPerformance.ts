import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchPostAnalytics,
  isNotPublishedViaPublisher,
  isPending,
  isPostAnalyticsUnavailable,
} from '@/services/api/postAnalytics'
import { ApiError } from '@/services/api/errors'
import {
  buildPostPerformanceView,
  type PostFacts,
} from '@/lib/postAnalyticsView'
import { canHaveAnalytics } from '@/lib/postStatusMachine'
import type { PostPerformanceView } from '@/components/analytics/types'
import type { PostStatus } from '@/types/posts'

export const POST_PERFORMANCE_KEY = ['analytics', 'post'] as const

export function postPerformanceKey(postId: string) {
  return [...POST_PERFORMANCE_KEY, postId] as const
}

/**
 * How often to ask again while the server says `pending`.
 *
 * The sweep that fills a snapshot is periodic and server-side, so there is no
 * event to wait on — the endpoint returns `pending` at 200 specifically so a
 * client can poll (CON-93 §10). A minute is slow enough to be nearly free
 * against one indexed row and fast enough that somebody watching sees it
 * arrive.
 *
 * Not capped, on purpose: TanStack pauses an interval while the tab is in the
 * background, so a screen left open overnight stops asking on its own, and a
 * screen someone is actually looking at is one where the waiting is the point.
 */
const POLL_MS = 60_000

/**
 * What this post's numbers are doing — every answer the endpoint can give,
 * separated so the surface never has to read an error message to know which.
 *
 * `unlinked` and `waiting` are the two that look like failures and are not.
 * A post published by hand and never linked back is not missing its analytics;
 * analytics is *undefined* for it until somebody gives Ogen the URL. And a post
 * published four minutes ago has nothing wrong with it either — it is ahead of
 * the sweep.
 */
export type PostPerformanceResult =
  /** Nothing has gone out, so nothing was asked. See {@link canHaveAnalytics}. */
  | { state: 'unpublished' }
  | { state: 'loading' }
  /** Published through a publisher; the refresh sweep has not reached it yet. */
  | { state: 'waiting' }
  | { state: 'measured'; view: PostPerformanceView }
  /** Published outside Ogen and never linked back — 409. Actionable. */
  | { state: 'unlinked' }
  /** This deployment has no analytics database — 503. A configuration. */
  | { state: 'unavailable' }
  | { state: 'error' }

/**
 * One post's own figures, ready to render.
 *
 * The hook owns the gate as well as the fetch: a post that cannot have numbers
 * never reaches the network, because the only answer waiting there is a 409 and
 * a 409 on every draft anyone opens is a burnt request and a red line in the
 * console.
 *
 * `facts` come off the post document rather than the snapshot — the screen
 * already has the post it is about, and the wire carries no title, format or
 * campaign. Pass a stable object; it is a dependency of the built view.
 */
export function usePostPerformance(
  postId: string,
  status: PostStatus,
  facts: PostFacts,
): PostPerformanceResult {
  const enabled = canHaveAnalytics(status)

  const query = useQuery({
    queryKey: postPerformanceKey(postId),
    queryFn: () => fetchPostAnalytics(postId),
    enabled,
    // Written by a periodic job, never by anything the user does here.
    staleTime: 5 * 60_000,
    refetchInterval: (q) =>
      q.state.data && isPending(q.state.data) ? POLL_MS : false,
    // None of the documented failures gets better by being asked twice: 409 is
    // a fact about the post, 503 is a fact about the deployment, and 404 means
    // the post is gone. Retrying them only holds the surface in its loading
    // state through two backoffs before showing the answer it already had.
    //
    // So the rule is by class rather than by listing statuses: an answer from
    // the server is a decision, and only a request that never got one is worth
    // repeating.
    retry: (count, error) =>
      !(error instanceof ApiError) &&
      !isPostAnalyticsUnavailable(error) &&
      count < 2,
  })

  const answer = query.data

  // `now` is read here rather than inside the builder so every span on the view
  // moves together, and only when the snapshot does — a fresh `new Date()` per
  // render would rebuild the whole view on every keystroke elsewhere on the
  // screen.
  const view = useMemo(
    () =>
      answer && !isPending(answer)
        ? buildPostPerformanceView(answer, facts, new Date())
        : null,
    [answer, facts],
  )

  if (!enabled) return { state: 'unpublished' }
  if (query.isPending) return { state: 'loading' }
  if (isNotPublishedViaPublisher(query.error)) return { state: 'unlinked' }
  if (isPostAnalyticsUnavailable(query.error)) return { state: 'unavailable' }
  if (query.isError || !answer) return { state: 'error' }
  if (isPending(answer)) return { state: 'waiting' }
  return view ? { state: 'measured', view } : { state: 'error' }
}
