import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  EntitlementError,
  apiErrorFrom,
  errorMessage,
} from './errors'
import { apiVoid } from './http'
import * as staleWorkspace from '@/lib/staleWorkspace'
import { setActiveWorkspaceId } from '@/lib/activeWorkspace'

/**
 * How a refusal is read, and in particular how the two the plan is responsible
 * for are told apart from everything else (CON-295).
 *
 * The API renders an entitlement denial as a machine code —
 * `entitlement_exceeded` on a 402, `feature_not_available` on a 403
 * (`defaultErrorHandler` in the Go repo's `transport/server`). Both failure
 * modes this file pins are quiet ones. A code read as prose puts
 * `entitlement_exceeded` in a toast, which is the app talking to itself in
 * front of the user. And a 403 read only by its status turns a feature the tier
 * does not include into a stale-workspace probe, fired on every click of the
 * control that is switched off.
 */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const QUOTA = {
  error: 'entitlement_exceeded',
  feature: 'active_campaigns',
  limit: 3,
  current: 3,
}

const FEATURE_OFF = {
  error: 'feature_not_available',
  feature: 'custom_campaign_types',
}

afterEach(() => {
  vi.unstubAllGlobals()
  setActiveWorkspaceId(null)
})

describe('apiErrorFrom', () => {
  it('reads a quota refusal as the numbers it carries', async () => {
    const error = await apiErrorFrom(
      jsonResponse(402, QUOTA),
      'Unable to create the campaign',
    )
    expect(error).toBeInstanceOf(EntitlementError)
    expect(error).toMatchObject({
      status: 402,
      reason: 'limit',
      feature: 'active_campaigns',
      limit: 3,
      current: 3,
    })
  })

  it('reads a capability refusal as having no numbers', async () => {
    // A feature that is switched off has nothing to count, and the server sends
    // no figures with it. Null rather than zero — see `EntitlementDenial`.
    const error = await apiErrorFrom(jsonResponse(403, FEATURE_OFF), 'Nope')
    expect(error).toMatchObject({
      reason: 'tier',
      feature: 'custom_campaign_types',
      limit: null,
      current: null,
    })
  })

  it('never lets the code itself be mistaken for a sentence', async () => {
    // What this is really pinning: the global mutation toast renders
    // `error.message` as its title. Before CON-295 that title read
    // "entitlement_exceeded".
    const error = await apiErrorFrom(
      jsonResponse(402, QUOTA),
      'Unable to create the campaign',
    )
    expect(error.message).toBe('Unable to create the campaign')
    expect(await errorMessage(jsonResponse(403, FEATURE_OFF), 'Nope')).toBe(
      'Nope',
    )
  })

  it('does not read a limit off a body that states none', async () => {
    // Defensive rather than expected: the fields are in the contract. But
    // `undefined` folded to `0` would report a plan that allows nothing.
    const error = await apiErrorFrom(
      jsonResponse(402, {
        error: 'entitlement_exceeded',
        feature: 'posts_total',
      }),
      'Unable to add the post',
    )
    expect(error).toMatchObject({ limit: null, current: null })
  })

  it('leaves the other 403s alone', async () => {
    // 403 is crowded: an owner-only route answers it to a member, and a tab
    // pinned to a workspace it has left gets it too. Only the code makes one of
    // them the plan's business.
    const error = await apiErrorFrom(
      jsonResponse(403, { error: 'Only an owner can do that' }),
      'Unable to remove the member',
    )
    expect(error).toBeInstanceOf(ApiError)
    expect(error).not.toBeInstanceOf(EntitlementError)
    expect(error.message).toBe('Only an owner can do that')
  })

  it('leaves a 402 that says something else alone', async () => {
    // The status alone is not the signal either. Zernio answers 402 for an
    // analytics add-on, and that is not this workspace's Ogen plan.
    const error = await apiErrorFrom(
      jsonResponse(402, { error: 'analytics add-on required' }),
      'Unable to refresh',
    )
    expect(error).not.toBeInstanceOf(EntitlementError)
    expect(error.message).toBe('analytics add-on required')
  })

  it('still folds the validation details into a 422', async () => {
    // The body is read once now, for both the message and the structured half.
    // This is the message half, unchanged.
    const error = await apiErrorFrom(
      jsonResponse(422, {
        error: 'Post failed validation',
        platform_validation: {
          linkedin: [{ message: 'file is 9MB; platform allows up to 5MB' }],
        },
      }),
      'Unable to schedule',
    )
    expect(error.message).toBe(
      'Post failed validation: file is 9MB; platform allows up to 5MB',
    )
  })

  it('falls back when there is no body at all', async () => {
    const error = await apiErrorFrom(new Response('', { status: 500 }), 'Boom')
    expect(error.message).toBe('Boom')
    expect(error.status).toBe(500)
  })
})

describe('a feature-gated 403 on the JSON path', () => {
  it('is thrown typed, and does not set off the stale-workspace check', async () => {
    // `handleForbidden` verifies a pin by making a request. A tier that hides a
    // feature would otherwise trigger one every time somebody clicks the
    // control it hides — and the pin was never in question.
    setActiveWorkspaceId('ws-a')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(403, FEATURE_OFF)),
    )
    const forbidden = vi.spyOn(staleWorkspace, 'handleForbidden')
    try {
      await expect(
        apiVoid('/api/campaigns/c1', 'Unable to delete'),
      ).rejects.toBeInstanceOf(EntitlementError)
      expect(forbidden).not.toHaveBeenCalled()
    } finally {
      forbidden.mockRestore()
    }
  })

  it('still checks the pin on an ordinary 403', async () => {
    setActiveWorkspaceId('ws-a')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(403, { error: 'Owners only' })),
    )
    const forbidden = vi.spyOn(staleWorkspace, 'handleForbidden')
    try {
      await expect(
        apiVoid('/api/campaigns/c1', 'Unable to delete'),
      ).rejects.toThrow('Owners only')
      expect(forbidden).toHaveBeenCalled()
    } finally {
      forbidden.mockRestore()
    }
  })
})
