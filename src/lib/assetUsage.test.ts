import { describe, expect, it } from 'vitest'
import { assetCampaignIndex, campaignLabel } from './assetUsage'

const campaign = (id: string, name: string, asset_ids: string[]) => ({
  id,
  name,
  asset_ids,
})

describe('assetCampaignIndex', () => {
  it('names every campaign holding a document, in the list’s order', () => {
    const index = assetCampaignIndex([
      campaign('c1', 'Q3 launch', ['a1']),
      campaign('c2', 'Always on', ['a1', 'a2']),
    ])
    expect(index.get('a1')).toEqual([
      { id: 'c1', name: 'Q3 launch' },
      { id: 'c2', name: 'Always on' },
    ])
    expect(index.get('a2')).toEqual([{ id: 'c2', name: 'Always on' }])
  })

  it('has no entry for a document no campaign holds', () => {
    expect(assetCampaignIndex([campaign('c1', 'Q3', [])]).has('a1')).toBe(false)
  })

  it('names an untitled campaign', () => {
    expect(campaignLabel({ name: '  ' })).toBe('Untitled campaign')
  })
})
