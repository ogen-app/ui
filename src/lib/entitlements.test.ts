import { describe, expect, it } from 'vitest'

import {
  UNGATED,
  remaining,
  resolveEntitlement,
  usageReset,
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
      id: 'ttv-pro-v1',
      tierId: 'pro',
      name: 'Pro',
      purchasable: true,
      changeReason: '',
      prices: [],
      effectiveFrom: null,
      billingPeriod: null,
      renewsAt: null,
      scheduled: null,
    },
    entitlements,
  }
}

describe('resolveEntitlement', () => {
  it('is pending, not denied, before the plan arrives', () => {
    // The failure this prevents: an upgrade wall shown to a paying customer
    // because a request was in flight.
    expect(resolveEntitlement('active_campaigns', undefined)).toEqual({
      state: 'pending',
    })
  })

  it('allows a key the tier settings never mention', () => {
    // Default-allow. A feature nobody decided to charge for is free, so
    // shipping one does not need every tier taught about it first.
    expect(resolveEntitlement('posts_total', plan({}))).toEqual(UNGATED)
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
      'active_campaigns',
      plan({ active_campaigns: { limit: 5, used: 3 } }),
    )
    expect(result).toEqual({
      state: 'allowed',
      usage: { limit: 5, used: 3, reset: null, resetsAt: null },
    })
  })

  it('denies by limit — a separate reason from the tier', () => {
    // Different news, different answer: this one is often solved by waiting,
    // so the call site has to be able to tell them apart.
    const result = resolveEntitlement(
      'plan_runs_per_month',
      plan({ plan_runs_per_month: { limit: 10, used: 10, reset: 'monthly' } }),
    )
    expect(result).toEqual({
      state: 'denied',
      reason: 'limit',
      usage: { limit: 10, used: 10, reset: 'monthly', resetsAt: null },
    })
  })

  it('refuses the sixth when five are held under a limit of five', () => {
    // `used >= limit`, because every call site is asking "may I add one more".
    const atLimit = resolveEntitlement(
      'active_campaigns',
      plan({ active_campaigns: { limit: 5, used: 5 } }),
    )
    expect(atLimit.state).toBe('denied')
    const belowLimit = resolveEntitlement(
      'active_campaigns',
      plan({ active_campaigns: { limit: 5, used: 4 } }),
    )
    expect(belowLimit.state).toBe('allowed')
  })

  it('treats a null limit as unlimited, however much is used', () => {
    // And keeps the usage, so a Max workspace can still be shown its own size.
    const result = resolveEntitlement(
      'team_seats',
      plan({ team_seats: { limit: null, used: 400 } }),
    )
    expect(result).toEqual({
      state: 'allowed',
      usage: { limit: null, used: 400, reset: null, resetsAt: null },
    })
  })

  it('keeps unlimited distinct from ungated', () => {
    // Both allow, and they are not the same thing: one is a tier that paid to
    // have no ceiling, the other is a feature nobody priced. Only the first can
    // be shown the word "Unlimited".
    const unlimited = resolveEntitlement(
      'team_seats',
      plan({ team_seats: { limit: null, used: 1 } }),
    )
    const ungated = resolveEntitlement('team_seats', plan({}))
    expect(unlimited).not.toEqual(ungated)
    expect(ungated.state === 'allowed' && ungated.usage).toBeNull()
  })

  it('reads a bare limit as metered rather than as a verdict', () => {
    // `allowed` absent means "no verdict stated", not "denied" — the entry is
    // stating a ceiling.
    const result = resolveEntitlement(
      'active_campaigns',
      plan({ active_campaigns: { limit: 1, used: 0 } }),
    )
    expect(result.state).toBe('allowed')
  })

  it('ignores a key it has never heard of', () => {
    // The tier list is edited by hand and will grow keys before a deployed
    // client knows them. Asking about a key that is there answers normally;
    // the unknown one is simply not asked about.
    const p = plan({
      some_future_feature: { allowed: false },
      active_campaigns: { limit: 2, used: 0 },
    })
    expect(resolveEntitlement('active_campaigns', p).state).toBe('allowed')
  })

  it('does not put a meter on a plain yes/no', () => {
    const result = resolveEntitlement(
      'all_campaign_types',
      plan({ all_campaign_types: { allowed: true } }),
    )
    expect(result).toEqual(UNGATED)
  })

  it('allows an uncounted limit rather than guessing at it', () => {
    // The common case against the real endpoint, which ships allowances and no
    // tally (CON-243). There is no way to know whether the allowance is spent,
    // and the rule the whole file follows is to resolve towards offering: the
    // server refuses what isn't granted, so being wrong this way costs a denial
    // one click later, while being wrong the other way locks a paying workspace
    // out of something it has not used.
    const result = resolveEntitlement(
      'active_campaigns',
      plan({ active_campaigns: { limit: 1, used: null } }),
    )
    expect(result).toEqual({
      state: 'allowed',
      usage: { limit: 1, used: null, reset: null, resetsAt: null },
    })
  })

  it('still carries the limit on an uncounted allowance', () => {
    // So a meter beside the control can say what the ceiling is even while it
    // cannot say how much of it is gone.
    const result = resolveEntitlement(
      'posts_total',
      plan({ posts_total: { limit: 15, used: null, reset: 'total' } }),
    )
    expect(result.state === 'allowed' && result.usage?.limit).toBe(15)
  })

  it('reads an absent counter as uncounted, not as zero', () => {
    // `used` left off entirely is the same fact as `used: null`. Defaulting it
    // to 0 would claim nothing had been used, on the authority of nobody.
    const result = resolveEntitlement(
      'active_campaigns',
      plan({ active_campaigns: { limit: 5 } }),
    )
    expect(result.state === 'allowed' && result.usage?.used).toBeNull()
  })
})

describe('usageReset', () => {
  it("keeps the server's four words", () => {
    expect(usageReset('standing')).toBe('standing')
    expect(usageReset('monthly')).toBe('monthly')
    expect(usageReset('total')).toBe('total')
    expect(usageReset('per_post')).toBe('per_post')
  })

  it('drops one it cannot name, rather than passing it through', () => {
    // Losing "this quarter" off a meter costs a phrase. Printing the wrong
    // period costs the user's trust in the number beside it.
    expect(usageReset('quarterly')).toBeNull()
    // The words this build used to use are among the ones it must now drop —
    // the vocabulary changed wholesale when the catalog arrived (CON-243).
    expect(usageReset('month')).toBeNull()
    expect(usageReset(null)).toBeNull()
    expect(usageReset(undefined)).toBeNull()
  })
})

describe('remaining', () => {
  it('counts down to zero and stops there', () => {
    expect(remaining({ limit: 5, used: 3, reset: null, resetsAt: null })).toBe(
      2,
    )
    // Over-limit is reachable without anyone cheating: a downgrade lands on a
    // workspace that is already past the new ceiling.
    expect(remaining({ limit: 1, used: 4, reset: null, resetsAt: null })).toBe(
      0,
    )
  })

  it('has no answer for unlimited', () => {
    expect(
      remaining({ limit: null, used: 3, reset: null, resetsAt: null }),
    ).toBeNull()
  })

  it('has no answer for uncounted either', () => {
    // Different fact, same silence: the caller has no number to print in either
    // case, and which one it is stays readable on the `Usage` itself.
    expect(
      remaining({ limit: 5, used: null, reset: null, resetsAt: null }),
    ).toBeNull()
  })
})
