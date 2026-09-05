import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addToCampaign,
  removeFromCampaign,
  seedFromWholeBank,
} from './campaignMembership'
import { campaignKey } from '@/hooks/useCampaigns'
import { queryClient } from '@/lib/queryClient'
import type { Campaign } from '@/types/campaigns'
import type { Asset } from '@/types/content'

vi.mock('@/services/api/campaigns', () => ({
  addCampaignAssets: vi.fn().mockResolvedValue({}),
  removeCampaignAsset: vi.fn().mockResolvedValue({}),
  getCampaign: vi.fn(),
}))
vi.mock('@/services/api/content', () => ({ listAssets: vi.fn() }))

const { addCampaignAssets, getCampaign, removeCampaignAsset } =
  await import('@/services/api/campaigns')
const { listAssets } = await import('@/services/api/content')

/** Only the three fields any of this reads. */
function campaign(useAssets: boolean, assetIds: string[]): Campaign {
  return {
    id: 'c1',
    use_assets: useAssets,
    asset_ids: assetIds,
  } as unknown as Campaign
}

function bank(...ids: string[]): Asset[] {
  return ids.map((id) => ({ id })) as unknown as Asset[]
}

beforeEach(() => {
  vi.mocked(getCampaign).mockResolvedValue(campaign(true, ['x']))
  vi.mocked(listAssets).mockResolvedValue(bank())
})

afterEach(() => {
  queryClient.clear()
  vi.clearAllMocks()
})

describe('attaching documents', () => {
  it('is one atomic union, with no read first', async () => {
    await expect(addToCampaign('c1', ['a1', 'a2'])).resolves.toBe(true)

    expect(addCampaignAssets).toHaveBeenCalledWith('c1', ['a1', 'a2'])
    // The point of CON-233: no read-modify-write, so nothing here restates a
    // set it read a moment ago and no queue is needed to stop two of these
    // losing each other.
    expect(listAssets).not.toHaveBeenCalled()
  })

  it('sends nothing at all for an empty list', async () => {
    // The server answers an empty attach with a plain read, so this is a round
    // trip that can only fail.
    await expect(addToCampaign('c1', [])).resolves.toBe(true)

    expect(addCampaignAssets).not.toHaveBeenCalled()
    expect(getCampaign).not.toHaveBeenCalled()
  })

  it('reads the campaign from the cache rather than the API', async () => {
    queryClient.setQueryData(campaignKey('c1'), campaign(false, ['held']))

    await addToCampaign('c1', ['a1'])

    expect(getCampaign).not.toHaveBeenCalled()
    expect(addCampaignAssets).toHaveBeenCalledWith('c1', ['a1'])
  })

  it('reports a refusal instead of throwing it', async () => {
    // Two callers act ahead of this write — the Content page navigates into
    // the campaign's copy — so a refusal has to come back as an answer.
    vi.mocked(getCampaign).mockResolvedValue(campaign(false, []))
    vi.mocked(addCampaignAssets).mockRejectedValueOnce(new Error('nope'))

    await expect(addToCampaign('c1', ['a1'])).resolves.toBe(false)
  })
})

describe('a campaign left in the old whole-bank mode', () => {
  // `use_assets: true` over an empty set means every asset in the workspace.
  // Attaching to one without pinning it first would take the campaign from
  // everything to just the new document — silently, and with nothing on screen
  // to show it happened.
  beforeEach(() => {
    vi.mocked(getCampaign).mockResolvedValue(campaign(true, []))
    vi.mocked(listAssets).mockResolvedValue(bank('old1', 'old2'))
  })

  it('carries the bank along with the new document, in one call', async () => {
    await addToCampaign('c1', ['new1'])

    expect(addCampaignAssets).toHaveBeenCalledTimes(1)
    expect(addCampaignAssets).toHaveBeenCalledWith('c1', [
      'old1',
      'old2',
      'new1',
    ])
  })

  it('writes a detach as the pin that leaves the document out', async () => {
    await removeFromCampaign('c1', ['old1'])

    // There is no stored set to subtract from, so subtracting would be a no-op
    // against `[]` and the campaign would keep claiming everything.
    expect(addCampaignAssets).toHaveBeenCalledWith('c1', ['old2'])
    expect(removeCampaignAsset).not.toHaveBeenCalled()
  })

  it('still detaches when nothing is left to pin to', async () => {
    vi.mocked(listAssets).mockResolvedValue(bank('old1'))

    await removeFromCampaign('c1', ['old1'])

    // The detach is what re-derives `use_assets` to false. Skipping it would
    // leave the sentinel in place over a bank that is empty today and won't be
    // as soon as anyone uploads anything.
    expect(removeCampaignAsset).toHaveBeenCalledWith('c1', 'old1')
    expect(addCampaignAssets).not.toHaveBeenCalled()
  })

  it('pins on sight of the page', async () => {
    await seedFromWholeBank('c1')

    expect(addCampaignAssets).toHaveBeenCalledWith('c1', ['old1', 'old2'])
  })

  it('leaves an empty bank alone', async () => {
    vi.mocked(listAssets).mockResolvedValue(bank())

    await seedFromWholeBank('c1')

    // With nothing in the workspace, "everything" and "nothing" are the same
    // campaign; the page pins it on the next visit, when there is something to
    // claim.
    expect(addCampaignAssets).not.toHaveBeenCalled()
  })
})

describe('detaching documents', () => {
  beforeEach(() => {
    vi.mocked(getCampaign).mockResolvedValue(campaign(true, ['a1', 'a2', 'a3']))
  })

  it('sends one request per document', async () => {
    await removeFromCampaign('c1', ['a1', 'a2'])

    expect(removeCampaignAsset).toHaveBeenCalledTimes(2)
    expect(removeCampaignAsset).toHaveBeenCalledWith('c1', 'a1')
    expect(removeCampaignAsset).toHaveBeenCalledWith('c1', 'a2')
  })

  it('swallows a failure, because the delete beside it owns the toast', async () => {
    vi.mocked(removeCampaignAsset).mockRejectedValueOnce(new Error('nope'))

    await expect(removeFromCampaign('c1', ['a1'])).resolves.toBeUndefined()
  })

  it('sends nothing at all for an empty list', async () => {
    await removeFromCampaign('c1', [])

    expect(removeCampaignAsset).not.toHaveBeenCalled()
    expect(getCampaign).not.toHaveBeenCalled()
  })
})

describe('an ordinary campaign', () => {
  it('is never pinned', async () => {
    vi.mocked(getCampaign).mockResolvedValue(campaign(true, ['a1']))

    await seedFromWholeBank('c1')

    expect(listAssets).not.toHaveBeenCalled()
    expect(addCampaignAssets).not.toHaveBeenCalled()
  })
})
