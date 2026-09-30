import { describe, expect, it } from 'vitest'

import { SEED_CATALOG, withSeededUsage } from './entitlements.seed'
import { TIER_FEATURE_ORDER } from '@/lib/tierFeatures'
import type { EntitlementKey, WorkspacePlan } from '@/types/entitlements'

/**
 * That the keys this build asks about are keys the server actually has.
 *
 * This is the test the whole seed exists for. Under the default-allow rule an
 * unknown key does not throw and does not lock anything — `resolveEntitlement`
 * reads it as *ungated* and the feature works, everywhere, silently. So a key
 * renamed on the server has no visible symptom at all: the gate simply stops
 * being a gate. That is exactly what the client was doing before CON-243, asking
 * about `seats`, `campaigns` and `content_plan_runs` against a catalog holding
 * `team_seats`, `active_campaigns` and `plan_runs_per_month`.
 *
 * Re-sync `entitlements.seed.json` by re-reading `GET /api/public/pricing`, not
 * by editing it to make this pass.
 */

/**
 * Every key the client is prepared to ask about.
 *
 * Written out rather than derived, because `EntitlementKey` is a type and there
 * is nothing at runtime to enumerate. `satisfies` is what keeps the two in step:
 * a key added to the union and not to this list fails to compile below.
 */
const ASKED_ABOUT = [
  'workspaces',
  'team_seats',
  'connected_accounts',
  'active_campaigns',
  'all_campaign_types',
  'custom_campaign_types',
  'plan_runs_per_month',
  'assistant_multiplier',
  'quality_reviews_per_post',
  'posts_total',
  'media_storage_bytes',
  'content_bank_assets',
  'web_page_imports',
  'multiple_accounts_per_platform',
] as const satisfies readonly EntitlementKey[]

// A key in the union but missing from the list above would make this assignment
// fail, which is the half `satisfies` cannot check on its own.
const _EXHAUSTIVE: EntitlementKey = ASKED_ABOUT[0] satisfies EntitlementKey
void _EXHAUSTIVE

describe('the catalog the client asks against', () => {
  it('has every key this build gates on', () => {
    const known = new Set(SEED_CATALOG.map((entry) => entry.key))
    const missing = ASKED_ABOUT.filter((key) => !known.has(key))
    expect(missing).toEqual([])
  })

  it('agrees about which keys are verdicts and which are allowances', () => {
    // A boolean read as numeric resolves to *ungated* rather than to a lock,
    // and a numeric read as boolean throws away the limit. Both are silent.
    const byKey = new Map(SEED_CATALOG.map((entry) => [entry.key, entry]))
    const booleans = ASKED_ABOUT.filter(
      (key) => byKey.get(key)?.value_type === 'boolean',
    )
    expect(booleans).toEqual([
      'all_campaign_types',
      'custom_campaign_types',
      'multiple_accounts_per_platform',
    ])
  })

  it('uses only reset words the client can name', () => {
    const KNOWN = ['standing', 'monthly', 'total', 'per_post']
    const unknown = SEED_CATALOG.filter(
      (entry) => entry.reset !== undefined && !KNOWN.includes(entry.reset),
    ).map((entry) => entry.reset)
    expect(unknown).toEqual([])
  })

  it('gives every row on the comparison table a key the server has', () => {
    const known = new Set(SEED_CATALOG.map((entry) => entry.key))
    expect(TIER_FEATURE_ORDER.filter((key) => !known.has(key))).toEqual([])
  })

  it('keeps the Post Assistant allowance off the comparison table', () => {
    // The catalog's own description ends "never a published number". It stays an
    // entitlement the app may ask about and not a figure it prints.
    expect(TIER_FEATURE_ORDER).not.toContain('assistant_multiplier')
  })
})

function plan(entitlements: WorkspacePlan['entitlements']): WorkspacePlan {
  return {
    tier: {
      id: 'ttv-trial-v1',
      tierId: 'trial',
      name: 'Trial',
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

describe('withSeededUsage', () => {
  it('fills in a counter the server cannot send', () => {
    const filled = withSeededUsage(
      plan({ team_seats: { limit: 3, used: null, reset: 'standing' } }),
    )
    expect(filled.entitlements.team_seats.used).toBe(2)
  })

  it('counts against an unlimited allowance too', () => {
    // `limit: null` still has a tally worth showing — the meter says "4", not
    // "4 of ∞".
    const filled = withSeededUsage(
      plan({ team_seats: { limit: null, used: null, reset: 'standing' } }),
    )
    expect(filled.entitlements.team_seats.used).toBe(2)
  })

  it('leaves a verdict alone', () => {
    // Nothing to count against a yes/no, and `0 of ∞` under "Several accounts on
    // one platform" is a meter on a screen with nothing to measure.
    const filled = withSeededUsage(
      plan({ multiple_accounts_per_platform: { allowed: false } }),
    )
    expect(filled.entitlements.multiple_accounts_per_platform).toEqual({
      allowed: false,
    })
  })

  it('leaves a metered key the seed has no number for uncounted', () => {
    const filled = withSeededUsage(
      plan({ something_new: { limit: 5, used: null, reset: 'standing' } }),
    )
    expect(filled.entitlements.something_new.used).toBeNull()
  })
})
