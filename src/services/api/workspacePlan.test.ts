import { afterEach, describe, expect, it, vi } from 'vitest'

import { getWorkspacePlan } from './entitlements'

/**
 * `getWorkspacePlan` once the stub is switched off — the path a real workspace
 * takes the day `workspace-tiers` goes on.
 *
 * Separate from `entitlements.test.ts` because that file drives
 * `fetchWorkspacePlan` and never needs the stub mocked away. What this one
 * guards is the layer on top: the seeded counters are the stub's scaffolding,
 * and laid over a real plan they are a false refusal — a trial workspace with a
 * campaign cap of three told it is full, and sold an upgrade, with nothing on
 * the server behind it.
 */

vi.mock('./tiers.stub', () => ({
  STUBBED: false,
  stubWorkspacePlan: vi.fn(),
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getWorkspacePlan against the real endpoint', () => {
  it('leaves a limit uncounted rather than seeding a tally onto it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            tier_id: 'trial',
            version_id: 'ttv-trial-v1',
            purchasable: true,
            prices: [],
            entitlements: [
              {
                key: 'active_campaigns',
                value_type: 'numeric',
                reset: 'standing',
                value: 3,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    const plan = await getWorkspacePlan()

    expect(plan.entitlements.active_campaigns.limit).toBe(3)
    expect(plan.entitlements.active_campaigns.used ?? null).toBeNull()
  })
})
