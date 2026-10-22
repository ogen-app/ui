import { describe, expect, it } from 'vitest'

import {
  SECONDARY_BENEFITS,
  billingOptions,
  offerBenefits,
  recommendedPlan,
  recommendedTier,
  yearlySaving,
  yearlySavingPercent,
} from './upgradeOffer'
import type { RawEntitlement, TierVersionPrice } from '@/types/entitlements'
import type { Tier } from '@/types/tiers'

const eur = (
  amount: number,
  interval: 'month' | 'year' = 'month',
  countryCode: string | null = null,
): TierVersionPrice => ({
  id: null,
  amount,
  currency: 'EUR',
  interval,
  countryCode,
  available: true,
})

function tier(
  id: string,
  entitlements: Record<string, RawEntitlement>,
  prices: TierVersionPrice[] = [],
  purchasable = true,
): Tier {
  return {
    id,
    tierId: id,
    name: id,
    purchasable,
    changeReason: '',
    prices,
    entitlements,
    available: true,
    freeTrial: false,
    trialDays: null,
  }
}

const TRIAL: Record<string, RawEntitlement> = {
  active_campaigns: { limit: 1 },
  team_seats: { limit: 1 },
  connected_accounts: { limit: 2 },
  all_campaign_types: { allowed: false },
  plan_runs_per_month: { limit: 3, reset: 'monthly' },
  multiple_accounts_per_platform: { allowed: false },
}

const PRO = tier(
  'pro',
  {
    active_campaigns: { limit: 5 },
    team_seats: { limit: 3 },
    connected_accounts: { limit: 6 },
    all_campaign_types: { allowed: true },
    plan_runs_per_month: { limit: 10, reset: 'monthly' },
    multiple_accounts_per_platform: { allowed: false },
  },
  [eur(2900), eur(29000, 'year')],
)

const MAX = tier(
  'max',
  {
    active_campaigns: { limit: null },
    team_seats: { limit: null },
    connected_accounts: { limit: 30 },
    all_campaign_types: { allowed: true },
    plan_runs_per_month: { limit: 100, reset: 'monthly' },
    multiple_accounts_per_platform: { allowed: true },
  },
  [eur(7900)],
)

describe('recommendedTier', () => {
  it('offers the cheapest plan that grants more of the refused feature', () => {
    expect(recommendedTier('active_campaigns', TRIAL, [MAX, PRO])?.id).toBe(
      'pro',
    )
  })

  it('skips a cheaper plan that does not clear the wall', () => {
    // Pro has no second account per platform, so the step up is Max.
    expect(
      recommendedTier('multiple_accounts_per_platform', TRIAL, [PRO, MAX])?.id,
    ).toBe('max')
  })

  it('never offers what cannot be bought', () => {
    const retired = tier('pro-v0', PRO.entitlements, [eur(100)], false)
    expect(recommendedTier('active_campaigns', TRIAL, [retired, PRO])?.id).toBe(
      'pro',
    )
  })

  it('offers the nearest step up when nothing is priced', () => {
    const pro = tier('pro', PRO.entitlements)
    const max = tier('max', MAX.entitlements)
    expect(recommendedTier('active_campaigns', TRIAL, [max, pro])?.id).toBe(
      'pro',
    )
  })

  it('prefers a priced plan over an unpriced one', () => {
    const unpriced = tier('pro', PRO.entitlements)
    expect(
      recommendedTier('active_campaigns', TRIAL, [unpriced, MAX])?.id,
    ).toBe('max')
  })

  it('answers null from the top of the ladder', () => {
    expect(
      recommendedTier('active_campaigns', MAX.entitlements, [PRO, MAX]),
    ).toBeNull()
  })

  it('reads an exclusion as less than any allowance', () => {
    expect(recommendedTier('all_campaign_types', TRIAL, [PRO])?.id).toBe('pro')
  })
})

describe('offerBenefits', () => {
  it('leads with the refused feature, then what else the plan beats', () => {
    const { primary, secondary } = offerBenefits('active_campaigns', TRIAL, PRO)
    expect(primary).toEqual({
      key: 'active_campaigns',
      value: { kind: 'limit', limit: 5, reset: null },
    })
    expect(secondary.map((f) => f.key)).toEqual([
      'team_seats',
      'connected_accounts',
      'all_campaign_types',
      'plan_runs_per_month',
    ])
  })

  it('never repeats the refused feature and caps the rest', () => {
    const { secondary } = offerBenefits('team_seats', TRIAL, MAX)
    expect(secondary.map((f) => f.key)).not.toContain('team_seats')
    expect(secondary).toHaveLength(SECONDARY_BENEFITS)
  })

  it('leaves out anything the plan does not improve', () => {
    const { secondary } = offerBenefits('active_campaigns', TRIAL, PRO)
    expect(secondary.map((f) => f.key)).not.toContain(
      'multiple_accounts_per_platform',
    )
  })

  it('has no primary tile for an allowance we never print', () => {
    expect(offerBenefits('assistant_multiplier', TRIAL, PRO).primary).toBeNull()
  })
})

describe('billingOptions', () => {
  it('returns both intervals when the plan is sold on both', () => {
    expect(billingOptions(PRO)).toEqual({
      month: eur(2900),
      year: eur(29000, 'year'),
    })
  })

  it('never picks a country-specific row', () => {
    const t = tier('x', {}, [eur(1000, 'month', 'DE'), eur(2000)])
    expect(billingOptions(t).month).toEqual(eur(2000))
  })

  it('keeps the yearly price in the monthly one’s currency', () => {
    const usdYear: TierVersionPrice = {
      id: null,
      amount: 30000,
      currency: 'USD',
      interval: 'year',
      countryCode: null,
      available: true,
    }
    const t = tier('x', {}, [eur(2900), usdYear])
    expect(billingOptions(t).year).toBeNull()
  })

  it('works out the yearly saving in minor units', () => {
    expect(yearlySaving(eur(2900), eur(29000, 'year'))).toBe(5800)
  })
})

describe('recommendedPlan', () => {
  const trial = tier('trial', TRIAL, [eur(0)])

  it('frames the cheapest paid plan, never the free one', () => {
    expect(recommendedPlan([trial, MAX, PRO])?.id).toBe('pro')
  })

  it('frames nothing when no plan costs anything', () => {
    expect(recommendedPlan([trial, tier('unpriced', {})])).toBeNull()
  })

  it('skips a plan that cannot be bought', () => {
    const retired = tier('old', TRIAL, [eur(1000)], false)
    expect(recommendedPlan([retired, PRO])?.id).toBe('pro')
  })

  it('compares prices only within one currency', () => {
    // 2000 yen is fewer units than 29 euros and is not cheaper. With no
    // exchange rates, a price in another currency cannot win.
    const yen = tier('yen', TRIAL, [
      {
        id: null,
        amount: 2000,
        currency: 'JPY',
        interval: 'month',
        countryCode: null,
        available: true,
      },
    ])
    expect(recommendedPlan([PRO, yen])?.id).toBe('pro')
  })
})

describe('yearlySavingPercent', () => {
  it('states the best saving across the plans, floored', () => {
    // Pro: 29000 a year against 12 × 2900 = 34800 → 16.67%, floored to 16.
    expect(yearlySavingPercent([PRO, MAX])).toBe(16)
  })

  it('says nothing when no plan is sold yearly', () => {
    expect(yearlySavingPercent([MAX])).toBeNull()
  })

  it('says nothing when the year costs as much as twelve months', () => {
    const flat = tier('flat', TRIAL, [eur(1000), eur(12000, 'year')])
    expect(yearlySavingPercent([flat])).toBeNull()
  })
})
