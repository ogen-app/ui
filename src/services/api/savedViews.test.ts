import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createSavedView,
  deleteSavedView,
  listSavedViews,
  updateSavedView,
} from './savedViews'

/**
 * The CON-389 saved-views contract, asserted on the wire: which path, which
 * method, which keys — a PATCH that restated a field would undo a teammate's
 * rename, and a list read as a bare array renders empty.
 */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stub(res: Response) {
  const fetchMock = vi.fn().mockResolvedValue(res)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function sent(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return {
    url,
    method: init.method,
    body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
  }
}

const VIEW = {
  id: 'v1',
  surface: 'ideas',
  name: 'Strong PDFs',
  query: 'fit=high&kind=pdf',
  shared: false,
  created_by: 'u1',
  created_at: '2026-10-17T09:00:00Z',
  updated_at: '2026-10-17T09:00:00Z',
  valid: true,
  can_edit: true,
  counts: { undecided: 3 },
}

afterEach(() => vi.unstubAllGlobals())

describe('saved views', () => {
  it('lists a surface with the counts asked for, in the viewer’s zone', async () => {
    const fetchMock = stub(
      jsonResponse(200, {
        views: [VIEW, { ...VIEW, id: 'v2', valid: false, counts: undefined }],
      }),
    )

    const views = await listSavedViews('ideas', {
      counts: ['undecided'],
      timeZone: 'Europe/Kyiv',
    })

    expect(sent(fetchMock).url).toBe(
      '/api/saved-views?surface=ideas&counts=undecided&tz=Europe%2FKyiv',
    )
    expect(views[0]).toEqual(
      expect.objectContaining({ canEdit: true, counts: { undecided: 3 } }),
    )
    // An invalid view carries no counts; it reads as none rather than undefined.
    expect(views[1].counts).toEqual({})
  })

  it('creates with the surface, name, query and sharing', async () => {
    const fetchMock = stub(jsonResponse(201, VIEW))
    await createSavedView({
      surface: 'ideas',
      name: 'Strong PDFs',
      query: 'fit=high',
      shared: true,
    })
    expect(sent(fetchMock)).toEqual({
      url: '/api/saved-views',
      method: 'POST',
      body: {
        surface: 'ideas',
        name: 'Strong PDFs',
        query: 'fit=high',
        shared: true,
      },
    })
  })

  it('patches only what changes', async () => {
    const fetchMock = stub(jsonResponse(200, VIEW))
    await updateSavedView('v1', { shared: true })
    expect(sent(fetchMock)).toEqual({
      url: '/api/saved-views/v1',
      method: 'PATCH',
      body: { shared: true },
    })
  })

  it('deletes by id', async () => {
    const fetchMock = stub(new Response(null, { status: 204 }))
    await deleteSavedView('v1')
    expect(sent(fetchMock)).toEqual({
      url: '/api/saved-views/v1',
      method: 'DELETE',
      body: undefined,
    })
  })
})
