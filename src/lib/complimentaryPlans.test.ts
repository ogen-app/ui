import { describe, expect, it } from 'vitest'

import type { WorkspacePlan } from '@/types/entitlements'
import type { Tier } from '@/types/tiers'
import {
  complimentaryColumns,
  isComplimentaryPicker,
} from './complimentaryPlans'

function tier(tierId: string, available = true): Tier {
  return {
    id: `ttv-${tierId}-v1`,
    tierId,
    name: tierId,
    purchasable: true,
    changeReason: '',
    prices: [],
    entitlements: {},
    available,
    freeTrial: tierId === 'pro',
    trialDays: tierId === 'pro' ? 30 : null,
  }
}

function plan(
  complimentary: boolean,
  billingPeriod: 'month' | null = null,
): WorkspacePlan {
  return {
    tier: {
      id: 'v',
      tierId: 'beta',
      name: 'Beta',
      purchasable: false,
      changeReason: '',
      prices: [],
      effectiveFrom: null,
      billingPeriod,
      renewsAt: null,
      trialEndsAt: null,
      scheduled: null,
    },
    billing: { required: false, trialEligible: true, complimentary },
    entitlements: {},
  }
}

describe('isComplimentaryPicker', () => {
  it('is the comp picker for a comped workspace with no subscription', () => {
    expect(isComplimentaryPicker(plan(true))).toBe(true)
  })

  it('is not, for a grandfathered workspace that also pays nothing', () => {
    // billing_required false and no subscription, exactly like a tester — the
    // reason the server added the flag at all.
    expect(isComplimentaryPicker(plan(false))).toBe(false)
  })

  it('follows the paid paths when a comped workspace holds a subscription anyway', () => {
    expect(isComplimentaryPicker(plan(true, 'month'))).toBe(false)
  })
})

describe('complimentaryColumns', () => {
  const offered = [tier('starter'), tier('pro'), tier('max')]

  it('offers every other tier as a free switch, and states the one held', () => {
    expect(
      complimentaryColumns(offered, 'max', true).map((c) => c.action),
    ).toEqual([{ kind: 'switch' }, { kind: 'switch' }, { kind: 'held' }])
  })

  it('shows no money: one label, no free month, nothing pushed', () => {
    const columns = complimentaryColumns(offered, 'starter', true)
    expect(columns.every((c) => c.label === 'freeWhileTesting')).toBe(true)
  })

  it('still offers a tier Lemon Squeezy cannot sell — billing may be off', () => {
    // `available` is "sellable now"; the comp branch runs before billing.
    const columns = complimentaryColumns(
      [tier('starter', false), tier('pro', false)],
      'beta',
      true,
    )
    expect(columns.map((c) => c.action.kind)).toEqual(['switch', 'switch'])
  })

  it('gives a member nothing to press', () => {
    expect(
      complimentaryColumns(offered, 'max', false).map((c) => c.action.kind),
    ).toEqual(['none', 'none', 'none'])
  })
})
