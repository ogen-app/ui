import { describe, expect, it } from 'vitest'

import { SEED_CATALOG } from './entitlements.seed'
import { TIER_FEATURE_ORDER } from '@/lib/tierFeatures'
import type { EntitlementKey } from '@/types/entitlements'

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
