import { afterEach, describe, expect, it, vi } from 'vitest'
import { listCampaignSummaries } from './campaigns'
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
