import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getSetting, putSetting, userScopedKey } from '@/services/api/settings'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { useCampaignSummaries } from '@/hooks/useCampaigns'
import { useFeatureFlag } from '@/config/featureFlags'
import { activityFeed, unreadCount, type ActivityEntry } from '@/lib/activityFeed'

/**
 * Activity's data layer (CON-225, Phase 1).
 *
 * There is no notifications endpoint yet, so the feed is derived from the
 * batched campaign summaries the Campaigns list already reads (CON-152) — one
 * request for the whole workspace, shared with that screen through the Query
 * cache. Everything that turns those rows into entries is pure and lives in
 * `lib/activityFeed`; this file only wires it to the queries and to the one
 * piece of state the server does hold: how far the user has read.
 */

/** Namespace of the settings key the last-read moment is stored under. */
const NAMESPACE = 'activity'

export const activityLastSeenKey = (userId: string) =>
  ['settings', NAMESPACE, userId] as const

/**
 * When the user last read the feed, as an ISO instant — or null if they never
 * have.
 *
 * A timestamp rather than a set of ids, because Phase 1's entries are derived:
 * their ids change when the state behind them does, so a stored id list would
 * decay into a list of entries that no longer exist. Phase 2 moves read state
 * server-side per entry and this key is deleted with the rest of Phase 1.
 *
 * It lives in `/api/settings` under a user-scoped key, so the habit follows the
 * user to another device — the same trade the posts table's sort order makes.
 * That store is tenant-scoped and readable by the whole workspace, which is
 * fine for a date and would not be for anything else.
 */
export function useActivityLastSeen() {
  const enabled = useFeatureFlag('activity')
  const { t } = useTranslation()
  const userId = useAuthStore((s) => s.user?.id ?? '')
  const qc = useQueryClient()
  const queryKey = useMemo(() => activityLastSeenKey(userId), [userId])
  const storageKey = userScopedKey(NAMESPACE, userId)

  // `isLoading`, not `isPending`: a disabled query never resolves, and with no
  // user there is nothing to read — "never visited" is the answer, not a
  // placeholder for one.
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getSetting(storageKey),
    enabled: enabled && !!userId,
    staleTime: Infinity,
    // The badge is not worth a retry storm: falling back to "never visited"
    // shows more than it hides, and the next read overwrites it anyway.
    retry: false,
  })

  const markAllRead = useCallback(() => {
    if (!userId) return
    const now = new Date().toISOString()
    // A read still in flight would otherwise land its older answer on top of
    // this one, and the badge would come back until the next reload.
    void qc.cancelQueries({ queryKey })
    qc.setQueryData(queryKey, now)
    void putSetting(storageKey, now).catch(() => {
      toast.error(t('activity.markReadFailed'))
    })
  }, [qc, queryKey, storageKey, userId, t])

  return { lastSeen: data ?? null, isLoading, markAllRead }
}

export type ActivityFeedResult = {
  entries: ActivityEntry[]
  /** Recomputed with the data, so every entry on screen shares one clock. */
  now: Date
  isLoading: boolean
  isError: boolean
}

/** The feed itself: exceptions as they happened, plus one report per day. */
export function useActivityFeed(): ActivityFeedResult {
  const enabled = useFeatureFlag('activity')
  const { data, isLoading, isError, dataUpdatedAt } = useCampaignSummaries()

  // One `now` per delivery of the data rather than one per render: it feeds the
  // day grouping, the future-event guard and the unread rule, and a fresh clock
  // on every render would recompute the whole feed each time.
  const now = useMemo(() => new Date(), [dataUpdatedAt])
  const entries = useMemo(
    () => (enabled && data ? activityFeed(data, now) : []),
    [enabled, data, now],
  )

  return { entries, now, isLoading: enabled && isLoading, isError: enabled && isError }
}

/**
 * The number on the sidebar item.
 *
 * Phase 1 pays for this with the campaign-summaries request, which the sidebar
 * mounts on every screen rather than only where the Campaigns list is. That is
 * the cost of having no notifications endpoint: CON-224 carries the count on
 * the feed response itself, and this hook becomes a read of that number.
 */
export function useActivityUnreadCount(): number {
  const { entries, now } = useActivityFeed()
  const { lastSeen, isLoading } = useActivityLastSeen()
  // Until the stored moment is in, every entry would count as unread — a badge
  // that flashes a large number on each cold load and then corrects itself.
  return isLoading ? 0 : unreadCount(entries, lastSeen, now)
}
