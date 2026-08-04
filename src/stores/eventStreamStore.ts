import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { queryClient } from '@/lib/queryClient'
import { flushAllPendingSaves } from '@/lib/pendingSaves'
import { isLocalRun } from '@/lib/localRuns'
import { RECONCILE_FILTERS, invalidationsFor, localRunKeyFor } from '@/lib/eventRouting'
import { ALL_TOPICS, streamAppEvents } from '@/services/api/events'
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
 */

/** Backoff between attempts, in ms, holding at the last value. */
const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000]

/**
 * The server pings every 20s, so three missed heartbeats means the connection
 * is gone. It has to be *this* side that notices: a TCP connection that dies
 * without a FIN — laptop lid, dropped Wi-Fi, a proxy timing out quietly —
 * leaves the read pending forever, and the UI would sit there looking live.
 */
const SILENCE_TIMEOUT_MS = 65_000

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

const set = (patch: Partial<EventStreamState>) => useEventStreamStore.setState(patch)

let subscribers = 0
let controller: AbortController | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let silenceTimer: ReturnType<typeof setTimeout> | null = null
/** True once a connection has been open, so a later attempt is a *re*connect. */
let everConnected = false

/**
 * Opens the stream (or joins the open one) and returns the release. The
 * connection closes when the last subscriber releases it — logging out, or the
 * authenticated layout unmounting.
 */
export function subscribeToEvents(): () => void {
  subscribers += 1
  if (subscribers === 1) start()
  return () => {
    subscribers -= 1
    if (subscribers === 0) stop()
  }
}

function start(): void {
  if (controller) return
  set({ status: everConnected ? 'reconnecting' : 'connecting' })
  void connect()
}

function stop(): void {
  clearTimers()
  controller?.abort()
  controller = null
  everConnected = false
  set({ status: 'idle', attempts: 0, reconciling: false })
}

function clearTimers(): void {
  if (retryTimer) clearTimeout(retryTimer)
  if (silenceTimer) clearTimeout(silenceTimer)
  retryTimer = null
  silenceTimer = null
}

async function connect(): Promise<void> {
  const own = new AbortController()
  controller = own

  try {
    await streamAppEvents(
      ALL_TOPICS,
      {
        onOpen: () => {
          if (own.signal.aborted) return
          const reconnected = everConnected
          everConnected = true
          set({ status: 'open', attempts: 0 })
          armSilenceWatchdog(own)
          if (reconnected) void reconcile()
        },
        onEvent: (event) => {
          if (!own.signal.aborted) handleEvent(event)
        },
        onActivity: () => armSilenceWatchdog(own),
      },
      own.signal,
    )
  } catch {
    // Any failure is the same failure: we're not connected. The status below
    // says so, and there is nothing the user can act on — no message to show.
  }

  // Reaching here without an abort means the stream ended: the server closed
  // it, or the watchdog gave up on it. Both are drops, so both retry.
  if (own.signal.aborted || controller !== own) return
  controller = null
  scheduleRetry()
}

function scheduleRetry(): void {
  if (subscribers === 0) return
  const { attempts } = useEventStreamStore.getState()
  set({ status: 'reconnecting', attempts: attempts + 1 })
  const base = BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)]
  // Jittered so a server restart doesn't bring every open tab back at once.
  const delay = base * (0.75 + Math.random() * 0.5)
  retryTimer = setTimeout(() => {
    retryTimer = null
    if (subscribers > 0) void connect()
  }, delay)
}

function armSilenceWatchdog(own: AbortController): void {
  if (silenceTimer) clearTimeout(silenceTimer)
  silenceTimer = setTimeout(() => {
    silenceTimer = null
    // Aborting unblocks the pending read, which lands in `connect`'s retry.
    own.abort()
    if (controller === own) {
      controller = null
      scheduleRetry()
    }
  }, SILENCE_TIMEOUT_MS)
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
    await Promise.all(RECONCILE_FILTERS.map((filters) => queryClient.invalidateQueries(filters)))
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
