import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContentSeries } from '@/types/series'
import {
  attachSeries,
  deleteSeries,
  listSeries,
  promoteSeries,
  saveSeries,
  seriesRhythm,
  setSeriesRhythm,
} from './series'

/**
 * The contract with `/api/series` and a campaign's `/series` (CON-264,
 * CON-496): paths, methods, bodies, and the wire shape mapped onto the
 * client's.
 */

function stubFetch(...bodies: [number, unknown][]) {
  const fetchMock = vi.fn()
  for (const [status, body] of bodies)
    fetchMock.mockResolvedValueOnce(
      new Response(body === null ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const sent = (fetchMock: ReturnType<typeof vi.fn>, i = 0) => ({
  url: fetchMock.mock.calls[i][0] as string,
  method: (fetchMock.mock.calls[i][1] as RequestInit).method,
  body: JSON.parse(
    ((fetchMock.mock.calls[i][1] as RequestInit).body as string) ?? 'null',
  ),
})

const wire = {
  id: 's1',
  name: 'Weekly digest',
  promise: 'The week in a minute.',
  recipe: 'Lead with the biggest story.',
  supply: 'self',
  content_format: 'digest',
  default_rhythm: { times: 1, per: 'week', every: 2, weekday: 'tuesday' },
  campaign_id: 'c1',
  usage: { drafts: 2, published: 5 },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the series', () => {
  it('reads both scopes and maps the wire onto the client’s shape', async () => {
    const fetchMock = stubFetch([200, { series: [wire] }])
    const [series] = await listSeries()
    expect(sent(fetchMock).url).toBe('/api/series')
    expect(series).toEqual({
      id: 's1',
      name: 'Weekly digest',
      promise: 'The week in a minute.',
      recipe: 'Lead with the biggest story.',
      supply: 'self',
      formatId: 'digest',
      defaultRhythm: { times: 1, per: 'week', every: 2, weekday: 'tuesday' },
      scope: { kind: 'campaign', campaignId: 'c1' },
      usage: { drafts: 2, published: 5 },
      updatedAt: '2026-01-02T00:00:00Z',
    })
  })

  const draft: ContentSeries = {
    id: '',
    name: 'Weekly digest',
    promise: '',
    recipe: '',
    supply: 'idea',
    formatId: null,
    defaultRhythm: { times: 2, per: 'month' },
    scope: { kind: 'campaign', campaignId: 'c1' },
    usage: { drafts: 0, published: 0 },
    updatedAt: '',
  }

  it('creates one never stored inside its campaign, and never sends usage', async () => {
    const fetchMock = stubFetch([201, wire])
    await saveSeries(draft)
    expect(sent(fetchMock)).toEqual({
      url: '/api/series',
      method: 'POST',
      body: {
        name: 'Weekly digest',
        promise: '',
        recipe: '',
        supply: 'idea',
        content_format: null,
        default_rhythm: { times: 2, per: 'month' },
        campaign_id: 'c1',
      },
    })
  })

  it('replaces a stored one whole, without its scope', async () => {
    const fetchMock = stubFetch([200, wire])
    await saveSeries({ ...draft, id: 's1' })
    const req = sent(fetchMock)
    expect(req.url).toBe('/api/series/s1')
    expect(req.method).toBe('PUT')
    expect(req.body).not.toHaveProperty('campaign_id')
  })

  it('deletes and promotes by id', async () => {
    const fetchMock = stubFetch(
      [204, null],
      [200, { ...wire, campaign_id: null }],
    )
    await deleteSeries('s1')
    const promoted = await promoteSeries('s1')
    expect(sent(fetchMock, 0)).toMatchObject({
      url: '/api/series/s1',
      method: 'DELETE',
    })
    expect(sent(fetchMock, 1)).toMatchObject({
      url: '/api/series/s1/promote',
      method: 'POST',
    })
    expect(promoted.scope).toEqual({ kind: 'workspace' })
  })
})

describe('a campaign’s runs', () => {
  const runs = {
    campaign_id: 'c1',
    runs: [
      {
        series_id: 's1',
        rhythm: { times: 1, per: 'week', weekday: 'tuesday' },
      },
      { series_id: 's2', rhythm: null },
    ],
  }

  it('attaches one id, never the set', async () => {
    const fetchMock = stubFetch([200, runs])
    const campaign = await attachSeries('c1', 's1')
    expect(sent(fetchMock)).toEqual({
      url: '/api/campaigns/c1/series',
      method: 'POST',
      body: { series_id: 's1' },
    })
    expect(campaign.runs).toEqual([
      { seriesId: 's1', rhythm: { times: 1, per: 'week', weekday: 'tuesday' } },
      { seriesId: 's2', rhythm: null },
    ])
  })

  it('sends a rhythm with every only past one, and null for occasional', async () => {
    const fetchMock = stubFetch([200, runs], [200, runs])
    await setSeriesRhythm('c1', 's1', { times: 2, per: 'week', every: 1 })
    await setSeriesRhythm('c1', 's2', null)
    expect(sent(fetchMock, 0)).toEqual({
      url: '/api/campaigns/c1/series/s1',
      method: 'PUT',
      body: { rhythm: { times: 2, per: 'week' } },
    })
    expect(sent(fetchMock, 1).body).toEqual({ rhythm: null })
  })
})

describe('seriesRhythm', () => {
  it('reads every and weekday, and anything it can’t read as occasional', () => {
    expect(seriesRhythm({ times: 1, per: 'week', every: 3 })).toEqual({
      times: 1,
      per: 'week',
      every: 3,
    })
    expect(seriesRhythm({ times: 0, per: 'week' })).toBeNull()
    expect(seriesRhythm({ times: 1, per: 'day' })).toBeNull()
    expect(seriesRhythm(null)).toBeNull()
  })
})
