import { afterEach, describe, expect, it, vi } from 'vitest'

import { setActiveWorkspaceId } from '@/lib/activeWorkspace'
import { completeGoogleSignup } from './googleAuth'
import {
  getSignupConfig,
  getTenantInvite,
  isInviteEmailMismatch,
  isInviteGone,
  isInviteRequired,
  isWorkspaceLimit,
} from './signupAccess'
import { signup } from './tenants'
import { createWorkspace } from './workspaces'

/**
 * The contract CON-402 is built to, read off ogen#233 (CON-333 §7):
 * `GET /api/signup-config`, `GET /api/tenant-invites/:token`, `invite_token` on
 * both signup routes, and the refusal codes the screens switch on.
 */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubFetch(res: Response | (() => Response)) {
  const fetchMock = vi.fn(async () => (typeof res === 'function' ? res() : res))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function sent(fetchMock: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchMock.mock.calls[0] as unknown as [
    string,
    RequestInit,
  ]
  return {
    url,
    headers: (init.headers ?? {}) as Record<string, string>,
    body: init.body ? JSON.parse(init.body as string) : undefined,
  }
}

const GONE = { error: 'This invitation link is invalid or has expired.' }

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

describe('getSignupConfig', () => {
  it('reads both modes', async () => {
    stubFetch(jsonResponse(200, { mode: 'invite_only' }))
    await expect(getSignupConfig()).resolves.toBe('invite_only')

    stubFetch(jsonResponse(200, { mode: 'open' }))
    await expect(getSignupConfig()).resolves.toBe('open')
  })

  it('takes a mode it has not heard of, or a failed read, as open', async () => {
    // The server enforces with `invite_required` either way; a blip must not
    // lock strangers out of an open product.
    stubFetch(jsonResponse(200, { mode: 'waitlist' }))
    await expect(getSignupConfig()).resolves.toBe('open')

    stubFetch(jsonResponse(404, { error: 'not found' }))
    await expect(getSignupConfig()).resolves.toBe('open')
  })

  it('names no workspace, even from a pinned tab', async () => {
    setActiveWorkspaceId('ws-1')
    const fetchMock = stubFetch(jsonResponse(200, { mode: 'open' }))

    await getSignupConfig()

    expect(sent(fetchMock).headers).not.toHaveProperty('X-Workspace-Id')
  })
})

describe('getTenantInvite', () => {
  it('reads the invited address and expiry', async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, {
        email: 'jane@acme.com',
        expires_at: '2026-11-08T12:00:00Z',
      }),
    )

    await expect(getTenantInvite('tok/1')).resolves.toEqual({
      email: 'jane@acme.com',
      expiresAt: '2026-11-08T12:00:00Z',
    })
    expect(sent(fetchMock).url).toMatch(/\/api\/tenant-invites\/tok%2F1$/)
  })

  it('reads the one 410 as an invite that cannot be used', async () => {
    stubFetch(jsonResponse(410, GONE))
    await expect(getTenantInvite('tok')).resolves.toBeNull()
  })

  it('does not mistake a throttle or an outage for a dead invite', async () => {
    stubFetch(jsonResponse(429, { error: 'Too many requests' }))
    await expect(getTenantInvite('tok')).rejects.toThrow()
  })
})

describe('redeeming an invite', () => {
  const FORM = {
    organizationName: ' Acme Roasters ',
    firstName: 'Jane',
    lastName: 'Okafor',
    email: 'jane@acme.com',
    password: 'correct horse',
  }

  const CREATED = {
    tenant: { id: 't1', name: 'Acme Roasters' },
    user: { id: 'u1', name: 'Jane Okafor', email: 'jane@acme.com' },
    session: { id: 's', user_id: 'u1', expires_at: '' },
    return_to: '/signup?invite=tok',
  }

  it('sends the token on a password signup, and only when there is one', async () => {
    let fetchMock = stubFetch(() => jsonResponse(201, CREATED))
    await signup({ ...FORM, inviteToken: 'tok' })
    expect(sent(fetchMock).body.invite_token).toBe('tok')

    fetchMock = stubFetch(() => jsonResponse(201, CREATED))
    await signup(FORM)
    expect(sent(fetchMock).body).not.toHaveProperty('invite_token')
  })

  it('sends the token on the Google "name your workspace" step', async () => {
    const fetchMock = stubFetch(() => jsonResponse(201, CREATED))

    await completeGoogleSignup('pending', 'Acme Roasters', 'tok')

    expect(sent(fetchMock).body).toEqual({
      token: 'pending',
      tenant_name: 'Acme Roasters',
      invite_token: 'tok',
    })
  })

  it('signs up without a workspace header, so a refusal never looks like a stale pin', async () => {
    setActiveWorkspaceId('ws-1')
    const fetchMock = stubFetch(() => jsonResponse(201, CREATED))

    await signup(FORM)

    expect(sent(fetchMock).headers).not.toHaveProperty('X-Workspace-Id')
  })

  it.each([
    [403, { error: 'private beta', code: 'invite_required' }, isInviteRequired],
    [
      403,
      { error: 'different address', code: 'invite_email_mismatch' },
      isInviteEmailMismatch,
    ],
    [410, GONE, isInviteGone],
  ])('reads a %i refusal by its code', async (status, body, is) => {
    stubFetch(() => jsonResponse(status, body))

    const error = await signup({ ...FORM, inviteToken: 'tok' }).catch(
      (e: unknown) => e,
    )

    expect(is(error)).toBe(true)
    for (const other of [
      isInviteRequired,
      isInviteEmailMismatch,
      isInviteGone,
    ]) {
      if (other !== is) expect(other(error)).toBe(false)
    }
  })

  it('reads the same codes off the Google step', async () => {
    stubFetch(() =>
      jsonResponse(403, { error: 'x', code: 'invite_email_mismatch' }),
    )

    const error = await completeGoogleSignup('p', 'Acme', 'tok').catch(
      (e: unknown) => e,
    )

    expect(isInviteEmailMismatch(error)).toBe(true)
  })
})

describe('the workspace cap', () => {
  it('reads 403 workspace_limit on create', async () => {
    stubFetch(() =>
      jsonResponse(403, {
        error:
          "You've reached the number of workspaces available during the beta.",
        code: 'workspace_limit',
      }),
    )

    const error = await createWorkspace({ name: 'Second' }).catch(
      (e: unknown) => e,
    )

    expect(isWorkspaceLimit(error)).toBe(true)
  })

  it('does not read an ordinary 403 as the cap', async () => {
    stubFetch(() => jsonResponse(403, { error: 'forbidden' }))

    const error = await createWorkspace({ name: 'Second' }).catch(
      (e: unknown) => e,
    )

    expect(isWorkspaceLimit(error)).toBe(false)
  })
})
