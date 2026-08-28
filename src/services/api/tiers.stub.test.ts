import { beforeEach, describe, expect, it } from 'vitest'

import { stubListTiers, stubResetPlan, stubSelectTier, stubWorkspacePlan } from './tiers.stub'

/**
 * The stub is standing in for the server, so what is asserted here is the
 * *server's* behaviour — the rules a real `POST /api/workspace/plan` has to
 * implement, written down where they can be run. When the endpoint lands these
 * become its acceptance criteria rather than dead scaffolding.
 */

const TRIAL = 'tier_trial_2026_08_01'
const PRO = 'tier_pro_2026_08_01'
const MAX = 'tier_max_2026_08_01'
const LEGACY_PRO = 'tier_pro_2026_01_01'

const AUGUST = new Date('2026-08-22T12:00:00Z')

beforeEach(() => {
  stubResetPlan()
})

describe('the tier list', () => {
  it('keeps a superseded version in the list, marked unbuyable', () => {
    // A workspace keeps the version it bought, so the plan screen routinely
    // has to name a tier nobody can buy today.
    return stubListTiers().then((tiers) => {
      const legacy = tiers.find((tier) => tier.id === LEGACY_PRO)
      expect(legacy?.available).toBe(false)
      expect(tiers.filter((tier) => tier.available).map((tier) => tier.id)).toEqual([
        TRIAL,
        PRO,
        MAX,
      ])
    })
  })

  it('never hands the client a way to rank tiers', () => {
    // Ordering configurable tiers is the server's judgement — it is why
    // `direction` arrives on the wire instead of being worked out here.
    return stubListTiers().then((tiers) => {
      for (const tier of tiers) expect(tier).not.toHaveProperty('rank')
    })
  })
})

describe('the plan', () => {
  it('starts on the trial, with nothing scheduled', async () => {
    const plan = await stubWorkspacePlan()
    expect(plan.tier.id).toBe(TRIAL)
    expect(plan.tier.scheduled_change).toBeNull()
  })

  it('puts the workspace tally beside every limit', async () => {
    // A limit with no counter can only be enforced after the click. The join
    // is the endpoint's job, which is why it isn't a second request.
    const plan = await stubWorkspacePlan()
    expect(plan.entitlements?.campaigns).toEqual({ limit: 1, used: 3 })
  })

  it('leaves a boolean entitlement without a counter', async () => {
    // There is no allowance to count against a yes/no, and inventing a `used`
    // for one would put a meter under a lock that has no numbers in it.
    const plan = await stubWorkspacePlan()
    expect(plan.entitlements?.brand_personas).toEqual({ allowed: false })
  })

  it('dates the reset only where there is a period to reset', async () => {
    const plan = await stubWorkspacePlan()
    expect(plan.entitlements?.content_plan_runs).toMatchObject({
      limit: 3,
      period: 'month',
      resets_at: expect.any(String),
    })
    expect(plan.entitlements?.post_versions).not.toHaveProperty('resets_at')
  })
})

describe('choosing a tier', () => {
  it('applies an upgrade immediately', async () => {
    const plan = await stubSelectTier(MAX, AUGUST)
    expect(plan.tier.id).toBe(MAX)
    expect(plan.tier.scheduled_change).toBeNull()
    // And the allowances move with it, in the same answer.
    expect(plan.entitlements?.campaigns).toEqual({ limit: null, used: 3 })
  })

  it('holds a downgrade until the next billing boundary', async () => {
    await stubSelectTier(MAX, AUGUST)
    const plan = await stubSelectTier(TRIAL, AUGUST)

    // Still on Max, still with Max's allowances — nothing is taken away on
    // the click.
    expect(plan.tier.id).toBe(MAX)
    expect(plan.entitlements?.campaigns).toEqual({ limit: null, used: 3 })
    expect(plan.tier.scheduled_change).toMatchObject({
      id: TRIAL,
      direction: 'downgrade',
      // A month on from the day Max was chosen: the boundary is the renewal,
      // because the downgrade lands on the invoice that would have charged for
      // the tier being left.
      effective_from: '2026-09-22T12:00:00.000Z',
    })
  })

  it('calls a scheduled downgrade off when the current tier is chosen again', async () => {
    await stubSelectTier(PRO, AUGUST)
    await stubSelectTier(TRIAL, AUGUST)
    const plan = await stubSelectTier(PRO, AUGUST)

    expect(plan.tier.id).toBe(PRO)
    expect(plan.tier.scheduled_change).toBeNull()
  })

  it('reports the direction rather than leaving it to be inferred', async () => {
    // "Max starts on the 1st" and "you drop to Trial on the 1st" are different
    // warnings, and the dates alone cannot tell them apart.
    await stubSelectTier(PRO, AUGUST)
    const plan = await stubSelectTier(TRIAL, AUGUST)
    expect(plan.tier.scheduled_change?.direction).toBe('downgrade')
  })

  it('survives a tier id it does not recognise', async () => {
    await stubSelectTier(PRO, AUGUST)
    const plan = await stubSelectTier('tier_that_was_deleted', AUGUST)
    expect(plan.tier.id).toBe(PRO)
  })

  it('keeps the choice across a reload', async () => {
    await stubSelectTier(PRO, AUGUST)
    const plan = await stubWorkspacePlan()
    expect(plan.tier.id).toBe(PRO)
  })

  it('falls back to the seed when the stored tier no longer exists', async () => {
    // An id from an older seed would resolve to no allowances at all, which
    // reads as a broken app rather than as a stale stub.
    localStorage.setItem('stub-plan', JSON.stringify({ tierId: 'tier_gone', since: 'x' }))
    const plan = await stubWorkspacePlan()
    expect(plan.tier.id).toBe(TRIAL)
  })
})
