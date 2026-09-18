/**
 * Keeping a Server-Sent Events connection open: subscriber counting, jittered
 * backoff, and the watchdog that notices a socket which died without saying so.
 *
 * The app has two long-lived streams and they want the same machinery for
 * different reasons — `/api/events` is a cache-invalidation bus with no replay
 * (`stores/eventStreamStore`), `/api/notifications/stream` is a durable inbox
 * that catches up from a cursor (`stores/notificationStreamStore`). What they
 * share is everything *around* the connection, and it is exactly the part that
 * is easy to get subtly wrong twice: the retry that must not fire after a
 * deliberate close, the abort that must not be mistaken for a drop, the
 * watchdog that must be re-armed by heartbeats and not by frames alone.
 *
 * So it is written once here, the way `lib/sse.ts` is the app's only frame
 * parser. This file knows nothing about what is being streamed; what to do with
 * a reconnect is the caller's, and that is where the two genuinely differ.
 */

/** How a live connection is currently doing. */
export type StreamConnectionStatus =
  /** Nothing mounted wants the stream. */
  | 'idle'
  /** First attempt of this session — no data has been missed yet. */
  | 'connecting'
  /** Receiving. */
  | 'open'
  /** Dropped and retrying. Data is being missed for as long as this lasts. */
  | 'reconnecting'

/** What the driver hands the opener so the connection can report on itself. */
export type StreamHooks = {
  /** The response headers landed — the stream is live from here. */
  opened: () => void
  /** Any traffic at all, heartbeats included. Re-arms the silence watchdog. */
  activity: () => void
}

export type StreamConnectionConfig = {
  /**
   * Opens the stream and resolves when it ends.
   *
   * Called fresh for every attempt, so anything that changes between attempts
   * — a replay cursor, the active workspace — is read here rather than closed
   * over once. Resolving means a **drop**, not success; throwing means the
   * stream never opened. Both retry, through the same tail.
   */
  open: (signal: AbortSignal, hooks: StreamHooks) => Promise<void>
  /** Status and consecutive-failure count, whenever either changes. */
  onState: (state: { status: StreamConnectionStatus; attempts: number }) => void
  /**
   * A connection just opened. `reconnected` is false only for the first one of
   * a session — which is the difference between "start up" and "you missed
   * something", and the whole reason the two callers diverge here.
   */
  onOpen?: (info: { reconnected: boolean }) => void
  /** Backoff between attempts, in ms, holding at the last value. */
  backoffMs?: readonly number[]
  /** How long silence may last before the connection is presumed dead. */
  silenceMs?: number
}

/** Backoff between attempts, in ms, holding at the last value. */
const DEFAULT_BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000]

/**
 * The server pings every 20s, so three missed heartbeats means the connection
 * is gone. It has to be *this* side that notices: a TCP connection that dies
 * without a FIN — laptop lid, dropped Wi-Fi, a proxy timing out quietly —
 * leaves the read pending forever, and the UI would sit there looking live.
 */
const DEFAULT_SILENCE_MS = 65_000

export type StreamConnection = {
  /**
   * Opens the stream, or joins the open one, and returns the release. The
   * connection closes when the last subscriber releases it.
   */
  subscribe: () => () => void
  /**
   * Drops the connection and opens a new one, keeping the subscribers.
   *
   * For switching workspace (CON-147): the workspace a stream belongs to is
   * fixed in the header its request carried, so a tab that re-pins itself and
   * does not do this keeps receiving the *previous* workspace's traffic. A
   * no-op when nobody is listening — there is no stream to be wrong.
   */
  restart: () => void
}

export function createStreamConnection(
  config: StreamConnectionConfig,
): StreamConnection {
  const backoff = config.backoffMs ?? DEFAULT_BACKOFF_MS
  const silenceMs = config.silenceMs ?? DEFAULT_SILENCE_MS

  let subscribers = 0
  let controller: AbortController | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let silenceTimer: ReturnType<typeof setTimeout> | null = null
  let attempts = 0
  /** True once a connection has been open, so a later one is a *re*connect. */
  let everConnected = false

  const report = (status: StreamConnectionStatus) =>
    config.onState({ status, attempts })

  function clearTimers(): void {
    if (retryTimer) clearTimeout(retryTimer)
    if (silenceTimer) clearTimeout(silenceTimer)
    retryTimer = null
    silenceTimer = null
  }

  function armWatchdog(own: AbortController): void {
    if (silenceTimer) clearTimeout(silenceTimer)
    silenceTimer = setTimeout(() => {
      silenceTimer = null
      // Aborting unblocks the pending read; the tail of `connect` then sees the
      // stream end and schedules the retry — the same path a server close takes.
      own.abort()
    }, silenceMs)
  }

  function start(): void {
    if (controller) return
    report(everConnected ? 'reconnecting' : 'connecting')
    void connect()
  }

  function stop(): void {
    clearTimers()
    controller?.abort()
    controller = null
    everConnected = false
    attempts = 0
    report('idle')
  }

  async function connect(): Promise<void> {
    const own = new AbortController()
    controller = own

    try {
      await config.open(own.signal, {
        opened: () => {
          if (own.signal.aborted) return
          const reconnected = everConnected
          everConnected = true
          attempts = 0
          report('open')
          armWatchdog(own)
          config.onOpen?.({ reconnected })
        },
        activity: () => armWatchdog(own),
      })
    } catch {
      // Any failure is the same failure: we're not connected. The status says
      // so, and there is nothing the user can act on — no message to show.
    }

    // Reaching here with `controller` still ours means the stream ended: the
    // server closed it, or the watchdog aborted it. Both are drops, so both
    // retry through this one tail. A deliberate `stop()` nulls `controller`
    // before its abort lands, so it returns here instead.
    if (controller !== own) return
    controller = null
    scheduleRetry()
  }

  function scheduleRetry(): void {
    if (subscribers === 0) return
    const step = backoff[Math.min(attempts, backoff.length - 1)]
    attempts += 1
    report('reconnecting')
    // Jittered so a server restart doesn't bring every open tab back at once.
    const delay = step * (0.75 + Math.random() * 0.5)
    retryTimer = setTimeout(() => {
      retryTimer = null
      if (subscribers > 0) void connect()
    }, delay)
  }

  return {
    subscribe() {
      subscribers += 1
      if (subscribers === 1) start()
      return () => {
        subscribers -= 1
        if (subscribers === 0) stop()
      }
    },
    restart() {
      if (subscribers === 0) return
      clearTimers()
      controller?.abort()
      controller = null
      // Not `stop()`: this is the same session continuing in another
      // workspace, so it should present as a reconnect rather than flashing
      // through "connecting" as though the app had just started.
      start()
    },
  }
}
