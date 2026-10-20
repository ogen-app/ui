import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAuthProviders, googleStartUrl } from './googleAuth'

afterEach(() => vi.unstubAllGlobals())

describe('googleStartUrl', () => {
  it('starts a plain sign-in with nothing to say', () => {
    expect(googleStartUrl()).toMatch(/\/api\/auth\/google\/start$/)
  })

  it('carries where to land, but not the home page', () => {
    expect(googleStartUrl({ returnTo: '/campaigns?tab=2' })).toContain(
      'return_to=%2Fcampaigns%3Ftab%3D2',
    )
    expect(googleStartUrl({ returnTo: '/' })).not.toContain('return_to')
  })

  it('names the intent and the invitation when there is one', () => {
    const url = new URL(
      googleStartUrl({ intent: 'invite', inviteToken: 'tok' }),
      'http://app.test',
    )
    expect(url.searchParams.get('intent')).toBe('invite')
    expect(url.searchParams.get('invite_token')).toBe('tok')
  })
})

describe('getAuthProviders', () => {
  it("reads a server that predates the endpoint as 'no Google'", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not found', { status: 404 })),
    )
    await expect(getAuthProviders()).resolves.toEqual({
      google: { enabled: false },
    })
  })

  it('does not mistake an outage for "no Google"', async () => {
    // A 5xx answered as "disabled" would be cached for the query's stale time
    // and hide the button long after the server came back.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('boom', { status: 503 })),
    )
    await expect(getAuthProviders()).rejects.toThrow()
  })

  it('passes a configured server through', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ google: { enabled: true } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    )
    await expect(getAuthProviders()).resolves.toEqual({
      google: { enabled: true },
    })
  })
})
