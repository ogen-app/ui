import {
  addCampaignAssets,
  getCampaign,
  removeCampaignAsset,
  updateCampaign,
} from '@/services/api/campaigns'
import { listAssets } from '@/services/api/content'
import { campaignKey } from '@/hooks/useCampaigns'
import { campaignToPayload } from '@/lib/campaignPayload'
import { seedsWholeBank } from '@/lib/campaignSources'
import { queryClient } from '@/lib/queryClient'
import type { Campaign } from '@/types/campaigns'
import { toast } from '@/stores/toastStore'

/**
 * Adding and removing a campaign's documents, from outside React.
 *
 * Membership is a set on the campaign, written through its own endpoints
 * (`POST`/`DELETE /api/campaigns/:id/assets`, CON-233). Each is one atomic
 * `UPDATE` of `asset_ids` that touches no other column, which is what lets this
 * module be as thin as it is: it no longer serializes writes per campaign, no
 * longer re-reads the campaign to build a set from, and no longer restates
 * twenty-odd unrelated fields to change one. Three uploads finishing at once
 * union into the same row instead of each writing the set it read.
 *
 * What remains is the one thing the endpoints can't do for us: **it must not be
 * lost**. An upload that lands after the user has walked to another page still
 * has to join the campaign it was dropped on; an asset created inside a
 * campaign but attached to nothing is the bug the whole change exists to
 * prevent. So this runs on the upload store's timeline rather than a
 * component's, and holds no React state.
 */

/**
 * Takes the campaign the server just wrote.
 *
 * `setQueryData` paints it at once and the invalidate is what makes it true:
 * with no queue serializing them, two writes to one campaign resolve in
 * whatever order the server answers and the cache would keep whichever arrived
 * last. `campaignKey` is under `["campaigns"]`, so the refetch covers the
 * campaign, the sidebar list and the summaries in one.
 */
function land(campaign: Campaign): void {
  queryClient.setQueryData(campaignKey(campaign.id), campaign)
  queryClient.invalidateQueries({ queryKey: ['campaigns'] })
}

/**
 * Pins a campaign left in the old whole-bank mode to the set it was actually
 * generating from.
 *
 * `use_assets: true, asset_ids: []` meant *every* asset in the workspace. Read
 * as a set that is an empty bank, so the campaign silently stops writing from
 * anything — and nothing on screen would differ. Every write below starts here
 * rather than only the page that shows the set, so the pin cannot be bypassed:
 * a document attached from a post, an asset deleted, and the Content page's own
 * seed all funnel through it, and going straight to the endpoint would collapse
 * "everything" to just the ids being written.
 *
 * The cache is consulted first because a campaign can only *leave* this state —
 * nothing writes `use_assets: true` over an empty set any more — so a cached
 * copy that is not in it is proof, and the ordinary attach costs no extra
 * request. A cached copy that *is* in it gets re-read, since another tab may
 * have pinned it since.
 *
 * All of this dies with a backfill of those rows; there is nothing here that a
 * migration wouldn't do better, once we know how many exist outside dev.
 */
async function pinWholeBank(campaignId: string): Promise<void> {
  const cached = queryClient.getQueryData<Campaign>(campaignKey(campaignId))
  if (cached && !seedsWholeBank(cached)) return
  const campaign = await getCampaign(campaignId)
  if (!seedsWholeBank(campaign)) return

  const bank = (await listAssets()).map((asset) => asset.id)
  if (bank.length > 0) {
    // The set is empty, so unioning the bank into it *is* pinning it — and the
    // endpoint turns `use_assets` on, which it already was.
    land(await addCampaignAssets(campaignId, bank))
    return
  }
  // An empty bank has no id to union and so no way to reach the endpoint's
  // derivation: the campaign is generating from nothing today and would silently
  // start reading the next asset anyone uploads. Writing the flag is the only
  // way to say so, and this is the one place the client still does.
  land(
    await updateCampaign(
      campaignId,
      campaignToPayload(campaign, {
        use_assets: false,
      }),
    ),
  )
}

/**
 * Adds documents to a campaign, ignoring any it already holds.
 *
 * Reports its own failure: this is called from the upload store and from
 * create-and-open, neither of which goes through the mutation cache that
 * toasts everything else. It also *resolves* that failure — `true` once the
 * campaign holds the documents, `false` when the write was refused — because
 * two callers act ahead of the write and must be able to stop or take it
 * back: the Content page navigates into the campaign's copy, and a post
 * keeps the id in its own reading list.
 */
export function addToCampaign(
  campaignId: string,
  assetIds: string[],
): Promise<boolean> {
  return attach(campaignId, assetIds).then(
    () => true,
    (error: unknown) => {
      toast.error('Unable to add to this campaign', {
        description:
          error instanceof Error
            ? error.message
            : 'The document was saved but is not attached to the campaign.',
      })
      return false
    },
  )
}

async function attach(campaignId: string, assetIds: string[]): Promise<void> {
  await pinWholeBank(campaignId)
  if (assetIds.length === 0) return
  land(await addCampaignAssets(campaignId, assetIds))
}

/**
 * Removes documents from a campaign, leaving the assets themselves alone.
 *
 * Failure is not reported: the only caller deletes the asset first, and an id
 * left pointing at a deleted asset shows nowhere and retrieves nothing. The
 * delete itself toasts if it fails, which is the part the user can act on.
 *
 * One request per id, sequentially — each is its own atomic statement, so a
 * failure part-way leaves the campaign holding the rest rather than a set
 * nobody wrote.
 */
export async function removeFromCampaign(
  campaignId: string,
  assetIds: string[],
): Promise<void> {
  try {
    await pinWholeBank(campaignId)
    for (const assetId of assetIds) {
      land(await removeCampaignAsset(campaignId, assetId))
    }
  } catch {
    // Silent, as above.
  }
}

/**
 * Pins a campaign left in the old whole-bank mode, on sight rather than on a
 * write.
 *
 * Called from the page that is about to show the campaign as a set: the writes
 * above pin as they go, but a campaign nobody has written to would keep the
 * sentinel indefinitely while showing an empty list. A campaign another tab has
 * already pinned reads back its own ids and no-ops.
 */
export function seedFromWholeBank(campaignId: string): Promise<void> {
  return pinWholeBank(campaignId).catch(() => {
    // Silent: the user did not ask for this, and the page behind the toast
    // would be showing them an empty campaign either way. The next visit
    // tries again.
  })
}
