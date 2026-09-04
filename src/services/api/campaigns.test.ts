import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addCampaignAssets,
  listCampaignSummaries,
  removeCampaignAsset,
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

/**
 * CON-233's campaign half: path, method and body of each membership endpoint.
 *
 * Worth pinning because the point of these is what they *don't* send. A
 * regression that restated the campaign — the twenty-odd-field payload they
 * replaced — would still attach the document, and nothing would look wrong
 * until a publishing day or a post goal it reset was noticed somewhere else.
 */
describe('campaign membership', () => {
  it('posts only the ids, to the campaign-scoped membership path', async () => {
    const fetchMock = stubFetch(jsonResponse(200, { id: 'c1' }))

    await addCampaignAssets('c1', ['a1', 'a2'])

    expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/assets')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      asset_ids: ['a1', 'a2'],
    })
  })

  it('takes the flag from the server rather than sending one', async () => {
    // `use_assets` is derived from the set inside the same UPDATE, so a
    // campaign that was brief-only is generating from the document by the time
    // this resolves — without the client ever naming the field.
    stubFetch(
      jsonResponse(200, { id: 'c1', use_assets: true, asset_ids: ['a1'] }),
    )

    const campaign = await addCampaignAssets('c1', ['a1'])

    expect(campaign.use_assets).toBe(true)
    expect(campaign.asset_ids).toEqual(['a1'])
  })

  it('names the asset in the path on removal, with no body at all', async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, { id: 'c1', use_assets: false, asset_ids: [] }),
    )

    const campaign = await removeCampaignAsset('c1', 'a1')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/assets/a1')
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
    // Detaching the last document turns the flag off server-side. Left on over
    // an empty list it would mean *every* asset in the workspace.
    expect(campaign.use_assets).toBe(false)
  })
})
