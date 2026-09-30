import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchWorkspacePlan } from './entitlements'

/**
 * The executable half of the contract written out in `entitlements.ts`.
 *
 * `GET /api/me/entitlements` **exists** — these fixtures are trimmed from real
 * responses read off the local API and `api.dev.getogen.com` on 2026-09-16, not
 * invented. That is the change worth knowing about this file: it used to assert
 * a `GET /api/entitlements` that was designed here and that the server answers
 * 404 for, and every case in it described a payload nobody had ever sent.
 *
 * The cases that matter most are the ones about *absence*, because the payload
 * uses four different kinds of it: a key missing from the array means ungated, a
 * boolean entry means unmetered, `value: null` on a numeric means unlimited, and
 * a limit with no counter means uncounted. Flattening any two of those into one
 * breaks a rule the client cannot recover.
 *
 * Deliberately against `fetchWorkspacePlan` rather than `getWorkspacePlan`: the
 * latter is currently answered by a local stub and has seeded counters laid over
 * it, and a contract test that went dark the moment the app stopped making the
 * request would be no contract at all.
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

/** The version envelope, exactly as the endpoint sends it. */
const VERSION = {
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
}

/** One catalog entry, with every field the server decorates it with. */
const SEATS = {
  key: 'team_seats',
  name: 'Team seats & invitations',
  category: 'workspace_team',
  linear_issue: 'CON-26',
  status: 'live',
  value_type: 'numeric',
  is_material: true,
  reset: 'standing',
  description: 'Owner / member roles, email invites.',
  value: 1,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchWorkspacePlan', () => {
  it('reads one flat, workspace-scoped route', async () => {
    // No workspace id in the path: like `/api/tenants/current` and `/api/users`
    // it answers for whichever workspace this tab's `X-Workspace-Id` names.
    const fetchMock = stubFetch(
      jsonResponse(200, { ...VERSION, entitlements: [] }),
    )

    await fetchWorkspacePlan()

    expect(fetchMock.mock.calls[0][0]).toBe('/api/me/entitlements')
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
  })

  it('unwraps the version, keeping both ids opaque', async () => {
    stubFetch(jsonResponse(200, { ...VERSION, entitlements: [] }))

    const { tier } = await fetchWorkspacePlan()

    expect(tier.id).toBe('ttv-trial-v1')
    expect(tier.tierId).toBe('trial')
    expect(tier.purchasable).toBe(true)
    expect(tier.changeReason).toBe('Initial published version.')
  })

  it('reads the price in minor units, with its interval', async () => {
    // Money is an int64 of minor units plus an ISO-4217 code, never a float and
    // never a formatted string — so a zero price is a real price, not an absence.
    stubFetch(jsonResponse(200, { ...VERSION, entitlements: [] }))

    const { tier } = await fetchWorkspacePlan()

    expect(tier.prices).toEqual([
      { amount: 0, currency: 'EUR', interval: 'month', countryCode: null },
    ])
  })

  it('has no price at all for the internal tier', async () => {
    // Every workspace sits on `default` today: not purchasable, and the server
    // sends `prices: null` rather than an empty list.
    stubFetch(
      jsonResponse(200, {
        ...VERSION,
        tier_id: 'default',
        version_id: 'ttv-default-v1',
        purchasable: false,
        prices: null,
        entitlements: [],
      }),
    )

    const { tier } = await fetchWorkspacePlan()

    expect(tier.prices).toEqual([])
    expect(tier.purchasable).toBe(false)
  })

  it('names the tier from its slug, the payload carrying no name', async () => {
    // Raised on CON-243 and offered; until it lands this is derived rather than
    // looked up, so it cannot disagree with the tier the server resolved.
    stubFetch(jsonResponse(200, { ...VERSION, entitlements: [] }))
    await expect(fetchWorkspacePlan()).resolves.toMatchObject({
      tier: { name: 'Trial' },
    })

    stubFetch(
      jsonResponse(200, {
        ...VERSION,
        tier_id: 'pro_annual',
        entitlements: [],
      }),
    )
    await expect(fetchWorkspacePlan()).resolves.toMatchObject({
      tier: { name: 'Pro Annual' },
    })
  })

  it('says nothing about a start date, a renewal or a pending change', async () => {
    // None of the three is on this read. They are the subscription half of a
    // plan and Ogen holds no subscription state (CON-243 §5) — inventing any of
    // them here would put "auto-renews on the 1st" under a plan nobody bills.
    stubFetch(jsonResponse(200, { ...VERSION, entitlements: [] }))

    const { tier } = await fetchWorkspacePlan()

    expect(tier.effectiveFrom).toBeNull()
    expect(tier.billingPeriod).toBeNull()
    expect(tier.renewsAt).toBeNull()
    expect(tier.scheduled).toBeNull()
  })

  it('keys the array by the catalog key', async () => {
    stubFetch(jsonResponse(200, { ...VERSION, entitlements: [SEATS] }))

    const plan = await fetchWorkspacePlan()

    expect(Object.keys(plan.entitlements)).toEqual(['team_seats'])
  })

  it('carries a numeric allowance with its reset word and no counter', async () => {
    // `used: null` rather than absent or zero. The key *is* metered; it has
    // simply never been counted, and nothing on the API can count it yet.
    stubFetch(jsonResponse(200, { ...VERSION, entitlements: [SEATS] }))

    const plan = await fetchWorkspacePlan()

    expect(plan.entitlements.team_seats).toMatchObject({
      limit: 1,
      used: null,
      reset: 'standing',
      resetsAt: null,
    })
  })

  it('keeps the catalog metadata the comparison table is drawn from', async () => {
    stubFetch(jsonResponse(200, { ...VERSION, entitlements: [SEATS] }))

    const plan = await fetchWorkspacePlan()

    expect(plan.entitlements.team_seats.catalog).toEqual({
      name: 'Team seats & invitations',
      description: 'Owner / member roles, email invites.',
      category: 'workspace_team',
      isMaterial: true,
    })
  })

  it('tells the four absences apart', async () => {
    stubFetch(
      jsonResponse(200, {
        ...VERSION,
        entitlements: [
          { ...SEATS, value: null },
          {
            key: 'multiple_accounts_per_platform',
            name: 'Multiple accounts per platform',
            value_type: 'boolean',
            is_material: true,
            value: false,
          },
        ],
      }),
    )

    const plan = await fetchWorkspacePlan()

    // Stated and unlimited — which is not the same as unsaid.
    expect(plan.entitlements.team_seats.limit).toBeNull()
    // A verdict, with nothing to meter: `limit` stays unsaid rather than
    // becoming a number.
    const verdict = plan.entitlements.multiple_accounts_per_platform
    expect(verdict.allowed).toBe(false)
    expect('limit' in verdict).toBe(false)
    // Metered but uncounted, on the key that has a limit.
    expect(plan.entitlements.team_seats.used).toBeNull()
    // Never mentioned at all: the client will allow it.
    expect(plan.entitlements.active_campaigns).toBeUndefined()
  })

  it('reads an unset boolean as granted', async () => {
    // This file never narrows towards denial. A catalog entry that states a
    // capability without answering it is not a refusal.
    stubFetch(
      jsonResponse(200, {
        ...VERSION,
        entitlements: [{ key: 'semantic_grounding', value_type: 'boolean' }],
      }),
    )

    const plan = await fetchWorkspacePlan()

    expect(plan.entitlements.semantic_grounding.allowed).toBe(true)
  })

  it('drops a reset word it cannot name but keeps the number', async () => {
    stubFetch(
      jsonResponse(200, {
        ...VERSION,
        entitlements: [{ ...SEATS, reset: 'quarterly' }],
      }),
    )

    const plan = await fetchWorkspacePlan()

    expect(plan.entitlements.team_seats).toMatchObject({
      limit: 1,
      reset: null,
    })
  })

  it('ignores a catalog entry that states no allowance at all', async () => {
    // Metadata with no `value`: nothing is granted and nothing is refused, so
    // the entry carries neither field and the default-allow rule applies.
    stubFetch(
      jsonResponse(200, {
        ...VERSION,
        entitlements: [{ key: 'something_new', value_type: 'enum' }],
      }),
    )

    const plan = await fetchWorkspacePlan()

    expect(plan.entitlements.something_new).toEqual({})
  })

  it('survives a payload with no entitlements block at all', async () => {
    // A tier that grants everything has nothing to list, and a handler is
    // entitled to omit the key rather than send `[]`.
    const { prices: _prices, ...bare } = VERSION
    stubFetch(jsonResponse(200, bare))

    await expect(fetchWorkspacePlan()).resolves.toMatchObject({
      entitlements: {},
    })
  })

  it("surfaces the server's message rather than a generic failure", async () => {
    stubFetch(jsonResponse(403, { error: 'no workspace on this request' }))

    await expect(fetchWorkspacePlan()).rejects.toThrow(
      'no workspace on this request',
    )
  })
})
