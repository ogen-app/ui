import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setActiveWorkspaceId } from '@/lib/activeWorkspace'
import {
  LoginAlertError,
  getLoginAlert,
  parseRetryAfter,
  secureAccount,
} from './loginAlerts'

/**
 * The contract behind `/auth/secure-account` (CON-317 §7). What the page needs
 * from this module is a typed answer for every refusal, because each one is a
 * different screen — and a `Retry-After` it can count down from.
 */

const fetchMock = vi.fn()

function reply(status: number, body?: unknown, headers?: HeadersInit) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers,
  })
}

async function refusal(promise: Promise<unknown>): Promise<LoginAlertError> {
  const err = await promise.then(
    () => {
      throw new Error('expected a refusal')
    },
    (e: unknown) => e,
  )
  expect(err).toBeInstanceOf(LoginAlertError)
  return err as LoginAlertError
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  // A tab pinned to a workspace: the header must still not go out.
  setActiveWorkspaceId('ws-b')
})

afterEach(() => {
  vi.unstubAllGlobals()
  setActiveWorkspaceId(null)
})

describe('getLoginAlert', () => {
  it('reads the alert with a GET, the token escaped into the path and no workspace named', async () => {
    fetchMock.mockResolvedValue(
      reply(200, { status: 'pending', email: 'j***@acme.com' }),
    )

    const alert = await getLoginAlert('a/b c')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/security/login-alerts/a%2Fb%20c')
    expect(init.method).toBeUndefined()
    expect(init.credentials).toBe('include')
    expect(init.headers).not.toHaveProperty('X-Workspace-Id')
    expect(alert).toMatchObject({ status: 'pending', email: 'j***@acme.com' })
  })

  it('names an unknown token invalid', async () => {
    fetchMock.mockResolvedValue(reply(404, { error: 'not_found' }))
    expect((await refusal(getLoginAlert('t'))).reason).toBe('invalid')
  })

  it('names a server failure or a dropped connection unavailable', async () => {
    fetchMock.mockResolvedValueOnce(reply(502))
    expect((await refusal(getLoginAlert('t'))).reason).toBe('unavailable')

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect((await refusal(getLoginAlert('t'))).reason).toBe('unavailable')
  })

  it('never puts the token in an error message, which can reach Sentry', async () => {
    fetchMock.mockResolvedValue(reply(500))
    const err = await refusal(getLoginAlert('secret-token'))
    expect(err.message).not.toContain('secret-token')
  })
})

describe('secureAccount', () => {
  it('POSTs to the secure endpoint and returns the reset link', async () => {
    fetchMock.mockResolvedValue(
      reply(200, {
        reset_url: 'https://app/auth/reset?token=r',
        sessions_revoked: 3,
      }),
    )

    const result = await secureAccount('tok')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/security/login-alerts/tok/secure')
    expect(init.method).toBe('POST')
    expect(init.headers).not.toHaveProperty('X-Workspace-Id')
    expect(result).toEqual({
      reset_url: 'https://app/auth/reset?token=r',
      sessions_revoked: 3,
    })
  })

  it('tells a used token from an expired one by the 410 body', async () => {
    fetchMock.mockResolvedValueOnce(reply(410, { error: 'token_used' }))
    expect((await refusal(secureAccount('t'))).reason).toBe('used')

    fetchMock.mockResolvedValueOnce(reply(410, { error: 'token_expired' }))
    expect((await refusal(secureAccount('t'))).reason).toBe('expired')
  })

  it('reads a 410 it cannot name as expired — the link is dead either way', async () => {
    fetchMock.mockResolvedValueOnce(reply(410))
    expect((await refusal(secureAccount('t'))).reason).toBe('expired')
  })

  it('carries the Retry-After of a 429', async () => {
    fetchMock.mockResolvedValue(
      reply(429, { error: 'rate_limited' }, { 'Retry-After': '120' }),
    )
    const err = await refusal(secureAccount('t'))
    expect(err.reason).toBe('rate_limited')
    expect(err.retryAfterSeconds).toBe(120)
  })
})

describe('parseRetryAfter', () => {
  it('reads delta-seconds', () => {
    expect(parseRetryAfter('90')).toBe(90)
  })

  it('reads an HTTP date', () => {
    const now = Date.parse('2026-09-29T10:00:00Z')
    expect(parseRetryAfter('Tue, 29 Sep 2026 10:05:00 GMT', now)).toBe(300)
  })

  it('falls back to a minute when the header is missing or unreadable', () => {
    expect(parseRetryAfter(null)).toBe(60)
    expect(parseRetryAfter('soon')).toBe(60)
    expect(parseRetryAfter('0')).toBe(60)
  })
})
