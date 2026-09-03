import { useCallback, useMemo } from 'react'
import { useCampaignSummaries } from '@/hooks/useCampaigns'
import { useNotifications } from '@/hooks/useNotifications'
import { useTasks } from '@/hooks/useTasks'
import { useFeatureFlag } from '@/config/featureFlags'
import { activityFeed, type ActivityEntry } from '@/lib/activityFeed'

/**
 * Activity's data layer (CON-225, Phase 2).
 *
 * Two sources, wired here and combined by the pure rules in `lib/activityFeed`:
 *
 * - **`GET /api/notifications`** (CON-242) — what was recorded as it happened,
 *   each row carrying its own read state. This is the half that replaced Phase
 *   1's derived entries, and with it went the last-read timestamp the feed used
 *   to keep in `/api/settings`: read state is per row and server-side now, so
 *   the badge is simply the inbox's own count (`useNotificationUnreadCount`).
 * - **The batched campaign summaries** (CON-152) — one request for the whole
 *   workspace, shared with the Campaigns list through the Query cache, and
 *   still the report's only input.
 */

export type ActivityFeedResult = {
  entries: ActivityEntry[]
  /** Recomputed with the data, so every entry on screen shares one clock. */
  now: Date
  isLoading: boolean
  isError: boolean
  /**
   * The recorded half came back a full page, so there is older history the feed
   * is not showing. The reports below it are not truncated — they are computed
   * from posts — so this is about the entries, and the screen says which.
   */
  isTruncated: boolean
  /**
   * The campaign a post belongs to, or null.
   *
   * A post notification names the post and not its campaign, but every route
   * to a post goes through one — so the destination cannot be built without
   * this. It reads the summaries the report already needs, which is why the
   * lookup lives with the feed rather than costing a request of its own. Null
   * means the post is gone or out of reach, and the entry simply does not link.
   */
  campaignOfPost: (postId: string) => string | null
}

/** The feed itself: what happened, plus one report per day. */
export function useActivityFeed(): ActivityFeedResult {
  const enabled = useFeatureFlag('activity')
  const {
    data,
    isLoading: summariesLoading,
    isError: summariesError,
    dataUpdatedAt,
  } = useCampaignSummaries()
  const {
    notifications,
    isLoading: notificationsLoading,
    isError: notificationsError,
    isTruncated,
  } = useNotifications()
  // Empty while the tasks flag is off, so the feed is exactly what it was
  // before tasks existed.
  const { tasks } = useTasks()

  // One `now` per delivery of the data rather than one per render: it feeds the
  // day grouping and the future-event guard, and a fresh clock on every render
  // would recompute the whole feed each time. The dependencies are the three
  // sources on purpose — the clock has to tick once per delivery of *any* of
  // them, or an entry newer than the last summaries refetch stays hidden until
  // something unrelated refreshes them.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [dataUpdatedAt, notifications, tasks])
  const entries = useMemo(
    () =>
      enabled
        ? activityFeed({ summaries: data ?? {}, notifications, tasks }, now)
        : [],
    [enabled, data, notifications, tasks, now],
  )

  const campaignByPost = useMemo(() => {
    const index = new Map<string, string>()
    for (const [campaignId, posts] of Object.entries(data ?? {})) {
      for (const post of posts) index.set(post.id, campaignId)
    }
    return index
  }, [data])

  const campaignOfPost = useCallback(
    (postId: string) => campaignByPost.get(postId) ?? null,
    [campaignByPost],
  )

  return {
    entries,
    now,
    campaignOfPost,
    // The two sources are independent, and either alone is a feed worth
    // showing: a screen that waits for both means one slow request hides
    // notifications that are already in hand.
    isLoading: enabled && summariesLoading && notificationsLoading,
    isError: enabled && summariesError && notificationsError,
    isTruncated: enabled && isTruncated,
  }
}
