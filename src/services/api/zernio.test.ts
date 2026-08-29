import { afterEach, describe, expect, it, vi } from 'vitest'
import { disconnectZernioAccount } from './zernio'
import { ZernioError } from '@/types/integrations'

/**
 * Stubs `fetch` with a single canned response and returns the calls, so a test
 * can assert both what we sent and how we read the answer back.
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

describe('disconnectZernioAccount', () => {
  it('DELETEs the account and resolves on 204', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }))

    await expect(disconnectZernioAccount('acc-1')).resolves.toBeUndefined()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/integrations/zernio/accounts/acc-1')
    expect(init).toMatchObject({ method: 'DELETE', credentials: 'include' })
  })

  it('asks for force only when told to', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }))
    await disconnectZernioAccount('acc-1', true)
    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/integrations/zernio/accounts/acc-1?force=true',
    )
  })

  it('escapes the id into the path', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }))
    await disconnectZernioAccount('a/b?c')
    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/integrations/zernio/accounts/a%2Fb%3Fc',
    )
  })

  it('carries the scheduled-post count off the 409 guard', async () => {
    // The whole two-step confirm dialog hangs off this number surviving the
    // parse: the body is read twice (clone for the count, original for the
    // message), and consuming it in the wrong order silently drops the count.
    stubFetch(
      jsonResponse(409, {
        error: 'account_has_scheduled_posts',
        scheduledPosts: 3,
      }),
    )

    const err = await disconnectZernioAccount('acc-1').catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ZernioError)
    expect(err).toMatchObject({
      code: 'account_has_scheduled_posts',
      status: 409,
      scheduledPosts: 3,
    })
  })

  it('maps 404 to account_not_found with no count', async () => {
    stubFetch(jsonResponse(404, { error: 'account_not_found' }))

    const err = (await disconnectZernioAccount('gone').catch(
      (e: unknown) => e,
    )) as ZernioError

    expect(err.code).toBe('account_not_found')
    expect(err.scheduledPosts).toBeUndefined()
  })

  it('maps an upstream failure to integration_degraded', async () => {
    stubFetch(jsonResponse(502, { error: 'integration_degraded' }))

    const err = (await disconnectZernioAccount('acc-1').catch(
      (e: unknown) => e,
    )) as ZernioError

    expect(err.code).toBe('integration_degraded')
    expect(err.status).toBe(502)
  })

  it('falls back to `unknown` for an unrecognised body', async () => {
    stubFetch(new Response('<html>gateway</html>', { status: 500 }))

    const err = (await disconnectZernioAccount('acc-1').catch(
      (e: unknown) => e,
    )) as ZernioError

    expect(err.code).toBe('unknown')
    expect(err.message).toBe('Unable to disconnect the account')
  })
})
