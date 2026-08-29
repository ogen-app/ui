import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchBilling, fetchBillingPortalLink } from './billing'
import { STUBBED } from './tiers.stub'

/**
 * Neither `GET /api/billing` nor `POST /api/billing/portal` exists yet, and no
 * payment provider is connected. Until both do, this file is the executable
 * half of the contract written out in `billing.ts`.
 *
 * Driven against `fetchBilling` rather than `getBilling` for the same reason
 * `entitlements.test.ts` drives `fetchWorkspacePlan`: the app is on the stub,
 * and a contract test that went dark the moment the app stopped making the
 * request would be no contract at all.
 *
 * What is worth asserting here is mostly *restraint*. The screen this backs is
 * a report and a door — Lemon Squeezy is the merchant of record, so the address,
 * the tax id, the card and the cancellation all live in their portal. These
 * tests are what stops that boundary being crossed one convenient field at a
 * time.
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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchBilling', () => {
  it('reads one flat, workspace-scoped route', async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, { subscription: null, portal: false }),
    )

    await fetchBilling()

    expect(fetchMock.mock.calls[0][0]).toBe('/api/billing')
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
  })

  it('unwraps a live subscription', async () => {
    stubFetch(
      jsonResponse(200, {
        subscription: {
          status: 'active',
          renews_at: '2026-09-22T00:00:00Z',
          ends_at: null,
          card: { brand: 'visa', last_four: '4242' },
          price: { amount: 4900, currency: 'USD', period: 'month' },
        },
        portal: true,
      }),
    )

    await expect(fetchBilling()).resolves.toEqual({
      subscription: {
        status: 'active',
        renewsAt: '2026-09-22T00:00:00Z',
        endsAt: null,
        card: { brand: 'visa', last4: '4242' },
        price: { amount: 4900, currency: 'USD', period: 'month' },
      },
      portal: true,
    })
  })

  it('tells "never bought anything" apart from "bought something, details missing"', async () => {
    // Two different sentences on screen, so they cannot collapse into one shape
    // here: a free workspace has no subscription, a paid one with nothing
    // filled in has an empty one.
    stubFetch(jsonResponse(200, { subscription: null, portal: false }))
    await expect(fetchBilling()).resolves.toMatchObject({ subscription: null })

    stubFetch(
      jsonResponse(200, { subscription: { status: 'active' }, portal: false }),
    )
    const account = await fetchBilling()
    expect(account.subscription).toEqual({
      status: 'active',
      renewsAt: null,
      endsAt: null,
      card: null,
      price: null,
    })
  })

  it('keeps a cancelled subscription on its end date, not a renewal date', async () => {
    // The same day and opposite news. A handler that reported the end date as
    // `renews_at` would have the app promise a renewal that is not coming.
    stubFetch(
      jsonResponse(200, {
        subscription: {
          status: 'cancelled',
          renews_at: null,
          ends_at: '2026-09-22T00:00:00Z',
        },
        portal: true,
      }),
    )

    const account = await fetchBilling()

    expect(account.subscription?.status).toBe('cancelled')
    expect(account.subscription?.renewsAt).toBeNull()
    expect(account.subscription?.endsAt).toBe('2026-09-22T00:00:00Z')
  })

  it('narrows an unrecognised status to unknown rather than to active', async () => {
    // The direction that matters: a state this build has not heard of must not
    // tell someone whose payment is failing that everything is fine.
    stubFetch(
      jsonResponse(200, {
        subscription: { status: 'in_dunning' },
        portal: true,
      }),
    )

    await expect(fetchBilling()).resolves.toMatchObject({
      subscription: { status: 'unknown' },
    })
  })

  it('treats a missing portal flag as no portal', async () => {
    // The button has to be absent rather than dead. `portal` is the only thing
    // that puts it on screen, so anything short of an explicit `true` is false.
    stubFetch(jsonResponse(200, { subscription: { status: 'active' } }))

    await expect(fetchBilling()).resolves.toMatchObject({ portal: false })
  })

  it("surfaces the server's message rather than a generic failure", async () => {
    // Owner-only on the server; a member landing here is told why.
    stubFetch(jsonResponse(403, { error: 'owner role required' }))

    await expect(fetchBilling()).rejects.toThrow('owner role required')
  })
})

describe('fetchBillingPortalLink', () => {
  it('mints a link with a POST, on the click', async () => {
    // A POST rather than a field on the payload above, because the link is
    // signed and expires within the day: one that rode along on a cached GET
    // would be expired by the time anybody clicked it.
    const fetchMock = stubFetch(
      jsonResponse(200, {
        url: 'https://portal.example/x',
        expires_at: '2026-08-23T09:00:00Z',
      }),
    )

    const link = await fetchBillingPortalLink()

    expect(fetchMock.mock.calls[0][0]).toBe('/api/billing/portal')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(link).toEqual({
      url: 'https://portal.example/x',
      expiresAt: '2026-08-23T09:00:00Z',
    })
  })

  it('accepts a link with no stated expiry', async () => {
    stubFetch(jsonResponse(200, { url: 'https://portal.example/x' }))

    await expect(fetchBillingPortalLink()).resolves.toEqual({
      url: 'https://portal.example/x',
      expiresAt: null,
    })
  })
})

describe('while the stub is standing in', () => {
  it('is switched by one constant, in one file', () => {
    // The reminder that this whole area is scaffolding: when the endpoints
    // answer, `STUBBED` goes false and `tiers.stub.ts` is deleted. If this
    // fails, that already happened — delete this block with it.
    expect(STUBBED).toBe(true)
  })
})
