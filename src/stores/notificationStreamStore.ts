import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { queryClient } from '@/lib/queryClient'
import {
  cachedNotifications,
  highestSeq,
  landLiveNotification,
  NOTIFICATIONS_KEY,
} from '@/lib/notificationCache'
import { createStreamConnection } from '@/lib/streamConnection'
import type { StreamConnectionStatus } from '@/lib/streamConnection'
import { streamNotifications } from '@/services/api/notifications'

/**
 * The single connection to `GET /api/notifications/stream` (CON-242).
 *
 * A second stream beside `eventStreamStore`, not a topic on the first, and the
 * difference is the point: `/api/events` is an at-most-once invalidation bus
 * that keeps no log, and this one replays. They share their machinery
 * (`lib/streamConnection`) and nothing else.
 *
 * **The stream is never the source of truth here** — the table is, and REST is
 * how it is read. All this connection buys is immediacy: a notification landing
 * on screen the moment it is written rather than at the next refetch. Which is
 * why a drop is not an emergency the way an events-bus drop is: nothing is
 * lost, only late.
 *
 * Held at module scope, subscriber-counted, for the same reasons as the events
 * stream: nothing about a socket belongs to a component, a route change must
 * not drop it, and React must be able to mount its subscriber twice in
 * StrictMode without opening two connections.
 */

type NotificationStreamState = {
  status: StreamConnectionStatus
  /** Consecutive failed attempts, reset to 0 on a successful open. */
  attempts: number
}

export const useNotificationStreamStore = create<NotificationStreamState>()(
  devtools(() => ({ status: 'idle' as StreamConnectionStatus, attempts: 0 }), {
    name: 'notificationStream',
  }),
)

const connection = createStreamConnection({
  open: (signal, hooks) =>
    streamNotifications(
      {
        onOpen: hooks.opened,
        onNotification: (notification) => {
          // A frame can resolve just before a restart aborts the connection and
          // be parsed just after — on a workspace switch that would land the old
          // workspace's row in the new workspace's cache. Same guard as the
          // events stream.
          if (!signal.aborted) landLiveNotification(queryClient, notification)
        },
        onActivity: hooks.activity,
      },
      signal,
      // Read per attempt, not closed over: the cursor moves with every frame
      // and is thrown away entirely when the tab re-pins to another workspace.
      // Absent on a first connect, which the server reads as "live from now" —
      // correct, because the page that fills the cache is fetched over REST.
      { lastEventId: cursor() ?? undefined },
    ),
  onState: (state) => useNotificationStreamStore.setState(state),
  onOpen: ({ reconnected }) => {
    if (reconnected) reconcile()
  },
})

/** The highest `seq` this client has been shown, or nothing. */
function cursor(): number | null {
  return highestSeq(cachedNotifications(queryClient))
}

/**
 * Refetch after a gap, *as well as* replaying.
 *
 * Replay is capped at 200 rows, so a long enough absence — a laptop shut over a
 * weekend — comes back with a cursor the server will not fully honour. The
 * replay covers the common short gap instantly; this covers the rest, and the
 * two agree because both are deduped by id on the way into the cache.
 *
 * No `flushAllPendingSaves` here, unlike the events bus: nothing in this cache
 * is edited by hand, so there is no in-flight write for a refetch to overwrite.
 */
function reconcile(): void {
  void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
}

/**
 * Opens the notification stream (or joins the open one) and returns the
 * release. Mounted once, at the authenticated layout — see
 * `hooks/useNotificationStream`.
 */
export function subscribeToNotifications(): () => void {
  return connection.subscribe()
}

/**
 * Re-open in the workspace this tab now names (CON-147).
 *
 * The switch clears the tab's Query cache, so the cursor goes with it and the
 * new connection is live-only — which is right: the rows it would have replayed
 * belong to the workspace just left.
 */
export function reconnectNotifications(): void {
  connection.restart()
}
