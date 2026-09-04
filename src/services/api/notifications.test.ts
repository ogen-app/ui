import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  dismissNotification,
  listNotifications,
  markAllNotificationsRead,
  parseNotification,
  setNotificationRead,
  streamNotifications,
  unreadNotificationCount,
} from './notifications'

/**
 * The executable half of the CON-242 contract: the paths, the query grammar,
 * the two unwrapped scalars (`count`, `updated`), and the frame shape the
 * stream carries.
 *
 * Written against the wire rather than against a fixture because the failures
 * this guards are the quiet ones. The list is a **bare array** where every
 * other collection in this app is; the SSE `data:` is the notification itself
 * where `/api/events` sends an envelope around it. Either mistake type-checks,
 * renders an empty inbox, and looks like "nothing has happened yet".
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

const ROW = {
  id: 'Vo5fQRrMVdI',
  seq: 10432,
  level: 'error',
  type: 'post.publish_failed',
  title: 'Post failed to publish',
  body: "Your LinkedIn post couldn't be published.",
  entity_type: 'post',
  entity_id: '9aQ2xLkP',
  action_url: '/posts/9aQ2xLkP',
  data: { platform: 'linkedin' },
  read_at: null,
  created_at: '2026-09-02T12:00:00Z',
  expires_at: null,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listNotifications', () => {
  it('reads a bare array off one workspace-scoped route', async () => {
    const fetchMock = stubFetch(jsonResponse(200, [ROW]))

    const rows = await listNotifications()

    expect(fetchMock.mock.calls[0][0]).toBe('/api/notifications')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('Vo5fQRrMVdI')
    expect(rows[0].seq).toBe(10432)
  })

  it('sends only the parameters it was given', async () => {
    const fetchMock = stubFetch(jsonResponse(200, []))

    await listNotifications({ status: 'unread', limit: 30, before: 900 })

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/notifications?status=unread&limit=30&before=900',
    )
  })

  it('keeps a zero cursor rather than dropping it as falsy', async () => {
    // `since=0` is a real request — everything from the beginning — and the
    // obvious `if (options.since)` would silently turn it into "live only".
    const fetchMock = stubFetch(jsonResponse(200, []))

    await listNotifications({ since: 0 })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/notifications?since=0')
  })

  it('drops an unreadable row instead of the whole page', async () => {
    stubFetch(jsonResponse(200, [ROW, { id: 'no-seq' }, null]))

    const rows = await listNotifications()

    expect(rows.map((row) => row.id)).toEqual(['Vo5fQRrMVdI'])
  })

  it('reads a body that is not a list at all as an empty inbox', async () => {
    stubFetch(jsonResponse(200, { items: [ROW] }))

    await expect(listNotifications()).resolves.toEqual([])
  })
})

describe('the scalar reads', () => {
  it('unwraps the badge count', async () => {
    const fetchMock = stubFetch(jsonResponse(200, { count: 7 }))

    await expect(unreadNotificationCount()).resolves.toBe(7)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/notifications/unread-count')
  })

  it('unwraps how many rows mark-all-read touched', async () => {
    const fetchMock = stubFetch(jsonResponse(200, { updated: 5 }))

    await expect(markAllNotificationsRead(10432)).resolves.toBe(5)

    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/notifications/mark-all-read')
    expect(init.method).toBe('POST')
    // Bounded by what the reader was actually shown: a notification arriving
    // between the click and the request has to stay unread.
    expect(JSON.parse(init.body)).toEqual({ before: 10432 })
  })

  it('marks everything read when no bound is given', async () => {
    const fetchMock = stubFetch(jsonResponse(200, { updated: 12 }))

    await markAllNotificationsRead()

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({})
  })
})

describe('the single-row writes', () => {
  it('toggles read with the boolean the handler requires', async () => {
    const fetchMock = stubFetch(jsonResponse(200, { ...ROW, read_at: null }))

    await setNotificationRead('Vo5fQRrMVdI', false)

    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/notifications/Vo5fQRrMVdI')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({ read: false })
  })

  it('dismisses with DELETE and expects no body back', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }))

    await expect(dismissNotification('Vo5fQRrMVdI')).resolves.toBeUndefined()

    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/notifications/Vo5fQRrMVdI')
    expect(init.method).toBe('DELETE')
  })
})

describe('streamNotifications', () => {
  function sseResponse(body: string): Response {
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  it('sends the replay cursor as Last-Event-ID', async () => {
    const fetchMock = stubFetch(sseResponse(''))

    await streamNotifications(
      { onNotification: () => {} },
      new AbortController().signal,
      { lastEventId: 10432 },
    )

    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/notifications/stream')
    expect(init.headers['Last-Event-ID']).toBe('10432')
  })

  it('connects live-only when there is no cursor', async () => {
    // No header at all, not an empty one: the server reads absence as "live
    // from now", which is right on a first connect where REST loaded history.
    const fetchMock = stubFetch(sseResponse(''))

    await streamNotifications(
      { onNotification: () => {} },
      new AbortController().signal,
    )

    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty(
      'Last-Event-ID',
    )
  })

  it("reads the frame's data as the notification itself", async () => {
    // Not the {id, topic, type, payload} envelope `/api/events` carries. This
    // is the difference that would render an inbox of blanks.
    stubFetch(
      sseResponse(
        `id: 10432\nevent: notification\ndata: ${JSON.stringify(ROW)}\n\n`,
      ),
    )
    const seen: string[] = []

    await streamNotifications(
      { onNotification: (n) => seen.push(n.type) },
      new AbortController().signal,
    )

    expect(seen).toEqual(['post.publish_failed'])
  })

  it('survives a heartbeat and a malformed frame', async () => {
    stubFetch(
      sseResponse(
        `: ping\n\nevent: notification\ndata: {oops\n\n` +
          `event: notification\ndata: ${JSON.stringify(ROW)}\n\n`,
      ),
    )
    const seen: string[] = []

    await streamNotifications(
      { onNotification: (n) => seen.push(n.id) },
      new AbortController().signal,
    )

    expect(seen).toEqual(['Vo5fQRrMVdI'])
  })

  it('throws when the stream could not be opened at all', async () => {
    stubFetch(jsonResponse(401, { error: 'unauthorized' }))

    await expect(
      streamNotifications(
        { onNotification: () => {} },
        new AbortController().signal,
      ),
    ).rejects.toThrow()
  })
})

describe('parseNotification', () => {
  it('rejects a row with no usable cursor', () => {
    // `seq` is the replay anchor. A row that cannot be positioned would either
    // replay forever or hide everything after it.
    expect(parseNotification({ ...ROW, seq: '10432' })).toBeNull()
    expect(parseNotification({ ...ROW, id: '' })).toBeNull()
  })

  it('under-states a level it has never heard of', () => {
    const row = parseNotification({ ...ROW, level: 'catastrophe' })
    expect(row?.level).toBe('info')
  })

  it('gives every optional field a defensible empty value', () => {
    const row = parseNotification({ id: 'a', seq: 1 })
    expect(row).toEqual({
      id: 'a',
      seq: 1,
      level: 'info',
      type: '',
      title: '',
      body: '',
      entity_type: '',
      entity_id: '',
      action_url: '',
      data: null,
      read_at: null,
      created_at: '',
      expires_at: null,
    })
  })
})
