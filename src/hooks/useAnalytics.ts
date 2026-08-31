import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  isAnalyticsUnavailable,
  listPostAnalytics,
  type PostAnalyticsQuery,
} from '@/services/api/analytics'
import {
  campaignAnalytics,
  type CampaignAnalytics,
} from '@/lib/campaignAnalytics'
import { useCampaignPosts } from '@/hooks/usePosts'
import type { Post } from '@/types/posts'

/**
 * The workspace's measured posts. Everything analytics shows today is derived
 * from this one query, so a campaign screen and the workspace screen that will
 * follow share a cache entry rather than each fetching their own copy.
 */
export const ANALYTICS_POSTS_KEY = ['analytics', 'posts'] as const

export function postAnalyticsKey(query: PostAnalyticsQuery) {
  return [...ANALYTICS_POSTS_KEY, query] as const
}

/**
 * The server's page cap. Asking for more is not an error — it silently clamps
 * — so the number is stated here to keep the "did we see everything?"
 * arithmetic in `coverage` honest.
 */
export const ANALYTICS_PAGE_LIMIT = 100

function usePostAnalytics(query: PostAnalyticsQuery = {}) {
  return useQuery({
    queryKey: postAnalyticsKey(query),
    queryFn: () => listPostAnalytics(query),
    // Snapshots are written by a periodic refresh job, not by anything the
    // user does here, so re-reading on every mount buys nothing.
    staleTime: 5 * 60_000,
    // A deployment without an analytics database answers 503 to every read;
    // retrying only delays the explanation.
    retry: (count, error) => !isAnalyticsUnavailable(error) && count < 2,
  })
}

export type CampaignAnalyticsResult = {
  data: CampaignAnalytics<Post> | undefined
  isPending: boolean
  isError: boolean
  /** The deployment has no analytics database — a configuration, not a fault. */
  isUnavailable: boolean
}

/**
 * One campaign's analytics: the workspace-wide page narrowed to its posts (see
 * `lib/campaignAnalytics` for why the narrowing happens here rather than in
 * the query string).
 *
 * The page is fetched newest-published first rather than best-performing
 * first: if one page can't hold every measured post in the workspace, the
 * campaign's recent posts are the ones worth having.
 */
export function useCampaignAnalytics(
  campaignId: string,
): CampaignAnalyticsResult {
  const analytics = usePostAnalytics({
    limit: ANALYTICS_PAGE_LIMIT,
    sortBy: 'published_at',
    order: 'desc',
  })
  const posts = useCampaignPosts(campaignId)

  const items = analytics.data?.items
  const campaignPosts = posts.data

  const data = useMemo(
    () =>
      items && campaignPosts
        ? campaignAnalytics(items, campaignPosts)
        : undefined,
    [items, campaignPosts],
  )

  return {
    data,
    isPending: analytics.isPending || posts.isPending,
    isError: analytics.isError || posts.isError,
    isUnavailable: isAnalyticsUnavailable(analytics.error),
  }
}
