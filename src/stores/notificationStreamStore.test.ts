import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NotificationStreamHandlers } from '@/services/api/notifications'
import type { AppNotification } from '@/types/notifications'

/**
 * The replay cursor, which is the one piece of CON-242 nothing else covers.
 *
 * `services/api/notifications.test.ts` already proves that `streamNotifications`
 * puts a cursor it is handed into `Last-Event-ID` and omits the header when it
 * is handed none, and the server half was verified against the running API on
 * 2026-09-07 (ascending replay, strictly above the cursor, live-only without
 * one). The seam between those two is this store: *which* number it hands over,
 * and when it reads it.
 *
 * That seam breaks in ways neither side would notice. A cursor closed over at
 * construction is a client that replays the same gap forever; a cursor read
 * from the wrong cache is one that silently replays nothing; a cursor that
 * survives a workspace switch replays the previous workspace's rows into this
 * one. All three connect, open, and look completely healthy.
 *
 * The driver's own behaviour — backoff, watchdog, subscriber counting — belongs
 * to `lib/streamConnection.test.ts` and is not repeated here. These tests use
 * the real driver only because the cursor is read *by* it, on every attempt.
 */

type StreamCall = {
  handlers: NotificationStreamHandlers
  signal: AbortSignal
  /** What this attempt would send as `Last-Event-ID`. */
  lastEventId: number | undefined
  /** Ends the stream the way a server close does. */
  end: () => void
}

const { calls, streamNotifications } = vi.hoisted(() => {
  const calls: StreamCall[] = []
  const streamNotifications = (
    handlers: NotificationStreamHandlers,
    signal: AbortSignal,
    options: { lastEventId?: number } = {},
  ): Promise<void> =>
    new Promise<void>((resolve) => {
      calls.push({
        handlers,
        signal,
        lastEventId: options.lastEventId,
        end: () => resolve(),
      })
      // An abort has to unblock the pending read, exactly as a real body read
      // does — otherwise the driver's retry tail never runs.
      signal.addEventListener('abort', () => resolve())
    })
  return { calls, streamNotifications }
})

vi.mock('@/services/api/notifications', () => ({ streamNotifications }))

function row(over: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n1',
    seq: 1,
    level: 'info',
    type: 'post.published',
    title: '',
    body: '',
    entity_type: 'post',
    entity_id: 'p1',
    action_url: '',
    data: null,
    read_at: null,
    created_at: '2026-09-07T09:00:00Z',
    expires_at: null,
    ...over,
  }
}

/**
 * A fresh module graph per test.
 *
 * The connection is built at module scope — deliberately, so a route change
 * cannot drop it — which also means it cannot be reset between tests.
 * `queryClient` is pulled from the same graph so the cache the store reads is
 * the cache the test seeds.
 */
async function load() {
  vi.resetModules()
  const { queryClient } = await import('@/lib/queryClient')
  const { NOTIFICATION_LIST_KEY } = await import('@/lib/notificationCache')
  const store = await import('@/stores/notificationStreamStore')
  return { queryClient, store, NOTIFICATION_LIST_KEY }
}

/** Ends the current attempt and lets the driver's first backoff step elapse. */
async function reconnect(call: StreamCall) {
  call.end()
  // The retry is scheduled in the tail of `connect`, one microtask after the
  // opener resolves — it has to run before there is a timer to advance.
  await Promise.resolve()
  await vi.advanceTimersByTimeAsync(1_000)
}

beforeEach(() => {
  calls.length = 0
  vi.useFakeTimers()
  // Kills the backoff jitter so the first step is exactly 1000ms.
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('the replay cursor', () => {
  it('sends none on the first connect of a tab', async () => {
    const { store } = await load()

    const release = store.subscribeToNotifications()

    expect(calls).toHaveLength(1)
    expect(calls[0].lastEventId).toBeUndefined()
    release()
  })

  it('sends the highest seq it has been shown once a frame has landed', async () => {
    const { store } = await load()
    const release = store.subscribeToNotifications()

    calls[0].handlers.onOpen?.()
    calls[0].handlers.onNotification(row({ id: 'a', seq: 42 }))
    await reconnect(calls[0])

    expect(calls).toHaveLength(2)
    expect(calls[1].lastEventId).toBe(42)
    release()
  })

  it('is read per attempt, not closed over at construction', async () => {
    const { store } = await load()
    const release = store.subscribeToNotifications()

    calls[0].handlers.onOpen?.()
    calls[0].handlers.onNotification(row({ id: 'a', seq: 42 }))
    await reconnect(calls[0])
    expect(calls[1].lastEventId).toBe(42)

    // A frame on the *second* connection has to move the cursor the *third*
    // one sends. Closing over the value would pin every reconnect to 42 and
    // replay the same gap for as long as the tab stayed open.
    calls[1].handlers.onOpen?.()
    calls[1].handlers.onNotification(row({ id: 'b', seq: 57 }))
    await reconnect(calls[1])

    expect(calls[2].lastEventId).toBe(57)
    release()
  })

  it('is the highest seq, not the most recent frame', async () => {
    const { store } = await load()
    const release = store.subscribeToNotifications()

    calls[0].handlers.onOpen?.()
    // Replay arrives ascending, but a live frame can follow a *lower* replayed
    // one across the handoff. Anchoring on the last one seen would rewind the
    // cursor and replay rows the reader already has.
    calls[0].handlers.onNotification(row({ id: 'a', seq: 42 }))
    calls[0].handlers.onNotification(row({ id: 'b', seq: 7 }))
    await reconnect(calls[0])

    expect(calls[1].lastEventId).toBe(42)
    release()
  })

  it('goes with the cache when the tab re-pins to another workspace', async () => {
    const { queryClient, store } = await load()
    const release = store.subscribeToNotifications()

    calls[0].handlers.onOpen?.()
    calls[0].handlers.onNotification(row({ id: 'a', seq: 42 }))

    // What `useSwitchWorkspace` does: this tab's cache is dropped, then the
    // stream is re-opened. The rows the old cursor would replay belong to the
    // workspace just left, so the new connection must be live-only.
    queryClient.clear()
    store.reconnectNotifications()

    expect(calls).toHaveLength(2)
    expect(calls[1].lastEventId).toBeUndefined()
    release()
  })
})

describe('frames', () => {
  it('ignores one that resolves after its connection was aborted', async () => {
    const { queryClient, store, NOTIFICATION_LIST_KEY } = await load()
    const release = store.subscribeToNotifications()

    calls[0].handlers.onOpen?.()
    store.reconnectNotifications()

    // A frame parsed just after the restart aborted its connection. Landing it
    // would put the previous workspace's row in the new workspace's cache.
    calls[0].handlers.onNotification(row({ id: 'stale', seq: 99 }))

    expect(queryClient.getQueryData(NOTIFICATION_LIST_KEY)).toBeUndefined()
    expect(calls[1].lastEventId).toBeUndefined()
    release()
  })
})

describe('catching up', () => {
  it('refetches after a gap but not on the first open', async () => {
    const { queryClient, store } = await load()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const release = store.subscribeToNotifications()

    calls[0].handlers.onOpen?.()
    // Starting up is not missing anything — the page that fills the cache is
    // fetched over REST.
    expect(invalidate).not.toHaveBeenCalled()

    await reconnect(calls[0])
    calls[1].handlers.onOpen?.()

    // Replay is capped at 200 rows, so a long enough absence comes back with a
    // cursor the server will not fully honour; this is what covers the rest.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] })
    release()
  })
})

describe('what the UI is told', () => {
  it('reports connecting, open, then reconnecting with a rising count', async () => {
    const { store } = await load()
    const release = store.subscribeToNotifications()

    expect(store.useNotificationStreamStore.getState().status).toBe(
      'connecting',
    )

    calls[0].handlers.onOpen?.()
    expect(store.useNotificationStreamStore.getState()).toMatchObject({
      status: 'open',
      attempts: 0,
    })

    calls[0].end()
    await Promise.resolve()
    expect(store.useNotificationStreamStore.getState()).toMatchObject({
      status: 'reconnecting',
      attempts: 1,
    })

    release()
    expect(store.useNotificationStreamStore.getState().status).toBe('idle')
  })
})
