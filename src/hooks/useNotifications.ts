import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFeatureFlag } from '@/config/featureFlags'
import {
  NOTIFICATION_LIST_KEY,
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_UNREAD_KEY,
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
import { awaiting } from '@/lib/fetched'

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
  const query = useQuery({
    queryKey: NOTIFICATION_LIST_KEY,
    queryFn: () => listNotifications({ limit: NOTIFICATION_PAGE_SIZE }),
    enabled,
    staleTime: 0,
  })

  return {
    notifications: query.data ?? [],
    // `awaiting`, not `isLoading` — see `lib/fetched`.
    isLoading: awaiting(query),
    isError: enabled && query.isError,
    isTruncated: (query.data?.length ?? 0) >= NOTIFICATION_PAGE_SIZE,
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
 * Mark the inbox read up to one row — that row and everything older.
 *
 * Bounded by a `seq` the caller names rather than blanket, because the request
 * is: the server marks `seq <= through` and nothing above it, so a row that
 * arrives while the write is in flight is never marked seen having never been
 * on screen. The feed calls it with the *oldest* row it holds, once the reader
 * has scrolled to the end of the page — see `ActivityFeed`.
 */
export function useMarkNotificationsReadThrough() {
  const qc = useQueryClient()
  const { mutate } = useMutation({
    mutationFn: (through: number) => markAllNotificationsRead(through),
    onSuccess: async (_updated, through) => {
      // A list refetch that was already in flight when the write landed holds
      // the *pre-write* rows, and with `staleTime: 0` there is one on every
      // mount — resolving after this patch it would put the unread rows back
      // while the badge reads zero. Cancel it before touching the cache.
      await qc.cancelQueries({ queryKey: NOTIFICATION_LIST_KEY })
      markCachedRead(qc, through, new Date().toISOString())
      // The write touched rows this page does not hold, so the count has to
      // come from the server rather than from the adjustment above.
      void qc.invalidateQueries({ queryKey: NOTIFICATION_UNREAD_KEY })
    },
  })
  return mutate
}

/**
 * Marks a notification read once it has been on screen, and remembers — for as
 * long as the screen is mounted — which ones it did that to.
 *
 * Three states, and only the server holds two of them:
 *
 * - **unseen** — `read_at` is null and the row has not been in view. Counted
 *   in the rail's badge.
 * - **recent** — the row came into view during *this visit*. It is written read
 *   straight away, so the badge drops as you look, but the row keeps a mark
 *   until you navigate away or reload: arriving on the page is not the same as
 *   having read it, and a mark that vanished the instant it was drawn would
 *   never be seen by anybody.
 * - **seen** — read on the server and not touched this visit. No mark.
 *
 * `recent` is this hook's state and nothing else's, which is what makes it
 * one-time: it is not a field, not stored, and not in any cache, so the next
 * mount starts with it empty and the rows it held come back as seen.
 *
 * "In view" means more than half the row inside the viewport **for 300ms, while
 * the tab is visible**. The dwell is what separates a row somebody looked at
 * from one a fast scroll to the bottom flew past — without it, flinging the
 * page once would read the whole feed. And a notification landing live in a
 * background tab is on screen in layout terms and in nobody's eyes, so it is
 * held, and its 300ms start when the tab comes back to the front.
 *
 * One request per row, deliberately. A batch endpoint would turn a long scroll
 * into one write instead of thirty, but it stores nothing `read_at` does not
 * already hold, and thirty small PATCHes are not a cost worth an endpoint.
 *
 * `watch` is one stable ref callback for every row, which reads the id off
 * `data-notification-id` — a callback per row would be a new function each
 * render, and React would unobserve and re-observe every row on every render.
 * Attach it to unread rows only: a row that turns read drops the ref, and its
 * cleanup stops watching it.
 */
export function useReadOnSight(): {
  recent: ReadonlySet<string>
  watch: (el: HTMLElement | null) => (() => void) | undefined
} {
  const { mutate } = useSetNotificationRead()
  const [recent, setRecent] = useState<ReadonlySet<string>>(() => new Set())
  // Sent once per visit. A write that fails leaves the row unread on the server
  // and recent on screen; the next visit shows it unseen again, which is the
  // harmless direction to be wrong in.
  const sent = useRef(new Set<string>())
  // In view and waiting out the dwell.
  const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  // In view while the tab was hidden — the dwell starts when it comes back.
  const held = useRef(new Set<string>())
  const observer = useRef<IntersectionObserver | null>(null)

  const read = useCallback(
    (id: string) => {
      if (sent.current.has(id)) return
      sent.current.add(id)
      mutate({ id, read: true })
      setRecent((prev) => new Set(prev).add(id))
    },
    [mutate],
  )
  // The observer and its timers outlive renders, so they reach the current
  // `read` through a ref rather than closing over the first one.
  const readRef = useRef(read)
  useLayoutEffect(() => {
    readRef.current = read
  }, [read])

  const forget = useCallback((id: string) => {
    clearTimeout(pending.current.get(id))
    pending.current.delete(id)
    held.current.delete(id)
  }, [])

  const dwell = useCallback((id: string) => {
    if (sent.current.has(id) || pending.current.has(id)) return
    if (document.visibilityState !== 'visible') {
      held.current.add(id)
      return
    }
    pending.current.set(
      id,
      setTimeout(() => {
        pending.current.delete(id)
        readRef.current(id)
      }, READ_DWELL_MS),
    )
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        const ids = [...held.current]
        held.current.clear()
        ids.forEach(dwell)
      } else {
        // Going to the back cancels every dwell in progress: half a look
        // followed by a tab switch is not a look.
        for (const [id, timer] of pending.current) {
          clearTimeout(timer)
          held.current.add(id)
        }
        pending.current.clear()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [dwell])

  const watch = useCallback(
    (el: HTMLElement | null) => {
      const id = el?.dataset.notificationId
      if (!el || !id) return undefined
      // Created on first use rather than in an effect: rows attach during the
      // commit, before any effect of this hook has run.
      observer.current ??= new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const target = (entry.target as HTMLElement).dataset.notificationId
            if (!target) continue
            if (entry.isIntersecting) dwell(target)
            else forget(target)
          }
        },
        // The implicit root still clips by the feed's own scroller, so a row
        // scrolled out of the list is out of view even inside the viewport.
        { threshold: 0.5 },
      )
      const io = observer.current
      io.observe(el)
      return () => {
        io.unobserve(el)
        forget(id)
      }
    },
    [dwell, forget],
  )

  return { recent, watch }
}

/** How long a row has to stay in view to count as looked at. */
const READ_DWELL_MS = 300
