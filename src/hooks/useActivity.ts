import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCampaignSummaries } from '@/hooks/useCampaigns'
import { useNotifications } from '@/hooks/useNotifications'
import { useTasks } from '@/hooks/useTasks'
import { useFeatureFlag } from '@/config/featureFlags'
import { browserTimeZone } from '@/lib/timeZones'
import {
  ACTIVITY_REPORT_DAYS,
  fetchActivityReport,
  listActivityReports,
} from '@/services/api/activity'
import { activityFeed, type ActivityEntry } from '@/lib/activityFeed'
import type { ActivityReport } from '@/types/activity'

/**
 * Activity's data layer (CON-225, Phase 2).
 *
 * Three sources, wired here and combined by the pure rules in
 * `lib/activityFeed`:
 *
 * - **`GET /api/notifications`** (CON-242) — what was recorded as it happened,
 *   each row carrying its own read state. This is the half that replaced Phase
 *   1's derived entries, and with it went the last-read timestamp the feed used
 *   to keep in `/api/settings`: read state is per row and server-side now, so
 *   the badge is simply the inbox's own count (`useNotificationUnreadCount`).
 * - **`GET /api/activity/reports`** (CON-285) — one row per local day that had
 *   anything on it. The report used to be arithmetic over the campaign
 *   summaries, done in `lib/activityFeed`; it is the server's now, and the zone
 *   it cuts days by is the one sent from here.
 * - **The batched campaign summaries** (CON-152) — one request for the whole
 *   workspace, shared with the Campaigns list through the Query cache. Reduced
 *   to one job by that reversal: turning a post id into the campaign that holds
 *   it, which is the only way a post notification can be linked to.
 *
 * The zone is the browser's, read per render rather than frozen in a module
 * constant — a laptop opened in another country is the case that matters, and a
 * cached zone would keep cutting days by the one it left.
 */

/** Everything Activity's reports hold, for clearing the lot on a workspace switch. */
export const ACTIVITY_REPORTS_KEY = ['activity', 'reports'] as const

export type ActivityFeedResult = {
  entries: ActivityEntry[]
  /** Recomputed with the data, so every entry on screen shares one clock. */
  now: Date
  isLoading: boolean
  isError: boolean
  /**
   * The sources that failed while at least one other answered. The feed still
   * renders what arrived — that is the point of keeping them independent — but
   * the screen has to say so: notifications failing alone would otherwise read
   * as a quiet workspace, and reports failing alone as a workspace that
   * published nothing.
   *
   * A list rather than one value because the three can fail independently, and
   * `links` is the odd one: losing the summaries costs no entries at all, only
   * the destinations on the ones about posts.
   */
  degraded: ActivityDegradation[]
  /**
   * A source came back at its ceiling, so there is older history the feed is
   * not showing. The screen says which, and what the bounds are.
   */
  isTruncated: boolean
  /**
   * The campaign a post belongs to, or null.
   *
   * A post notification names the post and not its campaign, but every route
   * to a post goes through one — so the destination cannot be built without
   * this. It reads the summaries the Campaigns list fetches anyway, which is
   * why the lookup costs no request of its own. Null means the post is gone or
   * out of reach, and the entry simply does not link.
   */
  campaignOfPost: (postId: string) => string | null
}

export type ActivityDegradation = 'notifications' | 'reports' | 'links'

/**
 * The days that had something on them.
 *
 * A horizon rather than a page: `ACTIVITY_REPORT_DAYS` back, no paging, and the
 * screen says where it stops. `campaignId` narrows the same endpoint to one
 * campaign — the workspace view is the campaign view without the filter — and
 * is part of the key, because the two answers are different reports.
 */
export function useActivityReports(campaignId?: string) {
  const enabled = useFeatureFlag('activity')
  const tz = browserTimeZone()
  return useQuery({
    queryKey: [...ACTIVITY_REPORTS_KEY, 'list', tz, campaignId ?? null],
    queryFn: () => listActivityReports({ tz, campaignId }),
    enabled,
    staleTime: 30_000,
  })
}

/**
 * One day, in full.
 *
 * Separate from the list because it is a different endpoint answering a
 * different question, and it is only ever asked once a reader has opened a day.
 * A quiet day is a zeroed report rather than an absence, so this never has to
 * distinguish "nothing happened" from "not loaded".
 */
export function useActivityReport(
  date: string,
  campaignId?: string,
): {
  report: ActivityReport | undefined
  isLoading: boolean
  isError: boolean
} {
  const enabled = useFeatureFlag('activity')
  const tz = browserTimeZone()
  const { data, isLoading, isError } = useQuery({
    queryKey: [...ACTIVITY_REPORTS_KEY, 'day', date, tz, campaignId ?? null],
    queryFn: () => fetchActivityReport(date, { tz, campaignId }),
    enabled,
    staleTime: 30_000,
  })
  return { report: data, isLoading: enabled && isLoading, isError }
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
  const {
    data: reports,
    isLoading: reportsLoading,
    isError: reportsError,
  } = useActivityReports()
  // Empty while the tasks flag is off, so the feed is exactly what it was
  // before tasks existed.
  const { tasks } = useTasks()

  // One `now` per delivery of the data rather than one per render: it feeds the
  // day grouping and the future-event guard, and a fresh clock on every render
  // would recompute the whole feed each time. The dependencies are the sources
  // on purpose — the clock has to tick once per delivery of *any* of them, or
  // an entry newer than the last refetch stays hidden until something unrelated
  // refreshes the others.
  const now = useMemo(
    () => new Date(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataUpdatedAt, notifications, reports, tasks],
  )
  const entries = useMemo(
    () => (enabled ? activityFeed({ reports, notifications, tasks }, now) : []),
    [enabled, reports, notifications, tasks, now],
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

  const degraded = useMemo(() => {
    if (!enabled) return []
    const failed: ActivityDegradation[] = []
    // Both failing is the page's own error state, not a pair of warnings over
    // an empty list.
    if (notificationsError !== reportsError) {
      failed.push(notificationsError ? 'notifications' : 'reports')
    }
    if (summariesError) failed.push('links')
    return failed
  }, [enabled, notificationsError, reportsError, summariesError])

  return {
    entries,
    now,
    campaignOfPost,
    // The two halves that carry entries are independent, and either alone is a
    // feed worth showing: a screen that waits for both means one slow request
    // hides rows that are already in hand. So the page-level error is both
    // failing, and one failing alone is `degraded` — shown, and said. The
    // summaries are in neither: they carry no entries, so a page that failed
    // on them would be blank over a feed that had loaded.
    isLoading:
      enabled && notificationsLoading && reportsLoading && summariesLoading,
    isError: enabled && notificationsError && reportsError,
    degraded,
    isTruncated:
      enabled &&
      (isTruncated || (reports?.length ?? 0) >= ACTIVITY_REPORT_DAYS),
  }
}
