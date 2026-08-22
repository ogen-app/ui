import type { Campaign } from '@/types/campaigns'
import type { Post } from '@/types/posts'

/**
 * Where a document is actually being used (CON-210).
 *
 * Two different relationships, and they are not the same fact. A campaign
 * *holds* a document — someone put it on that campaign's Content page, and
 * generation may read from it. A post *wrote from* it: the model retrieved
 * passages out of it, or a person named it in the post's Sources card. So a
 * document can sit in three campaigns and have been read by nothing, which is
 * exactly the state worth seeing.
 */
export type AssetUsage = {
  /** Campaigns holding it, named, in the campaigns list's own order. */
  campaigns: string[]
  /** Posts anywhere in the workspace that write from it. */
  posts: number
  /** Of those, the ones belonging to the campaign whose page this is. */
  postsHere: number
}

/** A document nothing has claimed. Shared, so cells needn't allocate one each. */
export const NO_USAGE: AssetUsage = Object.freeze({
  campaigns: [],
  posts: 0,
  postsHere: 0,
})

type CampaignFacts = Pick<Campaign, 'id' | 'name' | 'asset_ids'>
type PostFacts = Pick<Post, 'campaign_id' | 'used_asset_ids'>

/** A campaign as a row names it, blank names included. */
export function campaignLabel(campaign: Pick<Campaign, 'name'>): string {
  return campaign.name.trim() || 'Untitled campaign'
}

/**
 * Every document's usage, in one pass over the campaigns and one over the
 * posts — rather than a scan per row, which is what a table of a few hundred
 * documents against a few hundred posts would otherwise cost on every render.
 *
 * `scopeId` is the campaign whose page this is, or null in the bank; it is
 * only what splits `posts` from `postsHere`, so the same index answers both
 * screens' questions.
 */
export function assetUsageIndex(
  campaigns: readonly CampaignFacts[],
  posts: readonly PostFacts[],
  scopeId: string | null,
): Map<string, AssetUsage> {
  const index = new Map<string, AssetUsage>()
  const entry = (assetId: string): AssetUsage => {
    let usage = index.get(assetId)
    if (!usage) {
      usage = { campaigns: [], posts: 0, postsHere: 0 }
      index.set(assetId, usage)
    }
    return usage
  }

  for (const campaign of campaigns) {
    const label = campaignLabel(campaign)
    for (const assetId of campaign.asset_ids ?? []) entry(assetId).campaigns.push(label)
  }

  for (const post of posts) {
    // Through a set: naming the same document twice in one post's sources is
    // one post that read it, not two.
    for (const assetId of new Set(post.used_asset_ids ?? [])) {
      const usage = entry(assetId)
      usage.posts += 1
      if (scopeId !== null && post.campaign_id === scopeId) usage.postsHere += 1
    }
  }

  return index
}

/**
 * The campaigns holding a document, as one line.
 *
 * One campaign is named, because in the bank that name is the answer — *this
 * belongs to the Q3 launch* — and a count would make the reader open the
 * document to find out which. Two or more can't be named in a column this
 * wide, so they become a number rather than a name plus "+2" that hides which
 * ones are missing.
 */
export function campaignsLabel(usage: AssetUsage): string | null {
  if (usage.campaigns.length === 0) return null
  if (usage.campaigns.length === 1) return usage.campaigns[0]
  return `${usage.campaigns.length} campaigns`
}

/** `1 post` / `4 posts`. */
export function postsLabel(count: number): string {
  return `${count} ${count === 1 ? 'post' : 'posts'}`
}

/**
 * The campaigns holding it besides the one being looked at.
 *
 * The scope's own campaign is subtracted rather than counted, so the line
 * answers what it says: a document on this page is obviously on this page.
 */
export function elsewhereLabel(usage: AssetUsage, inScope: boolean): string | null {
  const others = usage.campaigns.length - (inScope ? 1 : 0)
  if (others <= 0) return null
  return `Also in ${others} ${others === 1 ? 'campaign' : 'campaigns'}`
}
