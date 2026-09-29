import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  captureIdea,
  deleteIdea,
  editIdea,
  listIdeas,
  setIdeaVerdict,
} from './ideas'

/**
 * The executable half of the CON-315 contract, asserted on the wire.
 *
 * The server owns the verdict rules now, so what is left to hold on this side
 * is what the client *sends*: which path, which method, and which keys. Each
 * of the mistakes below type-checks and fails quietly — a list read as a bare
 * array renders empty, a PATCH that restates a field overwrites a teammate's
 * edit, and a verdict body missing `remind_at` is a 400 the screen rolls back
 * without saying why.
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

function sent(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return {
    url,
    method: init.method,
    body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
  }
}

const IDEA = {
  id: 'k3Xz9QpL',
  title: 'A teardown of our own onboarding',
  note: '',
  campaign_id: null,
  verdict: null,
  created_at: '2026-09-17T08:00:00Z',
  created_by: 'Vo5fQRrMVdI',
  created_by_name: 'Serhii Herasymov',
  decided_at: null,
  decided_by: null,
  remind_at: null,
  updated_at: '2026-09-17T08:00:00Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listIdeas', () => {
  it('reads the wrapped list, not a bare array', async () => {
    const fetchMock = stubFetch(jsonResponse(200, { ideas: [IDEA] }))

    const ideas = await listIdeas()

    expect(sent(fetchMock).url).toBe('/api/ideas')
    expect(ideas).toEqual([
      expect.objectContaining({
        id: 'k3Xz9QpL',
        campaignId: null,
        createdBy: 'Vo5fQRrMVdI',
        verdict: null,
      }),
    ])
  })

  it('narrows to one campaign with a filter on the same path', async () => {
    const fetchMock = stubFetch(jsonResponse(200, { ideas: [] }))

    await listIdeas('c 1')

    expect(sent(fetchMock).url).toBe('/api/ideas?campaign_id=c%201')
  })
})

describe('captureIdea', () => {
  it('posts a title and defaults the rest', async () => {
    const fetchMock = stubFetch(jsonResponse(201, IDEA))

    await captureIdea({ title: 'A teardown of our own onboarding' })

    expect(sent(fetchMock)).toEqual({
      url: '/api/ideas',
      method: 'POST',
      body: {
        title: 'A teardown of our own onboarding',
        note: '',
        campaign_id: null,
      },
    })
  })
})

describe('editIdea', () => {
  /*
   * Presence-aware: the body is exactly the keys the screen owns. A helper that
   * filled in the rest from a cached copy would put that copy back over a
   * teammate editing the other field.
   */
  it('sends only the field that changed', async () => {
    const fetchMock = stubFetch(jsonResponse(200, { ...IDEA, note: 'More' }))

    await editIdea('k3Xz9QpL', { note: 'More' })

    expect(sent(fetchMock)).toEqual({
      url: '/api/ideas/k3Xz9QpL',
      method: 'PATCH',
      body: { note: 'More' },
    })
  })

  it('sends a null campaign as a value, which unfiles the idea', async () => {
    const fetchMock = stubFetch(jsonResponse(200, IDEA))

    await editIdea('k3Xz9QpL', { campaign_id: null })

    expect(sent(fetchMock).body).toEqual({ campaign_id: null })
  })

  it('surfaces a refusal rather than resolving', async () => {
    stubFetch(jsonResponse(404, { error: 'idea not found' }))

    await expect(editIdea('gone', { title: 'x' })).rejects.toThrow(
      'idea not found',
    )
  })
})

describe('setIdeaVerdict', () => {
  it('carries the wake-up on a postponement', async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, {
        ...IDEA,
        verdict: 'later',
        remind_at: '2026-10-17T08:00:00Z',
      }),
    )

    const idea = await setIdeaVerdict(
      'k3Xz9QpL',
      'later',
      '2026-10-17T08:00:00Z',
    )

    expect(sent(fetchMock)).toEqual({
      url: '/api/ideas/k3Xz9QpL/verdict',
      method: 'PUT',
      body: { verdict: 'later', remind_at: '2026-10-17T08:00:00Z' },
    })
    expect(idea.remindAt).toBe('2026-10-17T08:00:00Z')
  })

  // Both keys on every call: the server refuses a body missing either.
  it('sends both keys when returning an idea to the inbox', async () => {
    const fetchMock = stubFetch(jsonResponse(200, IDEA))

    await setIdeaVerdict('k3Xz9QpL', null)

    expect(sent(fetchMock).body).toEqual({ verdict: null, remind_at: null })
  })
})

describe('deleteIdea', () => {
  it('deletes by id and expects no body back', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }))

    await deleteIdea('k3Xz9QpL')

    expect(sent(fetchMock)).toEqual({
      url: '/api/ideas/k3Xz9QpL',
      method: 'DELETE',
      body: undefined,
    })
  })
})
