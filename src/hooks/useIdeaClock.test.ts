import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { Idea } from '@/lib/ideas'
import { useIdeaClock } from './useIdeaClock'

const later = (remindAt: string): Idea => ({
  id: remindAt,
  title: 'x',
  note: '',
  campaignId: null,
  verdict: 'later',
  createdAt: '2026-10-01T00:00:00Z',
  createdBy: null,
  decidedAt: null,
  decidedBy: null,
  remindAt,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-13T12:00:00Z'))
})
afterEach(() => vi.useRealTimers())

describe('useIdeaClock', () => {
  it('moves on when the next reminder comes due, and not before', () => {
    const ideas = [later('2026-10-13T12:05:00Z'), later('2026-10-20T00:00:00Z')]
    const { result } = renderHook(() => useIdeaClock(ideas))
    const start = result.current

    act(() => void vi.advanceTimersByTime(4 * 60_000))
    expect(result.current).toBe(start)

    act(() => void vi.advanceTimersByTime(60_000))
    expect(result.current.getTime()).toBeGreaterThanOrEqual(
      Date.parse('2026-10-13T12:05:00Z'),
    )
  })

  it('sets no timer when nothing is postponed', () => {
    renderHook(() => useIdeaClock([]))
    expect(vi.getTimerCount()).toBe(0)
  })
})
