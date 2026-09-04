import { beforeEach, describe, expect, it, vi } from 'vitest'
import { campaignKey } from '@/hooks/useCampaigns'
import { queryClient } from '@/lib/queryClient'
import type { Campaign } from '@/types/campaigns'
import {
  addToCampaign,
  removeFromCampaign,
  seedFromWholeBank,
} from './campaignMembership'

const getCampaign = vi.fn()
const addCampaignAssets = vi.fn()
const removeCampaignAsset = vi.fn()
const updateCampaign = vi.fn()
const listAssets = vi.fn()

vi.mock('@/services/api/campaigns', () => ({
  getCampaign: (...a: unknown[]) => getCampaign(...a),
  addCampaignAssets: (...a: unknown[]) => addCampaignAssets(...a),
  removeCampaignAsset: (...a: unknown[]) => removeCampaignAsset(...a),
  updateCampaign: (...a: unknown[]) => updateCampaign(...a),
}))

vi.mock('@/services/api/content', () => ({
  listAssets: (...a: unknown[]) => listAssets(...a),
}))

const campaign = (over: Partial<Campaign> = {}): Campaign =>
  ({
    id: 'c1',
    name: 'Launch',
    use_assets: false,
    asset_ids: [],
    publishing_days: ['mon'],
    ...over,
  }) as Campaign

/** The campaign as the screen has it — what `pinWholeBank` reads first. */
function cache(over: Partial<Campaign> = {}) {
  queryClient.setQueryData(campaignKey('c1'), campaign(over))
}

beforeEach(() => {
  vi.clearAllMocks()
  queryClient.clear()
  addCampaignAssets.mockImplementation((id: string, ids: string[]) =>
    Promise.resolve(campaign({ id, use_assets: true, asset_ids: ids })),
  )
  removeCampaignAsset.mockResolvedValue(campaign())
  updateCampaign.mockResolvedValue(campaign())
  listAssets.mockResolvedValue([])
})

describe('addToCampaign', () => {
  it('goes straight to the endpoint for a campaign the cache has already seen', async () => {
    // The whole point of the membership endpoint: one request, carrying the
    // ids and nothing else. No read to build a set from, and no whole-campaign
    // payload restating twenty fields it does not mean to change.
    cache({ use_assets: true, asset_ids: ['a1'] })

    await expect(addToCampaign('c1', ['a2'])).resolves.toBe(true)

    expect(getCampaign).not.toHaveBeenCalled()
    expect(updateCampaign).not.toHaveBeenCalled()
    expect(addCampaignAssets).toHaveBeenCalledExactlyOnceWith('c1', ['a2'])
  })

  it('reads the campaign when nothing is cached to rule the legacy state out', async () => {
    getCampaign.mockResolvedValue(campaign())

    await addToCampaign('c1', ['a1'])

    expect(getCampaign).toHaveBeenCalledWith('c1')
    expect(listAssets).not.toHaveBeenCalled()
    expect(addCampaignAssets).toHaveBeenCalledExactlyOnceWith('c1', ['a1'])
  })

  it('pins a whole-bank campaign to the bank before it adds anything', async () => {
    // `use_assets: true` over an empty list means *every* asset in the
    // workspace. Attaching straight into that would collapse the campaign from
    // everything to the one document just picked — a silent loss of every
    // source it has been generating from.
    cache({ use_assets: true, asset_ids: [] })
    getCampaign.mockResolvedValue(campaign({ use_assets: true, asset_ids: [] }))
    listAssets.mockResolvedValue([{ id: 'bank1' }, { id: 'bank2' }])

    await addToCampaign('c1', ['a1'])

    expect(addCampaignAssets.mock.calls).toEqual([
      ['c1', ['bank1', 'bank2']],
      ['c1', ['a1']],
    ])
  })

  it('re-reads a cached whole-bank campaign, in case another tab pinned it', async () => {
    cache({ use_assets: true, asset_ids: [] })
    getCampaign.mockResolvedValue(
      campaign({ use_assets: true, asset_ids: ['a1'] }),
    )

    await addToCampaign('c1', ['a2'])

    expect(listAssets).not.toHaveBeenCalled()
    expect(addCampaignAssets).toHaveBeenCalledExactlyOnceWith('c1', ['a2'])
  })

  it('clears the flag by hand when a whole-bank campaign has no bank to pin', async () => {
    // Nothing to union, so the endpoint's derivation is out of reach: the
    // sentinel would survive and the campaign would silently start reading the
    // next asset anyone uploads.
    getCampaign.mockResolvedValue(campaign({ use_assets: true, asset_ids: [] }))
    listAssets.mockResolvedValue([])

    await addToCampaign('c1', ['a1'])

    const payload = updateCampaign.mock.calls[0][1]
    expect(payload.use_assets).toBe(false)
    // Still absent, even here: only the flag is being written, and restating
    // the set is what the presence-aware PUT exists to avoid.
    expect('asset_ids' in payload).toBe(false)
    expect(payload.publishing_days).toEqual(['mon'])
  })

  it('answers false and says so when the campaign refuses the write', async () => {
    // The callers act ahead of this — the Content page navigates into the
    // campaign's copy, a post keeps the id in its reading list — so a refusal
    // has to come back as a value, not just a toast.
    cache()
    addCampaignAssets.mockRejectedValue(new Error('nope'))

    await expect(addToCampaign('c1', ['a1'])).resolves.toBe(false)
  })
})

describe('removeFromCampaign', () => {
  it('sends one request per id, naming each in the path', async () => {
    cache({ use_assets: true, asset_ids: ['a1', 'a2'] })

    await removeFromCampaign('c1', ['a1', 'a2'])

    expect(removeCampaignAsset.mock.calls).toEqual([
      ['c1', 'a1'],
      ['c1', 'a2'],
    ])
  })

  it('pins a whole-bank campaign first, so a delete does not empty it', async () => {
    // Removing an id from the sentinel's empty list would re-derive
    // `use_assets` to false and turn a campaign that was reading everything
    // into one reading nothing.
    cache({ use_assets: true, asset_ids: [] })
    getCampaign.mockResolvedValue(campaign({ use_assets: true, asset_ids: [] }))
    listAssets.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }])

    await removeFromCampaign('c1', ['a1'])

    expect(addCampaignAssets).toHaveBeenCalledExactlyOnceWith('c1', [
      'a1',
      'a2',
    ])
    expect(removeCampaignAsset).toHaveBeenCalledExactlyOnceWith('c1', 'a1')
  })

  it('swallows a failure, because the caller has already deleted the asset', async () => {
    cache()
    removeCampaignAsset.mockRejectedValue(new Error('gone'))

    await expect(removeFromCampaign('c1', ['a1'])).resolves.toBeUndefined()
  })
})

describe('seedFromWholeBank', () => {
  it('does nothing at all to a campaign that owns its own set', async () => {
    cache({ use_assets: true, asset_ids: ['a1'] })

    await seedFromWholeBank('c1')

    expect(getCampaign).not.toHaveBeenCalled()
    expect(addCampaignAssets).not.toHaveBeenCalled()
    expect(updateCampaign).not.toHaveBeenCalled()
  })

  it('is silent when the pin fails — the user did not ask for it', async () => {
    getCampaign.mockRejectedValue(new Error('offline'))

    await expect(seedFromWholeBank('c1')).resolves.toBeUndefined()
  })
})
