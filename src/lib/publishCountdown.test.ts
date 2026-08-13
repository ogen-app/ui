import { describe, expect, it } from 'vitest'
import {
  countdownRefreshMs,
  publishCountdown,
  publishTiming,
} from './publishCountdown'
import type { Post, PostStatus } from '@/types/posts'

const NOW = Date.parse('2026-08-10T12:00:00.000Z')

/** `now + offset`, as the ISO string a post carries. */
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString()

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('publishCountdown', () => {
  it('counts forward in the largest unit that still fits', () => {
    expect(publishCountdown(at(5 * MINUTE), NOW)).toEqual({ value: 5, unit: 'minute' })
    expect(publishCountdown(at(3 * HOUR), NOW)).toEqual({ value: 3, unit: 'hour' })
    expect(publishCountdown(at(2 * DAY), NOW)).toEqual({ value: 2, unit: 'day' })
    expect(publishCountdown(at(14 * DAY), NOW)).toEqual({ value: 2, unit: 'week' })
    expect(publishCountdown(at(90 * DAY), NOW)).toEqual({ value: 3, unit: 'month' })
  })

  it('rounds before choosing the unit, not after', () => {
    // The naive order gives "in 60 minutes" here, which no one says.
    expect(publishCountdown(at(59 * MINUTE + 40_000), NOW)).toEqual({
      value: 1,
      unit: 'hour',
    })
    expect(publishCountdown(at(23 * HOUR + 59 * MINUTE), NOW)).toEqual({
      value: 1,
      unit: 'day',
    })
  })

  it('reads under a minute either way as "now"', () => {
    // The publisher worker polls; naming the seconds would claim a precision
    // the countdown does not have.
    expect(publishCountdown(at(20_000), NOW)).toEqual({ value: 0, unit: 'second' })
    expect(publishCountdown(at(-20_000), NOW)).toEqual({ value: 0, unit: 'second' })
  })

  it('goes negative once the date has passed', () => {
    // An overdue post is the case worth getting right: the worker is late, or
    // stuck, and the bar has to say so rather than silently show nothing.
    expect(publishCountdown(at(-5 * MINUTE), NOW)).toEqual({ value: -5, unit: 'minute' })
    expect(publishCountdown(at(-2 * DAY), NOW)).toEqual({ value: -2, unit: 'day' })
  })

  it('has nothing to say about a missing or unparseable date', () => {
    expect(publishCountdown(null, NOW)).toBeNull()
    expect(publishCountdown('', NOW)).toBeNull()
    expect(publishCountdown('not a date', NOW)).toBeNull()
  })
})

describe('countdownRefreshMs', () => {
  it('ticks faster the closer the date is', () => {
    expect(countdownRefreshMs('minute')).toBeLessThan(countdownRefreshMs('hour'))
    expect(countdownRefreshMs('hour')).toBeLessThan(countdownRefreshMs('day'))
    expect(countdownRefreshMs('month')).toEqual(countdownRefreshMs('day'))
  })
})

const post = (status: PostStatus, scheduled_at: string | null): Post =>
  ({ status, scheduled_at }) as Post

describe('publishTiming', () => {
  it('promises publication only for an auto-scheduled post', () => {
    expect(publishTiming(post('scheduled', at(2 * DAY)), NOW)).toEqual({
      method: 'auto',
      countdown: { value: 2, unit: 'day' },
    })
  })

  it('keeps the manual-publish post separate from the auto one', () => {
    // Nothing publishes this; what arrives on the date is a reminder, and the
    // copy the caller picks has to say so.
    expect(
      publishTiming(post('scheduled_for_manual_publishing', at(2 * DAY)), NOW),
    ).toEqual({ method: 'manual', countdown: { value: 2, unit: 'day' } })
  })

  it('says nothing for a post nothing is going to publish', () => {
    // These carry a `scheduled_at` too, but it is a plan, not a commitment —
    // counting down to it would promise something SCHEDULE has not been
    // pressed for yet.
    expect(publishTiming(post('draft', at(2 * DAY)), NOW)).toBeNull()
    expect(publishTiming(post('ready_for_publish', at(2 * DAY)), NOW)).toBeNull()
  })

  it('says nothing once the post is done, either way', () => {
    expect(publishTiming(post('published', at(-2 * DAY)), NOW)).toBeNull()
    expect(publishTiming(post('failed', at(-2 * DAY)), NOW)).toBeNull()
    expect(publishTiming(post('not_published', at(-2 * DAY)), NOW)).toBeNull()
  })

  it('says nothing when a scheduled post has no date to count to', () => {
    expect(publishTiming(post('scheduled', null), NOW)).toBeNull()
  })
})
