import { describe, expect, it } from 'vitest'

import {
  DEFAULT_GOAL_CADENCE,
  describePostGoalTotal,
  normalizeGoalCadence,
  periodsInRange,
  postGoalTotal,
} from './postGoal'

describe('normalizeGoalCadence', () => {
  it('keeps a cadence the server accepts', () => {
    expect(normalizeGoalCadence('week')).toBe('week')
    expect(normalizeGoalCadence('month')).toBe('month')
  })

  it('falls back to the default the server applies to an unset value', () => {
    expect(normalizeGoalCadence('')).toBe(DEFAULT_GOAL_CADENCE)
    expect(normalizeGoalCadence(null)).toBe(DEFAULT_GOAL_CADENCE)
    expect(normalizeGoalCadence(undefined)).toBe(DEFAULT_GOAL_CADENCE)
    // The pre-CON-182 vocabulary, which no campaign should still be sending.
    expect(normalizeGoalCadence('total')).toBe(DEFAULT_GOAL_CADENCE)
    expect(normalizeGoalCadence('weekly')).toBe(DEFAULT_GOAL_CADENCE)
  })
})

describe('periodsInRange', () => {
  it('counts a partial trailing week as a whole one', () => {
    // Jan 1–7 is exactly one week; one more day owes a second week's posts.
    expect(periodsInRange('week', '2026-01-01T00:00:00Z', '2026-01-07T00:00:00Z')).toBe(1)
    expect(periodsInRange('week', '2026-01-01T00:00:00Z', '2026-01-08T00:00:00Z')).toBe(2)
  })

  it('counts calendar months, not 30-day blocks', () => {
    expect(periodsInRange('month', '2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z')).toBe(1)
    // Barely over a month long, but it runs in two of them.
    expect(periodsInRange('month', '2026-01-25T00:00:00Z', '2026-02-02T00:00:00Z')).toBe(2)
    expect(periodsInRange('month', '2026-01-01T00:00:00Z', '2026-03-31T00:00:00Z')).toBe(3)
  })

  it('reads a missing or backwards window as one period', () => {
    // Matches campaigngoal.Periods: without dates the rate *is* the total, so
    // the server plans rather than refusing to.
    expect(periodsInRange('month', null, null)).toBe(1)
    expect(periodsInRange('week', '2026-01-01T00:00:00Z', null)).toBe(1)
    expect(periodsInRange('week', '2026-03-01T00:00:00Z', '2026-01-01T00:00:00Z')).toBe(1)
  })
})

describe('postGoalTotal', () => {
  it('multiplies the rate by the periods the campaign spans', () => {
    expect(
      postGoalTotal(3, 'week', '2026-01-01T00:00:00Z', '2026-01-28T00:00:00Z'),
    ).toEqual({ kind: 'ok', total: 12, periods: 4, dated: true })
  })

  it('has nothing to total without a count', () => {
    expect(postGoalTotal(null, 'month', null, null)).toEqual({ kind: 'needs-count' })
    expect(postGoalTotal(0, 'month', null, null)).toEqual({ kind: 'needs-count' })
    expect(postGoalTotal(-2, 'month', null, null)).toEqual({ kind: 'needs-count' })
  })

  it('still totals an undated campaign, and says the dates are missing', () => {
    expect(postGoalTotal(5, 'month', null, null)).toEqual({
      kind: 'ok',
      total: 5,
      periods: 1,
      dated: false,
    })
  })
})

describe('describePostGoalTotal', () => {
  it('spells out the arithmetic behind the total', () => {
    const total = postGoalTotal(3, 'week', '2026-01-01T00:00:00Z', '2026-04-01T00:00:00Z')
    expect(describePostGoalTotal(3, 'week', total)).toBe(
      '3 posts a week × 13 weeks = 39 posts in total.',
    )
  })

  it('reads as a singular where the numbers are one', () => {
    const total = postGoalTotal(1, 'month', '2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z')
    expect(describePostGoalTotal(1, 'month', total)).toBe(
      '1 post a month × 1 month = 1 post in total.',
    )
  })

  it('points at the dates rather than asserting a campaign-long total', () => {
    const total = postGoalTotal(5, 'month', null, null)
    expect(describePostGoalTotal(5, 'month', total)).toContain('Set the campaign dates')
    expect(describePostGoalTotal(5, 'month', total)).toContain('5 posts in total')
  })

  it('names what is missing instead of a total', () => {
    expect(describePostGoalTotal(null, 'month', { kind: 'needs-count' })).toContain(
      'will appear here',
    )
  })
})
