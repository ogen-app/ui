import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createStreamConnection,
  type StreamHooks,
} from '@/lib/streamConnection'

/**
 * The driver's job is entirely about *when* it does things, so the tests are
 * about timers and about the one state that is easy to corrupt: which attempt
 * owns the connection.
 *
 * The cases worth having are the ones where two lifetimes overlap — a release
 * that lands while a retry is pending, an abort that must not be read as a
 * drop, a restart that must not leave the old attempt able to schedule a retry
 * of its own. Each of those is a stream that quietly doubles up or quietly
 * stops, and neither is visible from the screen.
 */

type OpenCall = {
  signal: AbortSignal
  hooks: StreamHooks
  /** Ends the stream the way a server close does. */
  end: () => void
  /** Ends it the way a failed connect does. */
  fail: () => void
}

/** An opener whose connections are ended by hand, one call at a time. */
function controllableOpen() {
  const calls: OpenCall[] = []
  const open = (signal: AbortSignal, hooks: StreamHooks) =>
    new Promise<void>((resolve, reject) => {
      calls.push({
        signal,
        hooks,
        end: () => resolve(),
        fail: () => reject(new Error('closed')),
      })
      // An abort has to unblock the pending read, exactly as a real body read
      // does — otherwise the retry tail never runs.
      signal.addEventListener('abort', () => resolve())
    })
  return { open, calls }
}

beforeEach(() => {
  vi.useFakeTimers()
  // Kills the jitter so the backoff steps are exact numbers to advance past.
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('subscribers', () => {
  it('opens once for two subscribers and closes on the last release', async () => {
    const { open, calls } = controllableOpen()
    const states: string[] = []
    const conn = createStreamConnection({
      open,
      onState: (s) => states.push(s.status),
    })

    const releaseA = conn.subscribe()
    const releaseB = conn.subscribe()
    expect(calls).toHaveLength(1)

    releaseA()
    expect(calls[0].signal.aborted).toBe(false)

    releaseB()
    expect(calls[0].signal.aborted).toBe(true)
    expect(states).toEqual(['connecting', 'idle'])
  })

  it('does not retry after the last subscriber has gone', async () => {
    const { open, calls } = controllableOpen()
    const conn = createStreamConnection({ open, onState: () => {} })

    const release = conn.subscribe()
    calls[0].hooks.opened()
    release()

    // The abort resolves the opener; its tail must see that it no longer owns
    // the connection and stop there rather than booking a reconnect for a
    // stream nobody is listening to.
    await vi.advanceTimersByTimeAsync(60_000)
    expect(calls).toHaveLength(1)
  })
})

describe('reconnecting', () => {
  it('walks the backoff and holds at the last step', async () => {
    const { open, calls } = controllableOpen()
    const conn = createStreamConnection({
      open,
      onState: () => {},
      backoffMs: [1_000, 5_000],
    })
    conn.subscribe()

    calls[0].end()
    await vi.advanceTimersByTimeAsync(999)
    expect(calls).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(2)
    expect(calls).toHaveLength(2)

    calls[1].end()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(calls).toHaveLength(3)

    // Held, not doubled again.
    calls[2].end()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(calls).toHaveLength(4)
  })

  it('counts a connect that never opened the same as a drop', async () => {
    const { open, calls } = controllableOpen()
    const states: { status: string; attempts: number }[] = []
    const conn = createStreamConnection({
      open,
      onState: (s) => states.push({ ...s }),
      backoffMs: [1_000],
    })
    conn.subscribe()

    calls[0].fail()
    await vi.advanceTimersByTimeAsync(1_000)

    expect(calls).toHaveLength(2)
    // The retry itself reports nothing: the connection is still reconnecting
    // while the second attempt is in flight, and saying so again would make
    // the status flicker for anyone rendering it.
    expect(states.map((s) => s.status)).toEqual(['connecting', 'reconnecting'])
    expect(states[states.length - 1].attempts).toBe(1)
  })

  it('resets the attempt count once a connection opens', async () => {
    const { open, calls } = controllableOpen()
    const states: { status: string; attempts: number }[] = []
    const conn = createStreamConnection({
      open,
      onState: (s) => states.push({ ...s }),
      backoffMs: [1_000],
    })
    conn.subscribe()

    calls[0].end()
    await vi.advanceTimersByTimeAsync(1_000)
    calls[1].hooks.opened()

    expect(states[states.length - 1]).toEqual({ status: 'open', attempts: 0 })
  })

  it('tells the caller which opens were reconnects', async () => {
    const { open, calls } = controllableOpen()
    const opens: boolean[] = []
    const conn = createStreamConnection({
      open,
      onState: () => {},
      onOpen: ({ reconnected }) => opens.push(reconnected),
      backoffMs: [1_000],
    })
    conn.subscribe()

    calls[0].hooks.opened()
    calls[0].end()
    await vi.advanceTimersByTimeAsync(1_000)
    calls[1].hooks.opened()

    expect(opens).toEqual([false, true])
  })

  it('starts over as connecting once the stream has been let go', async () => {
    const { open, calls } = controllableOpen()
    const states: string[] = []
    const conn = createStreamConnection({
      open,
      onState: (s) => states.push(s.status),
    })

    const release = conn.subscribe()
    calls[0].hooks.opened()
    release()
    conn.subscribe()

    // Not `reconnecting`: this is a new session — logging out and back in, or
    // the authenticated layout remounting — and nothing was missed.
    expect(states).toEqual(['connecting', 'open', 'idle', 'connecting'])
  })
})

describe('the silence watchdog', () => {
  it('drops a connection that has gone quiet', async () => {
    const { open, calls } = controllableOpen()
    const conn = createStreamConnection({
      open,
      onState: () => {},
      silenceMs: 10_000,
      backoffMs: [1_000],
    })
    conn.subscribe()
    calls[0].hooks.opened()

    await vi.advanceTimersByTimeAsync(10_000)
    expect(calls[0].signal.aborted).toBe(true)

    await vi.advanceTimersByTimeAsync(1_000)
    expect(calls).toHaveLength(2)
  })

  it('is re-armed by traffic, heartbeats included', async () => {
    const { open, calls } = controllableOpen()
    const conn = createStreamConnection({
      open,
      onState: () => {},
      silenceMs: 10_000,
    })
    conn.subscribe()
    calls[0].hooks.opened()

    await vi.advanceTimersByTimeAsync(9_000)
    calls[0].hooks.activity()
    await vi.advanceTimersByTimeAsync(9_000)

    expect(calls[0].signal.aborted).toBe(false)
  })

  it('ignores an open reported after the attempt was aborted', async () => {
    // A `restart` races the in-flight request: its response can land after the
    // abort, and arming a watchdog on a dead attempt would abort whatever
    // replaced it 65 seconds later.
    const { open, calls } = controllableOpen()
    const opens: boolean[] = []
    const conn = createStreamConnection({
      open,
      onState: () => {},
      onOpen: ({ reconnected }) => opens.push(reconnected),
    })
    conn.subscribe()

    conn.restart()
    calls[0].hooks.opened()

    expect(opens).toEqual([])
  })
})

describe('restart', () => {
  it('reopens in place, keeping the subscribers', async () => {
    const { open, calls } = controllableOpen()
    const states: string[] = []
    const conn = createStreamConnection({
      open,
      onState: (s) => states.push(s.status),
    })
    conn.subscribe()
    calls[0].hooks.opened()

    conn.restart()

    expect(calls[0].signal.aborted).toBe(true)
    expect(calls).toHaveLength(2)
    // `reconnecting`, not `connecting`: the same session continuing somewhere
    // else, so the rail should not flash as though the app had just booted.
    expect(states).toEqual(['connecting', 'open', 'reconnecting'])
  })

  it('does not open a stream nobody asked for', async () => {
    const { open, calls } = controllableOpen()
    const conn = createStreamConnection({ open, onState: () => {} })

    conn.restart()

    expect(calls).toHaveLength(0)
  })

  it('leaves the abandoned attempt unable to book a retry', async () => {
    const { open, calls } = controllableOpen()
    const conn = createStreamConnection({
      open,
      onState: () => {},
      backoffMs: [1_000],
    })
    conn.subscribe()

    conn.restart()
    // The first attempt's tail runs now, on the abort. If it could still
    // schedule, the next tick would open a third stream against one tab.
    await vi.advanceTimersByTimeAsync(5_000)

    expect(calls).toHaveLength(2)
  })
})
