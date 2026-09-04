import { useCallback, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFeatureFlag } from '@/config/featureFlags'
import {
  NOTIFICATION_LIST_KEY,
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_UNREAD_KEY,
  highestSeq,
  landChangedNotification,
  markCachedRead,
} from '@/lib/notificationCache'
import {
  listNotifications,
  markAllNotificationsRead,
  setNotificationRead,
  unreadNotificationCount,
} from '@/services/api/notifications'
import { subscribeToNotifications } from '@/stores/notificationStreamStore'
import type { AppNotification } from '@/types/notifications'

/**
 * The notification inbox's data layer (CON-242).
 *
 * REST is the truth and the stream is only speed, so everything here reads a
 * query and the stream writes into the same cache underneath
 * (`lib/notificationCache`). Nothing in this file knows the connection exists.
 *
 * The page and the count are **two queries on purpose**. The count is over the
 * whole inbox and the page is its newest slice, so a badge taken from
 * `rows.length` would say "12" to somebody with two hundred unread. It also
 * means the sidebar — mounted on every screen — pays for one small request
 * instead of a hundred rows it will not render.
 *
 * Everything is gated on the `activity` flag, which is the feature these rows
 * are read on: with it off nothing is fetched, no stream opens, and the app
 * behaves exactly as it did before the inbox existed.
 */

/**
 * Keeps the notification stream open for as long as this is mounted.
 *
 * Mount it once, at the authenticated layout, beside `useEventStream`: the
 * connection is session-wide and subscriber-counted, so a second caller joins
 * the open one rather than opening another. Unmounting (logging out) closes it,
 * which matters — the connection is authenticated, and the next user of this
 * browser must not inherit it.
 */
export function useNotificationStream(): void {
  const enabled = useFeatureFlag('activity')
  useEffect(() => {
    if (!enabled) return
    return subscribeToNotifications()
  }, [enabled])
}

export type NotificationsResult = {
  notifications: AppNotification[]
  /** True while the newest page is being fetched for the first time. */
  isLoading: boolean
  isError: boolean
  /**
   * The page came back full, so there is older history the feed is not
   * showing. Said on screen rather than swallowed — a list that silently stops
   * at a round number reads as "that's everything".
   */
  isTruncated: boolean
}

/**
 * The newest page of the inbox.
 *
 * `staleTime: 0` where the rest of the app takes 30 seconds, because the live
 * stream writes into this same cache: without it, a page assembled from stream
 * frames while the reader was on another screen would count as fresh, and
 * opening Activity would show those few rows as though they were the inbox.
 * Mounting always refetches; the cached rows are shown meanwhile.
 */
export function useNotifications(): NotificationsResult {
  const enabled = useFeatureFlag('activity')
  const { data, isLoading, isError } = useQuery({
    queryKey: NOTIFICATION_LIST_KEY,
    queryFn: () => listNotifications({ limit: NOTIFICATION_PAGE_SIZE }),
    enabled,
    staleTime: 0,
  })

  return {
    notifications: data ?? [],
    isLoading: enabled && isLoading,
    isError: enabled && isError,
    isTruncated: (data?.length ?? 0) >= NOTIFICATION_PAGE_SIZE,
  }
}

/**
 * The number on the sidebar row.
 *
 * One request, and the only one the sidebar makes for this feature. It is
 * nudged by the stream as rows arrive and by the writes below as they land, so
 * it stays right between refetches without costing a request per change.
 */
export function useNotificationUnreadCount(): number {
  const enabled = useFeatureFlag('activity')
  const { data } = useQuery({
    queryKey: NOTIFICATION_UNREAD_KEY,
    queryFn: unreadNotificationCount,
    enabled,
    // A badge is not worth a retry storm, and the next refetch corrects it.
    retry: false,
  })
  return data ?? 0
}

/** Mark one row read, or put it back to unread. Idempotent on both sides. */
export function useSetNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) =>
      setNotificationRead(id, read),
    onSuccess: (row) => {
      // The handler answers with the row as it now stands, so there is nothing
      // to guess at and nothing to roll back.
      if (row) landChangedNotification(qc, row)
    },
  })
}

/**
 * Mark the inbox read, up to what the reader was actually shown.
 *
 * The bound is the highest `seq` on the page at the moment of the click. A
 * notification arriving between the click and the response is above it and
 * stays unread — otherwise the one thing the reader never saw is the one thing
 * marked as seen.
 */
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (before: number | null) =>
      markAllNotificationsRead(before ?? undefined),
    onSuccess: async (_updated, before) => {
      // A list refetch that was already in flight when the write landed holds
      // the *pre-write* rows, and with `staleTime: 0` there is one on every
      // mount — resolving after this patch it would put the unread rows back
      // while the badge reads zero. Cancel it before touching the cache.
      await qc.cancelQueries({ queryKey: NOTIFICATION_LIST_KEY })
      markCachedRead(qc, before, new Date().toISOString())
      // The write touched rows this page does not hold, so the count has to
      // come from the server rather than from the adjustment above.
      void qc.invalidateQueries({ queryKey: NOTIFICATION_UNREAD_KEY })
    },
  })

  const { mutate } = mutation
  return useCallback(() => {
    const before = highestSeq(
      qc.getQueryData<AppNotification[]>(NOTIFICATION_LIST_KEY) ?? [],
    )
    // Nothing on the page means nothing has been seen; a blanket mark-all would
    // clear an inbox the reader has never once looked at.
    if (before === null) return
    mutate(before)
  }, [mutate, qc])
}
