import { afterEach, describe, expect, it, vi } from 'vitest'

// The SDK is mocked so these tests assert what we hand it, never the network.
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  tanstackRouterBrowserTracingIntegration: vi.fn(() => ({
    name: 'tanstack-router',
  })),
}))

import * as Sentry from '@sentry/react'
import { ApiError, ServerUnavailableError } from '@/services/api/errors'
import {
  beforeSend,
  beforeSendTransaction,
  initTelemetry,
  isTelemetryEnabled,
  redactEvent,
} from './sentry'

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe('redactEvent', () => {
  it('strips query strings, bodies and cookies but keeps the path', () => {
    const event: Sentry.Event = {
      request: {
        url: 'https://app.example/api/posts?token=secret&redirect=/x',
        data: { password: 'hunter2' },
        cookies: { c3_session: 'abc' },
      },
      breadcrumbs: [
        { data: { url: '/api/auth?token=t', to: '/x?y=1', from: '/a?b=2' } },
        { data: { note: 'no url here' } },
        {},
      ],
    }

    redactEvent(event)

    expect(event.request?.url).toBe('https://app.example/api/posts')
    expect(event.request?.data).toBeUndefined()
    expect(event.request?.cookies).toBeUndefined()
    expect(event.breadcrumbs?.[0].data).toEqual({
      url: '/api/auth',
      to: '/x',
      from: '/a',
    })
    expect(event.breadcrumbs?.[1].data).toEqual({ note: 'no url here' })
  })

  it('replaces a token carried in the path, where no query string hides it', () => {
    // The emailed links for invitations (CON-26) and login alerts (CON-318)
    // put their token in the API path; the page URL carries it as `?token=`.
    const event: Sentry.Event = {
      request: {
        url: 'https://app.example/auth/secure-account?token=secret',
      },
      breadcrumbs: [
        { data: { url: '/api/security/login-alerts/secret' } },
        { data: { url: '/api/security/login-alerts/secret/secure' } },
        { data: { url: 'https://api.example/api/invitations/accept/secret' } },
      ],
      spans: [
        {
          description: 'POST /api/security/login-alerts/secret/secure',
          data: {
            url: '/api/security/login-alerts/secret/secure',
            'http.url': 'https://app.example/api/security/login-alerts/secret',
            'http.query': '?token=secret',
          },
        } as unknown as NonNullable<Sentry.Event['spans']>[number],
      ],
    }

    redactEvent(event)

    expect(JSON.stringify(event)).not.toContain('secret')
    expect(event.breadcrumbs?.map((c) => c.data?.url)).toEqual([
      '/api/security/login-alerts/:token',
      '/api/security/login-alerts/:token/secure',
      'https://api.example/api/invitations/accept/:token',
    ])
    expect(event.spans?.[0].description).toBe(
      'POST /api/security/login-alerts/:token/secure',
    )
  })
})

describe('beforeSend', () => {
  const send = (error: unknown) =>
    beforeSend({} as Sentry.ErrorEvent, { originalException: error })

  it('drops a ServerUnavailableError (control flow, already handled)', () => {
    expect(send(new ServerUnavailableError())).toBeNull()
  })

  it('drops a sub-500 ApiError the user has already seen as a toast', () => {
    expect(send(new ApiError(401, 'nope'))).toBeNull()
    expect(send(new ApiError(422, 'invalid'))).toBeNull()
  })

  it('keeps a 5xx ApiError — an unexpected server failure', () => {
    expect(send(new ApiError(500, 'boom'))).not.toBeNull()
  })

  it('keeps an ordinary error and scrubs its url', () => {
    const event = {
      request: { url: '/api/x?token=t' },
    } as Sentry.ErrorEvent
    const out = beforeSend(event, { originalException: new Error('crash') })
    expect(out).toBe(event)
    expect(out?.request?.url).toBe('/api/x')
  })
})

describe('beforeSendTransaction', () => {
  it('scrubs the url without dropping the transaction', () => {
    const event = {
      request: { url: '/api/posts?token=t' },
    } as Parameters<typeof beforeSendTransaction>[0]
    const out = beforeSendTransaction(event)
    expect(out).toBe(event)
    expect(out.request?.url).toBe('/api/posts')
  })
})

describe('initTelemetry', () => {
  it('is a no-op when no DSN is configured (fail-open)', () => {
    expect(isTelemetryEnabled()).toBe(false)
    initTelemetry({} as never)
    expect(Sentry.init).not.toHaveBeenCalled()
  })

  it('initialises Sentry and binds non-PII identity when a DSN is set', async () => {
    localStorage.clear()
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@o0.ingest.sentry.io/1')
    vi.resetModules()

    const sentry = await import('@sentry/react')
    const mod = await import('./sentry')
    const { useAuthStore } = await import('@/stores/authStore')

    mod.initTelemetry({} as never)
    expect(sentry.init).toHaveBeenCalledTimes(1)
    // Signed out at boot.
    expect(sentry.setUser).toHaveBeenLastCalledWith(null)

    useAuthStore.getState().setUser({
      id: 'user-1',
      firstName: 'X',
      lastName: 'Y',
      email: 'x@y.z',
      role: 'owner',
      created_at: '',
      updated_at: '',
      tenant: { id: 'tenant-9', name: 'Acme', slug: 'acme' },
    } as never)

    // Only the stable id — never email or name.
    expect(sentry.setUser).toHaveBeenLastCalledWith({ id: 'user-1' })
    expect(sentry.setTag).toHaveBeenLastCalledWith('tenant_id', 'tenant-9')

    useAuthStore.getState().clearUser()
    expect(sentry.setUser).toHaveBeenLastCalledWith(null)
  })
})
