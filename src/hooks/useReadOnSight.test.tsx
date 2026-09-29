import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as service from '@/services/api/notifications'
import {
  NOTIFICATION_LIST_KEY,
  NOTIFICATION_UNREAD_KEY,
} from '@/lib/notificationCache'
import type { AppNotification } from '@/types/notifications'
import { useReadOnSight } from './useNotifications'

/**
 * Reading is looking: a row is written read once it has been on screen, and
 * kept marked as *recent* for the rest of the visit.
 *
 * The three rules worth pinning are the ones that are easy to lose in a
 * refactor: the badge drops as soon as a row is seen (the write is immediate,
 * not deferred to leaving the page), a background tab sees nothing, and a row
 * is written once per visit however often it scrolls back into view.
 */

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void

let observed: Callback | null = null

class FakeObserver {
  constructor(callback: Callback) {
    observed = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

let visibility: DocumentVisibilityState = 'visible'

function row(id: string, seq: number): AppNotification {
  return {
    id,
    seq,
    type: 'post.failed',
    level: 'error',
    title: 'A post failed',
    body: '',
    data: {},
    created_at: '2026-09-28T09:00:00Z',
    read_at: null,
  } as AppNotification
}

function element(id: string): HTMLElement {
  const el = document.createElement('div')
  el.dataset.notificationId = id
  return el
}

function report(isIntersecting: boolean, els: HTMLElement[]) {
  act(() => {
    observed?.(els.map((target) => ({ target, isIntersecting })))
  })
}
const sight = (...els: HTMLElement[]) => report(true, els)
const lose = (...els: HTMLElement[]) => report(false, els)

/** Real time, not fake timers: the mutation schedules on timers of its own. */
async function wait(ms: number) {
  await act(() => new Promise((resolve) => setTimeout(resolve, ms)))
}

/** Long enough to outlast the 300ms dwell. */
const LOOK = 350

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(NOTIFICATION_LIST_KEY, [row('a', 2), row('b', 1)])
  qc.setQueryData(NOTIFICATION_UNREAD_KEY, 2)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useReadOnSight(), { wrapper })
  return { qc, hook }
}

beforeEach(() => {
  observed = null
  visibility = 'visible'
  vi.stubGlobal('IntersectionObserver', FakeObserver)
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(
    () => visibility,
  )
  vi.spyOn(service, 'setNotificationRead').mockImplementation(
    async (id: string) => ({ ...row(id, 0), read_at: '2026-09-28T10:00:00Z' }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useReadOnSight', () => {
  it('writes a row read once it has been in view for the dwell, and keeps it recent', async () => {
    const { qc, hook } = setup()
    const a = element('a')
    act(() => void hook.result.current.watch(a))

    sight(a)
    expect(hook.result.current.recent.size).toBe(0)
    await wait(LOOK)

    expect(hook.result.current.recent.has('a')).toBe(true)
    expect(hook.result.current.recent.has('b')).toBe(false)
    await waitFor(() =>
      expect(service.setNotificationRead).toHaveBeenCalledWith('a', true),
    )
    // The badge drops now, while the row is still marked on screen.
    await waitFor(() =>
      expect(qc.getQueryData(NOTIFICATION_UNREAD_KEY)).toBe(1),
    )
  })

  it('does not read a row a fast scroll flew past', async () => {
    const { hook } = setup()
    const a = element('a')
    act(() => void hook.result.current.watch(a))

    sight(a)
    await wait(100)
    lose(a)
    await wait(LOOK)

    expect(service.setNotificationRead).not.toHaveBeenCalled()
    expect(hook.result.current.recent.size).toBe(0)
  })

  it('writes a row once per visit, however often it comes back into view', async () => {
    const { hook } = setup()
    const a = element('a')
    act(() => void hook.result.current.watch(a))

    sight(a)
    await wait(LOOK)
    lose(a)
    sight(a)
    await wait(LOOK)

    await waitFor(() => expect(service.setNotificationRead).toHaveBeenCalled())
    expect(service.setNotificationRead).toHaveBeenCalledTimes(1)
  })

  it('reads nothing in a background tab until it has been at the front for the dwell', async () => {
    const { hook } = setup()
    const a = element('a')
    act(() => void hook.result.current.watch(a))

    visibility = 'hidden'
    sight(a)
    await wait(LOOK)
    expect(service.setNotificationRead).not.toHaveBeenCalled()
    expect(hook.result.current.recent.size).toBe(0)

    visibility = 'visible'
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(hook.result.current.recent.size).toBe(0)
    await wait(LOOK)
    await waitFor(() =>
      expect(service.setNotificationRead).toHaveBeenCalledWith('a', true),
    )
    expect(hook.result.current.recent.has('a')).toBe(true)
  })

  it('cancels a dwell in progress when the tab goes to the back', async () => {
    const { hook } = setup()
    const a = element('a')
    act(() => void hook.result.current.watch(a))

    sight(a)
    await wait(100)
    visibility = 'hidden'
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    await wait(LOOK)

    expect(service.setNotificationRead).not.toHaveBeenCalled()
  })

  it('starts every visit with nothing recent', async () => {
    const first = setup()
    const a = element('a')
    act(() => void first.hook.result.current.watch(a))
    sight(a)
    await wait(LOOK)
    expect(first.hook.result.current.recent.size).toBe(1)
    first.hook.unmount()

    const second = setup()
    expect(second.hook.result.current.recent.size).toBe(0)
  })
})
