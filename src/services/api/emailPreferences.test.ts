import { afterEach, describe, expect, it, vi } from 'vitest'
import { getEmailPreferences, setMarketingEmails } from './emailPreferences'

/**
 * The endpoint these call does not exist yet — the backend half of CON-155
 * shipped the token-gated unsubscribe pages only. Until it does, this file is
 * the executable statement of the contract in `emailPreferences.ts`: path,
 * method, body, and the snake_case wire shape the handler has to answer with.
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

describe('getEmailPreferences', () => {
  it("reads the signed-in user's own row and unwraps the wire shape", async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, { marketing: true, delivery_blocked: false }),
    )

    const preferences = await getEmailPreferences('u1')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/users/u1/email-preferences')
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
    expect(preferences).toEqual({ marketing: true, deliveryBlocked: false })
  })

  it('reports a bounce block separately from the subscription', async () => {
    // The two are independent: a bounced address can still be *subscribed* to
    // marketing and receive none of it, which is the case the UI has to explain
    // rather than offer a switch for.
    stubFetch(jsonResponse(200, { marketing: true, delivery_blocked: true }))

    await expect(getEmailPreferences('u1')).resolves.toEqual({
      marketing: true,
      deliveryBlocked: true,
    })
  })

  it("surfaces the server's message rather than a generic failure", async () => {
    stubFetch(jsonResponse(403, { error: 'not your account' }))

    await expect(getEmailPreferences('u2')).rejects.toThrow('not your account')
  })
})

describe('setMarketingEmails', () => {
  it('PUTs marketing alone and returns the new state', async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, { marketing: false, delivery_blocked: false }),
    )

    const preferences = await setMarketingEmails('u1', false)

    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/users/u1/email-preferences')
    expect(init.method).toBe('PUT')
    // `delivery_blocked` is the server's to report, so it must not travel back
    // up in the body — a client that could set it could hide a bounce.
    expect(JSON.parse(init.body)).toEqual({ marketing: false })
    expect(preferences).toEqual({ marketing: false, deliveryBlocked: false })
  })

  it('resubscribes through the same route', async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, { marketing: true, delivery_blocked: false }),
    )

    await setMarketingEmails('u1', true)

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      marketing: true,
    })
  })
})
