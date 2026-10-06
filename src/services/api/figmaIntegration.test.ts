import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setActiveWorkspaceId } from '@/lib/activeWorkspace'

const handleForbidden = vi.fn()
vi.mock('@/lib/staleWorkspace', () => ({ handleForbidden }))

const {
  approveFigmaPairing,
  denyFigmaPairing,
  listFigmaConnections,
  previewFigmaPairing,
  revokeFigmaConnection,
} = await import('./figmaIntegration')
const { ApiError } = await import('./errors')

function stubFetch(res: Response) {
  const fetchMock = vi.fn().mockResolvedValue(res)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const CONNECTION = {
  id: 'pt_1',
  client: 'figma',
  label: 'Figma · Jane',
  created_at: '2026-10-06T10:00:00Z',
  last_used_at: null,
}

beforeEach(() => {
  setActiveWorkspaceId('ws-tab')
})

afterEach(() => {
  setActiveWorkspaceId(null)
  vi.unstubAllGlobals()
  handleForbidden.mockReset()
})

describe('Figma pairing (CON-339)', () => {
  it('previews in the tab’s workspace, with the key escaped into the path', async () => {
    const fetchMock = stubFetch(
      json(200, { client_label: 'Figma · Jane', status: 'pending' }),
    )
    await previewFigmaPairing('a/b')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/integrations/figma/pairings/a%2Fb')
    expect(init.headers).toEqual({ 'X-Workspace-Id': 'ws-tab' })
  })

  it('approves in the chosen workspace, not the tab’s', async () => {
    // The token is minted wherever `X-Workspace-Id` points, and the page lets
    // the user pick — so the pick has to be what goes out.
    const fetchMock = stubFetch(json(200, { connection: CONNECTION }))
    await expect(approveFigmaPairing('wk', 'ws-chosen')).resolves.toEqual(
      CONNECTION,
    )
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/integrations/figma/pairings/wk/approve')
    expect(init).toMatchObject({ method: 'POST', credentials: 'include' })
    expect(init.headers).toEqual({ 'X-Workspace-Id': 'ws-chosen' })
  })

  it('denies in the chosen workspace too', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }))
    await denyFigmaPairing('wk', 'ws-chosen')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/integrations/figma/pairings/wk/deny')
    expect(init.headers).toEqual({ 'X-Workspace-Id': 'ws-chosen' })
  })

  it('carries the 409 code, so the page can tell "already answered" apart', async () => {
    stubFetch(
      json(409, {
        code: 'pairing_not_pending',
        error: 'this connection request was already answered',
      }),
    )
    const err = await approveFigmaPairing('wk', 'ws-chosen').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 409, code: 'pairing_not_pending' })
  })

  it('does not treat a 403 in a chosen workspace as a stale tab', async () => {
    // The tab's own pin was never involved; verifying it would be a request
    // about the wrong workspace.
    stubFetch(json(403, { error: 'forbidden' }))
    await approveFigmaPairing('wk', 'ws-chosen').catch(() => {})
    expect(handleForbidden).not.toHaveBeenCalled()
  })
})

describe('Figma connections', () => {
  it('unwraps the list, and reads a null list as empty', async () => {
    stubFetch(json(200, { connections: [CONNECTION] }))
    await expect(listFigmaConnections()).resolves.toEqual([CONNECTION])
    stubFetch(json(200, { connections: null }))
    await expect(listFigmaConnections()).resolves.toEqual([])
  })

  it('revokes by id', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }))
    await revokeFigmaConnection('pt_1')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/integrations/figma/connections/pt_1')
    expect(init).toMatchObject({ method: 'DELETE' })
  })
})
