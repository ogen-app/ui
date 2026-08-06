import { describe, expect, it } from 'vitest'

import type { Campaign } from '@/types/campaigns'
import {
  describePostGoalTotal,
  NO_POST_GOAL,
  parsePostGoal,
  periodsInRange,
  postGoalTotal,
  seedPostGoal,
  type PostGoal,
  type PostGoalContext,
} from './postGoal'

const goal = (over: Partial<PostGoal> = {}): PostGoal => ({
  ...NO_POST_GOAL,
  enabled: true,
  perAccount: 3,
  ...over,
})

const ctx = (over: Partial<PostGoalContext> = {}): PostGoalContext => ({
  platforms: 2,
  accounts: 2,
  startDate: '2026-01-01T00:00:00Z',
  endDate: '2026-03-31T00:00:00Z',
  ...over,
})

describe('parsePostGoal', () => {
  it('reads nothing stored as nothing stored, not as a default', () => {
    expect(parsePostGoal(null)).toBeNull()
    expect(parsePostGoal('')).toBeNull()
    expect(parsePostGoal('not json')).toBeNull()
    expect(parsePostGoal('42')).toBeNull()
  })

  it('keeps a well-formed goal', () => {
    const stored = JSON.stringify({
      enabled: true,
      perAccount: 6,
      period: 'weekly',
      mode: 'default',
    })
    expect(parsePostGoal(stored)).toEqual({
      enabled: true,
      perAccount: 6,
      period: 'weekly',
      mode: 'default',
    })
  })

  it('falls back per field rather than dropping the whole goal', () => {
    const stored = JSON.stringify({
      enabled: true,
      perAccount: -4,
      period: 'fortnightly',
      mode: 'bespoke',
    })
    expect(parsePostGoal(stored)).toEqual({
      enabled: true,
      perAccount: 0,
      period: 'total',
      mode: 'default',
    })
  })
})

describe('seedPostGoal', () => {
  const campaign = (over: Partial<Campaign>) =>
    ({
      estimated_post_count: null,
      target_platforms: [],
      ...over,
    }) as Campaign

  it('leaves a campaign with no target without a goal', () => {
    expect(seedPostGoal(campaign({}), 3)).toEqual(NO_POST_GOAL)
    expect(seedPostGoal(campaign({ estimated_post_count: 0 }), 3)).toEqual(NO_POST_GOAL)
  })

  it('spreads an existing total across the connected accounts', () => {
    expect(seedPostGoal(campaign({ estimated_post_count: 12 }), 2)).toEqual({
      enabled: true,
      perAccount: 6,
      period: 'total',
      mode: 'default',
    })
  })

  it('round-trips back to the total it was seeded from', () => {
    const c = campaign({ estimated_post_count: 12 })
    const total = postGoalTotal(seedPostGoal(c, 2), ctx({ accounts: 2 }))
    expect(total).toMatchObject({ kind: 'ok', total: 12 })
  })

  it('reads a total with nothing connected yet as the goal for one account', () => {
    expect(seedPostGoal(campaign({ estimated_post_count: 9 }), 0).perAccount).toBe(9)
  })
})

describe('periodsInRange', () => {
  it('counts the whole campaign as one period', () => {
    expect(periodsInRange('total', null, null)).toBe(1)
  })

  it('counts both bounding days in a week span', () => {
    // Jan 1–7 inclusive is exactly one week, Jan 1–8 spills into a second.
    expect(periodsInRange('weekly', '2026-01-01T00:00:00Z', '2026-01-07T00:00:00Z')).toBe(1)
    expect(periodsInRange('weekly', '2026-01-01T00:00:00Z', '2026-01-08T00:00:00Z')).toBe(2)
  })

  it('counts calendar months, not 30-day blocks', () => {
    expect(periodsInRange('monthly', '2026-01-01T00:00:00Z', '2026-01-31T00:00:00Z')).toBe(1)
    expect(periodsInRange('monthly', '2026-01-01T00:00:00Z', '2026-02-15T00:00:00Z')).toBe(2)
    expect(periodsInRange('monthly', '2026-01-01T00:00:00Z', '2026-12-31T00:00:00Z')).toBe(12)
  })

  it('gives up on dates it cannot read', () => {
    expect(periodsInRange('weekly', null, '2026-01-08T00:00:00Z')).toBeNull()
    expect(periodsInRange('weekly', '2026-01-01T00:00:00Z', null)).toBeNull()
    expect(periodsInRange('monthly', 'whenever', '2026-01-08T00:00:00Z')).toBeNull()
    // End before start is not a range the goal can be counted over.
    expect(periodsInRange('weekly', '2026-02-01T00:00:00Z', '2026-01-01T00:00:00Z')).toBeNull()
  })
})

describe('postGoalTotal', () => {
  it('multiplies the goal by accounts and periods', () => {
    // 3 posts a week, 2 accounts, Jan 1 – Mar 31 (90 days → 13 weeks).
    expect(postGoalTotal(goal({ period: 'weekly' }), ctx())).toEqual({
      kind: 'ok',
      total: 78,
      periods: 13,
      accounts: 2,
    })
  })

  it('counts accounts, not platforms — two accounts on one platform is double', () => {
    const oneAccount = postGoalTotal(goal(), ctx({ platforms: 1, accounts: 1 }))
    const twoAccounts = postGoalTotal(goal(), ctx({ platforms: 1, accounts: 2 }))
    expect(oneAccount).toMatchObject({ kind: 'ok', total: 3 })
    expect(twoAccounts).toMatchObject({ kind: 'ok', total: 6 })
  })

  it('counts a total goal once per account', () => {
    expect(postGoalTotal(goal({ period: 'total' }), ctx())).toMatchObject({
      kind: 'ok',
      total: 6,
      periods: 1,
    })
  })

  it('needs a count before anything else', () => {
    expect(postGoalTotal(goal({ perAccount: 0 }), ctx())).toEqual({ kind: 'needs-count' })
    expect(postGoalTotal(goal({ enabled: false }), ctx())).toEqual({ kind: 'needs-count' })
  })

  it('separates "no platforms" from "no accounts on them"', () => {
    expect(postGoalTotal(goal(), ctx({ platforms: 0, accounts: 0 }))).toEqual({
      kind: 'needs-platforms',
    })
    expect(postGoalTotal(goal(), ctx({ platforms: 2, accounts: 0 }))).toEqual({
      kind: 'needs-accounts',
    })
  })

  it('needs dates only when the period is measured over them', () => {
    const undated = ctx({ startDate: null, endDate: null })
    expect(postGoalTotal(goal({ period: 'monthly' }), undated)).toEqual({ kind: 'needs-dates' })
    expect(postGoalTotal(goal({ period: 'total' }), undated)).toMatchObject({ kind: 'ok' })
  })
})

describe('describePostGoalTotal', () => {
  it('spells out the arithmetic behind the total', () => {
    const g = goal({ period: 'weekly' })
    expect(describePostGoalTotal(g, postGoalTotal(g, ctx()))).toBe(
      '3 posts × 2 accounts × 13 weeks = 78 posts in total.',
    )
  })

  it('drops the period from a whole-campaign goal', () => {
    const g = goal({ period: 'total', perAccount: 1 })
    expect(
      describePostGoalTotal(g, postGoalTotal(g, ctx({ platforms: 1, accounts: 1 }))),
    ).toBe('1 post × 1 account = 1 post in total.')
  })

  it('names what is missing instead of a total', () => {
    const g = goal({ period: 'monthly' })
    expect(describePostGoalTotal(g, { kind: 'needs-platforms' })).toContain('Add a platform')
    expect(describePostGoalTotal(g, { kind: 'needs-accounts' })).toContain(
      'Workspace Settings',
    )
    expect(describePostGoalTotal(g, { kind: 'needs-dates' })).toContain('a monthly goal')
    expect(describePostGoalTotal(g, { kind: 'needs-count' })).toContain(
      'will appear here',
    )
  })
})
