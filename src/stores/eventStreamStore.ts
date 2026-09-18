import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { queryClient } from '@/lib/queryClient'
import { flushAllPendingSaves } from '@/lib/pendingSaves'
import { isLocalRun } from '@/lib/localRuns'
import {
  RECONCILE_FILTERS,
  invalidationsFor,
  localRunKeyFor,
} from '@/lib/eventRouting'
import { createStreamConnection } from '@/lib/streamConnection'
import { streamAppEvents } from '@/services/api/events'
import { toast } from '@/stores/toastStore'
import type { AppEvent, EventStreamStatus } from '@/types/events'

/**
 * The single connection to `GET /api/events`, and what it is currently doing.
 *
 * One per session, held at module scope for the same reason `assistantStore`
 * holds its runners there: nothing about a socket belongs to a component, and
 * a route change must not drop it. Subscribers are counted so React can mount
 * this twice in StrictMode without opening two streams.
 *
 * The stream is a *hint* channel, never a source of truth — see
 * `types/events.ts`. Everything it does lands in `eventRouting`.
 *
 * Keeping it open — backoff, the silence watchdog, the subscriber count — is
 * `lib/streamConnection`, shared with the notification inbox. What is left here
 * is the half that is genuinely this stream's: what a reconnect means when
 * there is no replay to resume into.
 */

/**
 * Retries to ride out before saying anything. The first backoff step is a
 * second, so a server redeploy or a tunnel blip is over before this — and a
 * banner that appears for every hiccup teaches people to ignore banners.
 */
export const QUIET_ATTEMPTS = 2

/**
 * Events worth interrupting for. The bar is all three of: the user didn't
 * cause it, it blocks something they're trying to do, and it is invisible on
 * whatever screen they're on. Only the publishing integration clears it —
 * everything else is either already on screen or too frequent to be welcome.
 */
const TOASTED: Record<string, { title: string; description: string }> = {
  'zernio.account.disconnected': {
    title: 'A social account disconnected',
    description:
      "Posts scheduled to it won't publish until it's reconnected in Workspace Settings.",
  },
  'zernio.account.attach_failed': {
    title: "Couldn't connect that social account",
    description: 'Try connecting it again from Workspace Settings.',
  },
}

type EventStreamState = {
  status: EventStreamStatus
  /**
   * Consecutive failed attempts, reset to 0 on a successful open. Doubles as
   * how long the drop has lasted, since the backoff schedule is fixed.
   */
  attempts: number
  /** True while the post-reconnect refetch is in flight. */
  reconciling: boolean
}

export const useEventStreamStore = create<EventStreamState>()(
  devtools(() => ({ status: 'idle', attempts: 0, reconciling: false }), {
    name: 'eventStream',
  }),
)

const set = (patch: Partial<EventStreamState>) =>
  useEventStreamStore.setState(patch)

const connection = createStreamConnection({
  open: (signal, hooks) =>
    streamAppEvents(
      {
        onOpen: hooks.opened,
        onEvent: (event) => {
          if (!signal.aborted) handleEvent(event)
        },
        onActivity: hooks.activity,
      },
      signal,
    ),
  onState: ({ status, attempts }) =>
    // `idle` is the stream being let go — logging out, or the authenticated
    // layout unmounting — so a refetch that was in flight is no longer
    // anything the next session should be told about.
    set(
      status === 'idle'
        ? { status, attempts, reconciling: false }
        : { status, attempts },
    ),
  onOpen: ({ reconnected }) => {
    if (reconnected) void reconcile()
  },
})

/**
 * Opens the stream (or joins the open one) and returns the release. The
 * connection closes when the last subscriber releases it — logging out, or the
 * authenticated layout unmounting.
 */
export function subscribeToEvents(): () => void {
  return connection.subscribe()
}

/**
 * Drops the connection and opens a new one, keeping the subscribers.
 *
 * For switching workspace (CON-147). The stream is deliberately a module-scope
 * singleton that survives route changes — but the workspace it belongs to is
 * fixed at the moment `GET /api/events` is opened, in the header that request
 * carried. A tab that re-pins itself and does not do this keeps receiving the
 * *previous* workspace's events: another client's post finishing, invalidating
 * caches on a screen it has nothing to do with.
 */
export function reconnectEvents(): void {
  connection.restart()
}

/**
 * Refetch after a gap, since there is nothing to replay. Pending edits are
 * written first so the refetch can't briefly restore pre-edit content over
 * what the user is typing.
 */
async function reconcile(): Promise<void> {
  set({ reconciling: true })
  try {
    await flushAllPendingSaves()
    await Promise.all(
      RECONCILE_FILTERS.map((filters) =>
        queryClient.invalidateQueries(filters),
      ),
    )
  } finally {
    set({ reconciling: false })
  }
}

function handleEvent(event: AppEvent): void {
  // A run this tab is streaming reports its own outcome; the hub copy of it is
  // an echo, and acting on it would refetch a cache the run is still writing.
  const runKey = localRunKeyFor(event)
  if (runKey && isLocalRun(runKey)) return

  for (const filters of invalidationsFor(event)) {
    void queryClient.invalidateQueries(filters)
  }

  const notice = TOASTED[event.type]
  if (notice) toast.warning(notice.title, { description: notice.description })
}
