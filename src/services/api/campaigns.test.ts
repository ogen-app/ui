import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addCampaignAssets,
  archiveCampaign,
  listCampaigns,
  listCampaignSummaries,
  removeCampaignAsset,
  unarchiveCampaign,
} from './campaigns'
import type { CampaignSummariesResponse } from '@/types/posts'

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

function summary(campaignId: string, postIds: string[]) {
  return {
    campaign_id: campaignId,
    posts: postIds.map((id) => ({
      id,
      campaign_id: campaignId,
      status: 'draft' as const,
      scheduled_at: null,
      published_at: null,
      platform_id: 'p1',
      platform_post_type: 'text-post',
      campaign_type_phase_id: null,
      media_urls: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * The lifecycle half of the contract (CON-156). These assert the wire, not the
 * happy path of a helper: the archived list is a *query parameter* on the same
 * endpoint and the toggles are POSTs to their own paths, and getting either
 * wrong shows up as an empty list or a silent no-op rather than an error.
 */
describe('the campaign lifecycle', () => {
  it('asks for the active set by default and the archived one on request', async () => {
    const fetchMock = stubFetch(jsonResponse(200, []))
    await listCampaigns()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns')

    stubFetch(jsonResponse(200, []))
    await listCampaigns(true)
    expect(
      (vi.mocked(fetch).mock.calls[0][0] as string).endsWith(
        '/api/campaigns?archived=true',
      ),
    ).toBe(true)
  })

  it('archives and unarchives by POST, and expects no body back', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }))

    await expect(archiveCampaign('c1')).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/archive')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' })

    await expect(unarchiveCampaign('c1')).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[1][0]).toBe('/api/campaigns/c1/unarchive')
  })

  it("throws the backend's message when the campaign is gone", async () => {
    stubFetch(jsonResponse(404, { error: 'campaign not found' }))
    await expect(archiveCampaign('nope')).rejects.toThrow('campaign not found')
  })
})

/**
 * The membership half (CON-233). These assert the wire because the whole point
 * of the endpoints is *what they don't send*: a body carrying only the ids
 * being attached, and nothing that could restate the rest of the campaign.
 */
describe('campaign membership', () => {
  it('attaches by POST, sending only the ids', async () => {
    const fetchMock = stubFetch(jsonResponse(200, { id: 'c1' }))

    await addCampaignAssets('c1', ['a1', 'a2'])

    expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/assets')
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      asset_ids: ['a1', 'a2'],
    })
  })

  it('detaches one id per request, by path', async () => {
    const fetchMock = stubFetch(jsonResponse(200, { id: 'c1' }))

    await removeCampaignAsset('c1', 'a1')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/assets/a1')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' })
  })

  it('returns the updated campaign, which is what re-seeds the cache', async () => {
    stubFetch(jsonResponse(200, { id: 'c1', asset_ids: ['a1'] }))

    await expect(addCampaignAssets('c1', ['a1'])).resolves.toMatchObject({
      asset_ids: ['a1'],
    })
  })

  it("throws the backend's message when the campaign is gone", async () => {
    stubFetch(jsonResponse(404, { error: 'campaign not found' }))

    await expect(addCampaignAssets('nope', ['a1'])).rejects.toThrow(
      'campaign not found',
    )
  })
})

describe('listCampaignSummaries', () => {
  it('fetches the batched endpoint once and keys posts by campaign', async () => {
    const body: CampaignSummariesResponse = {
      summaries: [summary('c1', ['po1', 'po2']), summary('c2', ['po3'])],
      generated_at: '2026-08-01T10:00:00Z',
    }
    const fetchMock = stubFetch(jsonResponse(200, body))

    const byCampaign = await listCampaignSummaries()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/summaries')
    expect(Object.keys(byCampaign)).toEqual(['c1', 'c2'])
    expect(byCampaign.c1.map((p) => p.id)).toEqual(['po1', 'po2'])
    expect(byCampaign.c2).toHaveLength(1)
  })

  it('leaves a campaign with no posts absent, not empty-keyed', async () => {
    // The server omits post-less campaigns entirely; the card supplies the
    // `?? []`. Inventing keys here would hide that contract.
    stubFetch(
      jsonResponse(200, { summaries: [summary('c1', [])], generated_at: '' }),
    )

    const byCampaign = await listCampaignSummaries()

    expect(byCampaign.c1).toEqual([])
    expect('c2' in byCampaign).toBe(false)
  })

  it('survives a response with no summaries at all', async () => {
    // A brand-new workspace: the field can come back absent or null rather
    // than as an empty array, and the list must still render.
    stubFetch(jsonResponse(200, { generated_at: '2026-08-01T10:00:00Z' }))

    await expect(listCampaignSummaries()).resolves.toEqual({})
  })

  it("throws the backend's message on failure", async () => {
    stubFetch(
      jsonResponse(503, { error: 'campaign summaries are not available' }),
    )

    await expect(listCampaignSummaries()).rejects.toThrow(
      'campaign summaries are not available',
    )
  })
})
