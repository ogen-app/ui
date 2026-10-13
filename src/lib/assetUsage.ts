import type { Campaign } from '@/types/campaigns'

/**
 * The campaigns holding each document — the Assets list's Campaign column
 * (CON-210, CON-370).
 *
 * Only *holding*: a campaign put the document on its Content page, and
 * generation may read from it. Which posts wrote from a document is a
 * different fact, and it belongs on the asset's own page rather than in a
 * list column that used to mean both.
 */
export type CampaignRef = { id: string; name: string }

type CampaignFacts = Pick<Campaign, 'id' | 'name' | 'asset_ids'>

/** A campaign as a row names it, blank names included. */
export function campaignLabel(campaign: Pick<Campaign, 'name'>): string {
  return campaign.name.trim() || 'Untitled campaign'
}

/**
 * Every document's campaigns, in one pass over the campaigns — rather than a
 * scan per row — in the campaigns list's own order.
 */
export function assetCampaignIndex(
  campaigns: readonly CampaignFacts[],
): Map<string, CampaignRef[]> {
  const index = new Map<string, CampaignRef[]>()
  for (const campaign of campaigns) {
    const ref = { id: campaign.id, name: campaignLabel(campaign) }
    for (const assetId of campaign.asset_ids ?? []) {
      const list = index.get(assetId)
      if (list) list.push(ref)
      else index.set(assetId, [ref])
    }
  }
  return index
}
