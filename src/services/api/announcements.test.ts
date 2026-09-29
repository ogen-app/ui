import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  dismissAnnouncement,
  listAnnouncements,
  parseAnnouncement,
  recordAnnouncementClick,
} from './announcements'

/**
 * The CON-230 contract as the handler actually sends it: a bare array of
 * snake_case rows with empty optionals omitted. The ticket's own examples are
 * camelCase, and a client written against them type-checks, parses every row
 * to "no CTA" and renders a banner with its button missing.
 */

function stubFetch(res: Response) {
  const fetchMock = vi.fn().mockResolvedValue(res)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const ROW = {
  id: 'An_x9',
  title: 'New: scheduled threads',
  body: 'You can now publish X threads.',
  image_url: 'https://cdn.example.com/promo.png',
  image_alt: 'Thread composer',
  cta_label: 'Learn more',
  cta_url: 'https://getogen.com/changelog/threads',
  published_at: '2026-09-17T10:00:00Z',
  ends_at: '2026-10-01T00:00:00Z',
  clicked: false,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listAnnouncements', () => {
  it('reads a bare snake_case array off /api/announcements', async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify([ROW]), { status: 200 }),
    )

    const rows = await listAnnouncements()

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/announcements$/)
    expect(rows).toEqual([
      {
        id: 'An_x9',
        title: 'New: scheduled threads',
        body: 'You can now publish X threads.',
        cta: {
          label: 'Learn more',
          url: 'https://getogen.com/changelog/threads',
        },
        publishedAt: '2026-09-17T10:00:00Z',
        endsAt: '2026-10-01T00:00:00Z',
        clicked: false,
      },
    ])
  })

  it('reads anything but an array as nothing to announce', async () => {
    stubFetch(new Response(JSON.stringify({ items: [ROW] }), { status: 200 }))
    expect(await listAnnouncements()).toEqual([])
  })
})

describe('parseAnnouncement', () => {
  it('drops a row with no id, or with nothing to say', () => {
    expect(parseAnnouncement({ ...ROW, id: '' })).toBeNull()
    expect(parseAnnouncement({ id: 'a', title: ' ', body: '' })).toBeNull()
    expect(parseAnnouncement(null)).toBeNull()
  })

  it('reads omitted optionals as absent rather than empty', () => {
    const row = parseAnnouncement({ id: 'a', title: 'Hi', body: 'There' })
    expect(row).toMatchObject({
      cta: null,
      publishedAt: null,
      endsAt: null,
      clicked: false,
    })
  })

  it('keeps a CTA only when it has both a label and an https URL', () => {
    expect(parseAnnouncement({ ...ROW, cta_label: '' })?.cta).toBeNull()
    expect(parseAnnouncement({ ...ROW, cta_url: undefined })?.cta).toBeNull()
    expect(
      parseAnnouncement({ ...ROW, cta_url: 'javascript:alert(1)' })?.cta,
    ).toBeNull()
    expect(
      parseAnnouncement({ ...ROW, cta_url: 'http://getogen.com' })?.cta,
    ).toBeNull()
  })
})

describe('click and dismiss', () => {
  it('POST to the row, one path each', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }))

    await recordAnnouncementClick('An_x9')
    await dismissAnnouncement('An_x9')

    const [clickUrl, clickInit] = fetchMock.mock.calls[0]
    const [dismissUrl, dismissInit] = fetchMock.mock.calls[1]
    expect(clickUrl).toMatch(/\/api\/announcements\/An_x9\/click$/)
    expect(clickInit.method).toBe('POST')
    expect(dismissUrl).toMatch(/\/api\/announcements\/An_x9\/dismiss$/)
    expect(dismissInit.method).toBe('POST')
  })

  it('throws on a 404, which is what an announcement that stopped showing answers', async () => {
    stubFetch(
      new Response(JSON.stringify({ error: 'announcement not found' }), {
        status: 404,
      }),
    )
    await expect(dismissAnnouncement('gone')).rejects.toThrow()
  })
})
