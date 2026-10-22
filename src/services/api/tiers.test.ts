import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from './errors'
import { PlanChangeError, changePlan, listTiers } from './tiers'
import { setActiveWorkspaceId } from '@/lib/activeWorkspace'

/**
 * The executable half of the contract written out in `tiers.ts`.
 *
 * `GET /api/public/pricing` **exists**, and the fixture below is the live
 * response from `api.dev.getogen.com`, read on 2026-09-16 and trimmed only in
 * the entitlements array. It replaces a `GET /api/tiers` that was designed here
 * and that the server answers 404 for.
 *
 * What is asserted here that is not asserted next door: that this route goes out
 * **unscoped**. It is public and cached at the edge, and a request varying by a
 * header the response does not depend on splits that cache per workspace for an
 * answer identical in all of them.
 */

function stubFetch(res: Response) {
  const fetchMock = vi.fn().mockResolvedValue(res)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** One row, exactly as the endpoint sends it. */
const TRIAL = {
  tier_id: 'trial',
  version_id: 'ttv-trial-v1',
  version: 1,
  status: 'active',
  purchasable: true,
  change_reason: 'Initial published version.',
  prices: [
    {
      id: 'ttvp-trial-v1-eur-m',
      tier_version_id: 'ttv-trial-v1',
      currency: 'EUR',
      billing_interval: 'month' as const,
      net_minor: 0,
    },
  ],
  entitlements: [
    {
      key: 'active_campaigns',
      name: 'Active campaigns',
      category: 'campaigns_planning',
      linear_issue: 'CON-35',
      status: 'live',
      value_type: 'numeric',
      is_material: true,
      reset: 'standing',
      description: 'Brief, persona, key messages, tone, phases.',
      value: 1,
    },
    {
      key: 'all_campaign_types',
      name: 'All campaign types',
      category: 'campaigns_planning',
      value_type: 'boolean',
      is_material: true,
      description: 'Awareness / Engagement / Conversion / Retention.',
      value: false,
    },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
  setActiveWorkspaceId(null)
})

describe('listTiers', () => {
  it('reads the public pricing route', async () => {
    const fetchMock = stubFetch(jsonResponse(200, { tiers: [TRIAL] }))

    await listTiers()

    expect(fetchMock.mock.calls[0][0]).toBe('/api/public/pricing')
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
  })

  it('sends no workspace header — the list is the same for everyone', async () => {
    // The rule lives in `isAccountScoped`; this is the call site that proves it
    // applies to this path. A per-workspace header on a CDN-cached public route
    // is a cache split for an identical answer. Pinned first, or the assertion
    // would pass on a tab that simply has no workspace to name.
    setActiveWorkspaceId('ws-a')
    const fetchMock = stubFetch(jsonResponse(200, { tiers: [TRIAL] }))

    await listTiers()

    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty(
      'X-Workspace-Id',
    )
  })

  it('parses a row exactly as the plan read parses its body', async () => {
    // One artifact, one parser. If these two ever diverged, the price list and
    // the lock on a button could disagree about what a limit is.
    const [tier] = await withTiers([TRIAL])

    expect(tier).toMatchObject({
      id: 'ttv-trial-v1',
      tierId: 'trial',
      name: 'Trial',
      purchasable: true,
      changeReason: 'Initial published version.',
      prices: [
        { amount: 0, currency: 'EUR', interval: 'month', countryCode: null },
      ],
    })
  })

  it('keeps the allowances keyed by the catalog key', async () => {
    const [tier] = await withTiers([TRIAL])

    expect(tier.entitlements.active_campaigns).toMatchObject({
      limit: 1,
      reset: 'standing',
    })
    // A verdict states no limit, so the comparison table reads it as excluded
    // rather than as a ceiling of nothing.
    expect(tier.entitlements.all_campaign_types.allowed).toBe(false)
    expect('limit' in tier.entitlements.all_campaign_types).toBe(false)
  })

  it('carries the catalog metadata a row can be drawn from', async () => {
    // The one thing this list has that a hand-written table never did: a feature
    // arrives with its own name and section, so a tier that grows a key does not
    // need a matching entry written here first.
    const [tier] = await withTiers([TRIAL])

    expect(tier.entitlements.active_campaigns.catalog).toEqual({
      name: 'Active campaigns',
      description: 'Brief, persona, key messages, tone, phases.',
      category: 'campaigns_planning',
      isMaterial: true,
    })
  })

  it('reads an unpriced version as unpriced rather than as free', async () => {
    // `prices: null` is "nobody has decided"; `net_minor: 0` is free. The card
    // draws a line for the second and nothing for the first.
    const [tier] = await withTiers([{ ...TRIAL, prices: null }])

    expect(tier.prices).toEqual([])
  })

  it('survives an empty list and a missing one alike', async () => {
    await expect(withTiers([])).resolves.toEqual([])

    stubFetch(jsonResponse(200, {}))
    await expect(listTiers()).resolves.toEqual([])
  })

  it("surfaces the server's message rather than a generic failure", async () => {
    stubFetch(jsonResponse(500, { error: 'pricing catalog unavailable' }))

    await expect(listTiers()).rejects.toThrow('pricing catalog unavailable')
  })

  it('reads whether a tier, and each price, can be bought now (CON-325)', async () => {
    const [tier] = await withTiers([
      {
        ...TRIAL,
        available: true,
        free_trial: false,
        trial_days: null,
        prices: [
          { ...TRIAL.prices[0], available: true },
          {
            ...TRIAL.prices[0],
            id: 'ttvp-trial-v1-eur-y',
            billing_interval: 'year',
            available: false,
          },
        ],
      },
    ])

    expect(tier.available).toBe(true)
    expect(tier.prices.map((price) => price.available)).toEqual([true, false])
    expect(tier.prices[0].id).toBe('ttvp-trial-v1-eur-m')
  })

  it('reads a tier the server sends without the field as not for sale', async () => {
    // Billing off, or a server that predates CON-325: nothing can be bought,
    // and a button that went to a checkout that 503s is worse than none.
    const [tier] = await withTiers([TRIAL])

    expect(tier.available).toBe(false)
    expect(tier.freeTrial).toBe(false)
    expect(tier.trialDays).toBeNull()
  })

  it('reads the free-month mark and its length', async () => {
    const [tier] = await withTiers([
      { ...TRIAL, available: true, free_trial: true, trial_days: 30 },
    ])

    expect(tier.freeTrial).toBe(true)
    expect(tier.trialDays).toBe(30)
  })
})

describe('changePlan', () => {
  it('posts the tier and the price, in this tab’s workspace', async () => {
    setActiveWorkspaceId('ws-1')
    const fetchMock = stubFetch(
      jsonResponse(202, {
        checkout: { url: 'https://checkout', expires_at: null, trial: true },
      }),
    )

    await changePlan('pro', 'ttvp-pro-v1-usd-y')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/workspace\/plan$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      tier_id: 'pro',
      price_id: 'ttvp-pro-v1-usd-y',
    })
    expect(init.headers['X-Workspace-Id']).toBe('ws-1')
  })

  it('leaves the price out when none was chosen — the server defaults it', async () => {
    const fetchMock = stubFetch(
      jsonResponse(202, { checkout: { url: 'https://checkout' } }),
    )

    await changePlan('pro')

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      tier_id: 'pro',
    })
  })

  it('answers a 202 with the checkout, trusting its trial flag', async () => {
    stubFetch(
      jsonResponse(202, {
        checkout: {
          url: 'https://checkout',
          expires_at: '2026-10-22T12:00:00Z',
          trial: false,
        },
      }),
    )

    await expect(changePlan('pro')).resolves.toEqual({
      kind: 'checkout',
      checkout: {
        url: 'https://checkout',
        expiresAt: '2026-10-22T12:00:00Z',
        trial: false,
      },
    })
  })

  it('answers a 200 with the plan as it now stands', async () => {
    stubFetch(
      jsonResponse(200, {
        ...TRIAL,
        tier_id: 'pro',
        version_id: 'ttv-pro-v1',
        billing_required: false,
        billing_period: 'month',
      }),
    )

    const change = await changePlan('pro')

    expect(change.kind).toBe('changed')
    if (change.kind !== 'changed') return
    expect(change.plan.tier.tierId).toBe('pro')
    expect(change.plan.tier.billingPeriod).toBe('month')
  })

  it('keeps a refusal code so the screen can word it', async () => {
    stubFetch(jsonResponse(409, { error: 'trial_upgrade_unavailable' }))

    const error = await changePlan('max').catch((err: unknown) => err)

    expect(error).toBeInstanceOf(PlanChangeError)
    expect((error as PlanChangeError).reason).toBe('trial_upgrade_unavailable')
  })

  it('leaves a code it does not know as a plain failure', async () => {
    stubFetch(jsonResponse(409, { error: 'something_new' }))

    const error = await changePlan('max').catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).not.toBeInstanceOf(PlanChangeError)
  })
})

function withTiers(tiers: unknown[]) {
  stubFetch(jsonResponse(200, { tiers }))
  return listTiers()
}
