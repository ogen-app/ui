import { beforeEach, describe, expect, it } from 'vitest'

import {
  stubListTiers,
  stubResetPlan,
  stubSelectTier,
  stubWorkspacePlan,
} from './tiers.stub'

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
      expect(
        tiers.filter((tier) => tier.available).map((tier) => tier.id),
      ).toEqual([TRIAL, PRO, MAX])
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
    expect(plan.tier.scheduled).toBeNull()
  })

  it('states a tier allowance, leaving the tally to be laid over it', async () => {
    // The counters moved to `entitlements.seed.ts` (CON-243), so that the stub
    // and the real endpoint are counted from one table rather than two that
    // drift. What the stub owns is the *allowance*.
    const plan = await stubWorkspacePlan()
    expect(plan.entitlements.active_campaigns).toMatchObject({
      limit: 1,
      reset: 'standing',
    })
  })

  it('leaves a boolean entitlement without an allowance', async () => {
    // There is nothing to count against a yes/no, and inventing a limit for one
    // would put a meter under a lock that has no numbers in it.
    const plan = await stubWorkspacePlan()
    expect(plan.entitlements.multiple_accounts_per_platform).toEqual({
      allowed: false,
    })
  })

  it('dates the reset only where the allowance actually refills', async () => {
    const plan = await stubWorkspacePlan()
    expect(plan.entitlements.plan_runs_per_month).toMatchObject({
      limit: 3,
      reset: 'monthly',
      resetsAt: expect.any(String),
    })
    // A standing ceiling and a lifetime total never return to zero.
    expect(plan.entitlements.posts_total).not.toHaveProperty('resetsAt')
    expect(plan.entitlements.media_storage_bytes).not.toHaveProperty('resetsAt')
  })
})

describe('choosing a tier', () => {
  it('applies an upgrade immediately', async () => {
    const plan = await stubSelectTier(MAX, AUGUST)
    expect(plan.tier.id).toBe(MAX)
    expect(plan.tier.scheduled).toBeNull()
    // And the allowances move with it, in the same answer.
    expect(plan.entitlements.active_campaigns.limit).toBeNull()
  })

  it('holds a downgrade until the next billing boundary', async () => {
    await stubSelectTier(MAX, AUGUST)
    const plan = await stubSelectTier(TRIAL, AUGUST)

    // Still on Max, still with Max's allowances — nothing is taken away on
    // the click.
    expect(plan.tier.id).toBe(MAX)
    expect(plan.entitlements.active_campaigns.limit).toBeNull()
    expect(plan.tier.scheduled).toMatchObject({
      id: TRIAL,
      direction: 'downgrade',
      // A month on from the day Max was chosen: the boundary is the renewal,
      // because the downgrade lands on the invoice that would have charged for
      // the tier being left.
      effectiveFrom: '2026-09-22T12:00:00.000Z',
    })
  })

  it('calls a scheduled downgrade off when the current tier is chosen again', async () => {
    await stubSelectTier(PRO, AUGUST)
    await stubSelectTier(TRIAL, AUGUST)
    const plan = await stubSelectTier(PRO, AUGUST)

    expect(plan.tier.id).toBe(PRO)
    expect(plan.tier.scheduled).toBeNull()
  })

  it('reports the direction rather than leaving it to be inferred', async () => {
    // "Max starts on the 1st" and "you drop to Trial on the 1st" are different
    // warnings, and the dates alone cannot tell them apart.
    await stubSelectTier(PRO, AUGUST)
    const plan = await stubSelectTier(TRIAL, AUGUST)
    expect(plan.tier.scheduled?.direction).toBe('downgrade')
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

  it('lands a scheduled downgrade once its boundary has passed', async () => {
    // The server applies the change when the cycle rolls over, so a plan read
    // after the boundary answers with the new tier — a "scheduled" change that
    // never lands would leave the workspace on the old tier forever.
    await stubSelectTier(MAX, AUGUST)
    await stubSelectTier(TRIAL, AUGUST)

    const afterBoundary = new Date('2026-09-23T12:00:00Z')
    const plan = await stubWorkspacePlan(afterBoundary)
    expect(plan.tier.id).toBe(TRIAL)
    expect(plan.tier.scheduled).toBeNull()
    // And the allowances land with it.
    expect(plan.entitlements.active_campaigns.limit).toBe(1)
  })

  it('persists a landed change rather than re-deriving it per read', async () => {
    await stubSelectTier(MAX, AUGUST)
    await stubSelectTier(TRIAL, AUGUST)
    await stubWorkspacePlan(new Date('2026-09-23T12:00:00Z'))

    // A read dated before the boundary now answers the landed tier: the
    // change has been applied and written, not recomputed from the clock.
    const plan = await stubWorkspacePlan(AUGUST)
    expect(plan.tier.id).toBe(TRIAL)
    expect(plan.tier.scheduled).toBeNull()
  })

  it('ranks a later choice against the landed tier, not the one left behind', async () => {
    await stubSelectTier(MAX, AUGUST)
    await stubSelectTier(TRIAL, AUGUST)

    // After the downgrade to Trial has landed, choosing Pro is an upgrade from
    // Trial — it applies now, instead of being scheduled as a downgrade from
    // the Max the workspace is no longer on.
    const plan = await stubSelectTier(PRO, new Date('2026-09-23T12:00:00Z'))
    expect(plan.tier.id).toBe(PRO)
    expect(plan.tier.scheduled).toBeNull()
  })

  it('falls back to the seed when the stored tier no longer exists', async () => {
    // An id from an older seed would resolve to no allowances at all, which
    // reads as a broken app rather than as a stale stub.
    localStorage.setItem(
      'stub-plan',
      JSON.stringify({ tierId: 'tier_gone', since: 'x' }),
    )
    const plan = await stubWorkspacePlan()
    expect(plan.tier.id).toBe(TRIAL)
  })
})
