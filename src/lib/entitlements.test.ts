import { describe, expect, it } from 'vitest'

import {
  UNGATED,
  remaining,
  resolveEntitlement,
  usagePeriod,
} from './entitlements'
import type { WorkspacePlan } from '@/types/entitlements'

/**
 * The policy, asserted rather than described.
 *
 * Most of these guard a direction rather than a value: when the answer is
 * uncertain the client resolves towards *showing* the feature, because the
 * server is the thing that enforces and a wrong lock is worse than a wrong
 * offer. A refactor that quietly inverted one of those would still typecheck
 * and would still look right on a screen where the plan happens to be loaded.
 */

function plan(entitlements: WorkspacePlan['entitlements']): WorkspacePlan {
  return {
    tier: {
      id: 'tier_pro_2026_01_01',
      name: 'Pro',
      effectiveFrom: '2026-01-01T00:00:00Z',
      billingPeriod: 'month',
      renewsAt: '2026-09-22T00:00:00Z',
      scheduled: null,
    },
    entitlements,
  }
}

describe('resolveEntitlement', () => {
  it('is pending, not denied, before the plan arrives', () => {
    // The failure this prevents: an upgrade wall shown to a paying customer
    // because a request was in flight.
    expect(resolveEntitlement('campaigns', undefined)).toEqual({
      state: 'pending',
    })
  })

  it('allows a key the tier settings never mention', () => {
    // Default-allow. A feature nobody decided to charge for is free, so
    // shipping one does not need every tier taught about it first.
    expect(resolveEntitlement('brand_voices', plan({}))).toEqual(UNGATED)
  })

  it('denies by tier when the settings say so outright', () => {
    const result = resolveEntitlement(
      'multiple_accounts_per_platform',
      plan({ multiple_accounts_per_platform: { allowed: false } }),
    )
    expect(result).toEqual({ state: 'denied', reason: 'tier' })
  })

  it('reports usage while there is room left', () => {
    const result = resolveEntitlement(
      'campaigns',
      plan({ campaigns: { limit: 5, used: 3 } }),
    )
    expect(result).toEqual({
      state: 'allowed',
      usage: { limit: 5, used: 3, period: null, resetsAt: null },
    })
  })

  it('denies by limit — a separate reason from the tier', () => {
    // Different news, different answer: this one is often solved by waiting,
    // so the call site has to be able to tell them apart.
    const result = resolveEntitlement(
      'content_plan_runs',
      plan({ content_plan_runs: { limit: 10, used: 10, period: 'month' } }),
    )
    expect(result).toEqual({
      state: 'denied',
      reason: 'limit',
      usage: { limit: 10, used: 10, period: 'month', resetsAt: null },
    })
  })

  it('refuses the sixth when five are held under a limit of five', () => {
    // `used >= limit`, because every call site is asking "may I add one more".
    const atLimit = resolveEntitlement(
      'campaigns',
      plan({ campaigns: { limit: 5, used: 5 } }),
    )
    expect(atLimit.state).toBe('denied')
    const belowLimit = resolveEntitlement(
      'campaigns',
      plan({ campaigns: { limit: 5, used: 4 } }),
    )
    expect(belowLimit.state).toBe('allowed')
  })

  it('treats a null limit as unlimited, however much is used', () => {
    // And keeps the usage, so a Max workspace can still be shown its own size.
    const result = resolveEntitlement(
      'seats',
      plan({ seats: { limit: null, used: 400 } }),
    )
    expect(result).toEqual({
      state: 'allowed',
      usage: { limit: null, used: 400, period: null, resetsAt: null },
    })
  })

  it('keeps unlimited distinct from ungated', () => {
    // Both allow, and they are not the same thing: one is a tier that paid to
    // have no ceiling, the other is a feature nobody priced. Only the first can
    // be shown the word "Unlimited".
    const unlimited = resolveEntitlement(
      'seats',
      plan({ seats: { limit: null, used: 1 } }),
    )
    const ungated = resolveEntitlement('seats', plan({}))
    expect(unlimited).not.toEqual(ungated)
    expect(ungated.state === 'allowed' && ungated.usage).toBeNull()
  })

  it('reads a bare limit as metered rather than as a verdict', () => {
    // `allowed` absent means "no verdict stated", not "denied" — the entry is
    // stating a ceiling.
    const result = resolveEntitlement(
      'campaigns',
      plan({ campaigns: { limit: 1, used: 0 } }),
    )
    expect(result.state).toBe('allowed')
  })

  it('ignores a key it has never heard of', () => {
    // The tier list is edited by hand and will grow keys before a deployed
    // client knows them. Asking about a key that is there answers normally;
    // the unknown one is simply not asked about.
    const p = plan({
      some_future_feature: { allowed: false },
      campaigns: { limit: 2, used: 0 },
    })
    expect(resolveEntitlement('campaigns', p).state).toBe('allowed')
  })

  it('does not put a meter on a plain yes/no', () => {
    const result = resolveEntitlement(
      'post_assistant',
      plan({ post_assistant: { allowed: true } }),
    )
    expect(result).toEqual(UNGATED)
  })
})

describe('usagePeriod', () => {
  it('keeps the periods this build can name', () => {
    expect(usagePeriod('month')).toBe('month')
    expect(usagePeriod('publish')).toBe('publish')
  })

  it('drops one it cannot, rather than passing it through', () => {
    // Losing "this quarter" off a meter costs a phrase. Printing the wrong
    // period costs the user's trust in the number beside it.
    expect(usagePeriod('quarter')).toBeNull()
    expect(usagePeriod(null)).toBeNull()
    expect(usagePeriod(undefined)).toBeNull()
  })
})

describe('remaining', () => {
  it('counts down to zero and stops there', () => {
    expect(remaining({ limit: 5, used: 3, period: null, resetsAt: null })).toBe(
      2,
    )
    // Over-limit is reachable without anyone cheating: a downgrade lands on a
    // workspace that is already past the new ceiling.
    expect(remaining({ limit: 1, used: 4, period: null, resetsAt: null })).toBe(
      0,
    )
  })

  it('has no answer for unlimited', () => {
    expect(
      remaining({ limit: null, used: 3, period: null, resetsAt: null }),
    ).toBeNull()
  })
})
