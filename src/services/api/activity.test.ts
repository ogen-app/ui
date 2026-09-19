import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchActivityReport, listActivityReports } from './activity'

/**
 * The executable half of the CON-285 report contract: the two paths, the
 * required `tz`, and the nesting.
 *
 * Written against the wire rather than a fixture because the failures this
 * guards are the quiet ones. `tz` is the parameter that decides where the day
 * is cut, and dropping it is a 400 rather than a UTC day — so the test that
 * matters is that it is always sent. The day list is `{reports: […]}` where the
 * notification list next door is a bare array; either mistake type-checks and
 * renders an empty feed.
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

const REPORT = {
  date: '2026-08-18',
  tz: 'America/New_York',
  published: {
    total: 6,
    by_channel: [
      { platform_id: 'Xk3mQ9', count: 3 },
      { platform_id: 'Pq7Lz2', count: 3 },
    ],
  },
  failed: {
    total: 1,
    by_channel: [{ platform_id: 'Xk3mQ9', count: 1 }],
    posts: [
      {
        post_id: '9aQ2xLkP',
        platform_id: 'Xk3mQ9',
        status: 'failed',
        failure_reason: 'zernio_terminal: rejected',
      },
    ],
  },
  created: {
    posts_total: 4,
    scheduled_total: 3,
    by_author: [{ user_id: 'Vo5fQRrMVdI', count: 4 }],
  },
  campaigns_created: { total: 1, campaign_ids: ['c_8Kd2'] },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchActivityReport', () => {
  it('names the day in the path and the zone in the query', async () => {
    const fetchMock = stubFetch(jsonResponse(200, REPORT))

    const report = await fetchActivityReport('2026-08-18', {
      tz: 'America/New_York',
    })

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/activity/report/2026-08-18?tz=America%2FNew_York',
    )
    expect(report.published.total).toBe(6)
    expect(report.failed.posts[0].failure_reason).toBe(
      'zernio_terminal: rejected',
    )
    expect(report.created.scheduled_total).toBe(3)
    expect(report.campaigns_created.campaign_ids).toEqual(['c_8Kd2'])
  })

  it('narrows to one campaign when asked, and not otherwise', async () => {
    const fetchMock = stubFetch(jsonResponse(200, REPORT))

    await fetchActivityReport('2026-08-18', { tz: 'UTC', campaignId: 'c1' })

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/activity/report/2026-08-18?tz=UTC&campaign_id=c1',
    )
  })

  it('reads a half-sent body as a quiet day rather than throwing', async () => {
    // Every branch of the shape is defaulted, so one absent section costs that
    // section and not the screen — the day still renders, saying less.
    stubFetch(jsonResponse(200, { date: '2026-08-18' }))

    const report = await fetchActivityReport('2026-08-18', { tz: 'UTC' })

    expect(report.published).toEqual({ total: 0, by_channel: [] })
    expect(report.failed.posts).toEqual([])
    expect(report.created.by_author).toEqual([])
    expect(report.campaigns_created.campaign_ids).toEqual([])
  })

  it('falls back to the day and zone it asked for', async () => {
    // The title is built from `date`, so an echo this build cannot read must
    // not leave the report unnamed.
    stubFetch(jsonResponse(200, {}))

    const report = await fetchActivityReport('2026-08-18', { tz: 'UTC' })

    expect(report.date).toBe('2026-08-18')
    expect(report.tz).toBe('UTC')
  })

  it('drops a failed post with no id rather than rendering an anonymous row', async () => {
    stubFetch(
      jsonResponse(200, {
        ...REPORT,
        failed: { ...REPORT.failed, posts: [{ platform_id: 'Xk3mQ9' }] },
      }),
    )

    const report = await fetchActivityReport('2026-08-18', { tz: 'UTC' })

    expect(report.failed.posts).toEqual([])
    // The tally is the server's and still counts it: the row is unlinkable,
    // not imaginary.
    expect(report.failed.total).toBe(1)
  })
})

describe('listActivityReports', () => {
  it('asks for a bounded run of days in the caller’s zone', async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, {
        reports: [
          {
            date: '2026-08-18',
            published_total: 6,
            failed_total: 1,
            created_total: 4,
            campaigns_created_total: 1,
          },
        ],
        generated_at: '2026-09-04T14:00:00Z',
      }),
    )

    const rows = await listActivityReports({ tz: 'Europe/Kyiv' })

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/activity/reports?tz=Europe%2FKyiv&limit=30',
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].published_total).toBe(6)
  })

  it('unwraps the list rather than reading the envelope as an array', async () => {
    // The shape the notification list *does* have, sent here by mistake, must
    // read as nothing rather than as a page of undefined days.
    stubFetch(jsonResponse(200, [{ date: '2026-08-18' }]))

    await expect(listActivityReports({ tz: 'UTC' })).resolves.toEqual([])
  })

  it('drops a row that names no day', async () => {
    stubFetch(
      jsonResponse(200, { reports: [{ published_total: 3 }, null, 'nope'] }),
    )

    await expect(listActivityReports({ tz: 'UTC' })).resolves.toEqual([])
  })

  it('defaults an absent total to zero rather than to NaN', async () => {
    stubFetch(jsonResponse(200, { reports: [{ date: '2026-08-18' }] }))

    const [row] = await listActivityReports({ tz: 'UTC' })

    expect(row).toEqual({
      date: '2026-08-18',
      published_total: 0,
      failed_total: 0,
      created_total: 0,
      campaigns_created_total: 0,
    })
  })
})
