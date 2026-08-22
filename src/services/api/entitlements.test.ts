import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchWorkspacePlan } from './entitlements'

/**
 * `GET /api/entitlements` does not exist yet. Until it does, this file is the
 * executable half of the contract written out in `entitlements.ts` — path,
 * scoping, and the snake_case shape the handler has to answer with — so the
 * client and the request we are asking Serhii for cannot drift apart quietly.
 *
 * The cases that matter most are the ones about *absence*, because the payload
 * uses three different kinds of it: a missing key means ungated, a missing
 * `limit` means unmetered, and `limit: null` means unlimited. A handler that
 * flattens any two of those into one breaks a rule the client cannot recover.
 *
 * Deliberately against `fetchWorkspacePlan` rather than `getWorkspacePlan`:
 * the latter is currently answered by a local stub so the plan screen can be
 * driven, and a contract test that went dark the moment the app stopped making
 * the request would be no contract at all.
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

const TIER = {
  id: 'tier_pro_2026_01_01',
  name: 'Pro',
  effective_from: '2026-01-01T00:00:00Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchWorkspacePlan', () => {
  it('reads one flat, workspace-scoped route', async () => {
    // No workspace id in the path: like `/api/tenants/current` and `/api/users`
    // it answers for whichever workspace this tab's `X-Workspace-Id` names.
    const fetchMock = stubFetch(jsonResponse(200, { tier: TIER, entitlements: {} }))

    await fetchWorkspacePlan()

    expect(fetchMock.mock.calls[0][0]).toBe('/api/entitlements')
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
  })

  it('unwraps the tier as a snapshot, keeping the version id opaque', async () => {
    stubFetch(jsonResponse(200, { tier: TIER, entitlements: {} }))

    const plan = await fetchWorkspacePlan()

    expect(plan.tier).toEqual({
      id: 'tier_pro_2026_01_01',
      name: 'Pro',
      effectiveFrom: '2026-01-01T00:00:00Z',
      scheduled: null,
    })
  })

  it('carries a scheduled change, with the direction the server decided', async () => {
    // A downgrade lands at the next billing boundary, so two tiers are live at
    // once. The client cannot derive the second from dates and must not try —
    // and only the server knows how its configurable tiers rank, which is why
    // `direction` is sent rather than inferred.
    stubFetch(
      jsonResponse(200, {
        tier: {
          ...TIER,
          scheduled_change: {
            id: 'tier_trial_2026_09_01',
            name: 'Trial',
            effective_from: '2026-09-14T00:00:00Z',
            direction: 'downgrade',
          },
        },
        entitlements: {},
      }),
    )

    const plan = await fetchWorkspacePlan()

    expect(plan.tier.scheduled).toEqual({
      id: 'tier_trial_2026_09_01',
      name: 'Trial',
      effectiveFrom: '2026-09-14T00:00:00Z',
      direction: 'downgrade',
    })
  })

  it('keeps a limit and its counter together', async () => {
    // Without `used`, the UI could only apologise after the click instead of
    // disabling the control.
    stubFetch(
      jsonResponse(200, {
        tier: TIER,
        entitlements: {
          content_plan_runs: {
            limit: 10,
            used: 7,
            period: 'month',
            resets_at: '2026-09-01T00:00:00Z',
          },
        },
      }),
    )

    const plan = await fetchWorkspacePlan()

    expect(plan.entitlements.content_plan_runs).toEqual({
      limit: 10,
      used: 7,
      period: 'month',
      resetsAt: '2026-09-01T00:00:00Z',
    })
  })

  it('tells the three absences apart', async () => {
    stubFetch(
      jsonResponse(200, {
        tier: TIER,
        entitlements: {
          seats: { limit: null, used: 4 },
          multiple_accounts_per_platform: { allowed: false },
        },
      }),
    )

    const plan = await fetchWorkspacePlan()

    // Stated and unlimited.
    expect(plan.entitlements.seats).toEqual({ limit: null, used: 4 })
    // A verdict, with nothing to meter — `limit` stays unsaid rather than
    // becoming a number.
    expect(plan.entitlements.multiple_accounts_per_platform).toEqual({ allowed: false })
    expect('limit' in plan.entitlements.multiple_accounts_per_platform).toBe(false)
    // Never mentioned at all: the client will allow it.
    expect(plan.entitlements.campaigns).toBeUndefined()
  })

  it('drops a period it cannot name but keeps the numbers', async () => {
    stubFetch(
      jsonResponse(200, {
        tier: TIER,
        entitlements: { content_plan_runs: { limit: 3, used: 1, period: 'quarter' } },
      }),
    )

    const plan = await fetchWorkspacePlan()

    expect(plan.entitlements.content_plan_runs).toEqual({
      limit: 3,
      used: 1,
      period: null,
    })
  })

  it('survives a payload with no entitlements block at all', async () => {
    // A tier that grants everything has nothing to list, and a handler is
    // entitled to omit the key rather than send `{}`.
    stubFetch(jsonResponse(200, { tier: TIER }))

    await expect(fetchWorkspacePlan()).resolves.toEqual({
      tier: {
        id: TIER.id,
        name: TIER.name,
        effectiveFrom: TIER.effective_from,
        scheduled: null,
      },
      entitlements: {},
    })
  })

  it("surfaces the server's message rather than a generic failure", async () => {
    stubFetch(jsonResponse(403, { error: 'no workspace on this request' }))

    await expect(fetchWorkspacePlan()).rejects.toThrow('no workspace on this request')
  })
})
