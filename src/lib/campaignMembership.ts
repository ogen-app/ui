import {
  addCampaignAssets,
  getCampaign,
  removeCampaignAsset,
} from '@/services/api/campaigns'
import { listAssets } from '@/services/api/content'
import { campaignKey } from '@/hooks/useCampaigns'
import { seedsWholeBank } from '@/lib/campaignSources'
import { queryClient } from '@/lib/queryClient'
import type { Campaign } from '@/types/campaigns'
import { toast } from '@/stores/toastStore'

/**
 * Adding and removing a campaign's documents, from outside React.
 *
 * Membership has had its own endpoints since CON-233 — `POST` and `DELETE`
 * `/api/campaigns/:id/assets` — so one document joining or leaving is one
 * atomic write to one column. That deleted most of this module: the
 * per-campaign write queue, the re-read immediately before writing, and the
 * 23-field payload restatement all existed for a single reason, which was that
 * three uploads finishing at once would each store the set it had read. The
 * server serialises them now, across tabs and users, which is further than a
 * queue in one tab could ever reach.
 *
 * What survives is the reason this isn't a hook: an upload that lands after the
 * user has walked to another page still has to join the campaign it was dropped
 * on, so this runs on the upload store's timeline and holds no React state.
 */

/**
 * The ids a legacy whole-bank campaign has to be pinned to, or null when the
 * campaign is an ordinary set.
 *
 * `use_assets: true` over an empty `asset_ids` is the pre-CON-210 state meaning
 * *every* asset in the workspace. The membership endpoints only union and
 * subtract, so a plain attach to a campaign sitting in it would take the
 * campaign from "everything" to "just this one" — the pin has to ride along
 * with the write rather than being a separate step something could skip.
 * Because the stored set is empty by definition, unioning the bank *is*
 * pinning it, so it still costs one atomic call.
 *
 * The campaign comes from the cache when it is there. A stale copy can only be
 * stale one way — a pinned campaign never returns to the sentinel — so the
 * worst case is pinning a campaign another tab already pinned, to the same ids.
 */
async function wholeBankIds(campaignId: string): Promise<string[] | null> {
  const cached = queryClient.getQueryData<Campaign>(campaignKey(campaignId))
  const campaign = cached ?? (await getCampaign(campaignId))
  if (!seedsWholeBank(campaign)) return null
  return (await listAssets()).map((asset) => asset.id)
}

function settle(campaignId: string): void {
  queryClient.invalidateQueries({ queryKey: campaignKey(campaignId) })
  queryClient.invalidateQueries({ queryKey: ['campaigns'] })
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
export async function addToCampaign(
  campaignId: string,
  assetIds: string[],
): Promise<boolean> {
  // An empty attach is a round trip that can only fail: the server answers it
  // with a plain read of the campaign, having nothing to union.
  if (assetIds.length === 0) return true
  try {
    const bank = await wholeBankIds(campaignId)
    await addCampaignAssets(
      campaignId,
      bank ? [...bank, ...assetIds] : assetIds,
    )
    settle(campaignId)
    return true
  } catch (error: unknown) {
    toast.error('Unable to add to this campaign', {
      description:
        error instanceof Error
          ? error.message
          : 'The document was saved but is not attached to the campaign.',
    })
    return false
  }
}

/**
 * Removes documents from a campaign, leaving the assets themselves alone.
 *
 * The detaches fan out rather than queueing: each one names its own id, the
 * server applies it to whatever the row holds at that moment, and removing an
 * id that isn't there is not an error — so nothing here has to know what the
 * other calls did.
 *
 * Failure is not reported: the only caller deletes the asset first, and an id
 * left pointing at a deleted asset shows nowhere and retrieves nothing. The
 * delete itself toasts if it fails, which is the part the user can act on.
 */
export async function removeFromCampaign(
  campaignId: string,
  assetIds: string[],
): Promise<void> {
  if (assetIds.length === 0) return
  try {
    const bank = await wholeBankIds(campaignId)
    if (bank) {
      // Legacy whole-bank: there is no stored set to subtract from, so the
      // detach is written as the pin that leaves these documents out. The
      // caller has already deleted them, so the bank read usually excludes
      // them anyway — filtering makes it true either way.
      const dropped = new Set(assetIds)
      const kept = bank.filter((id) => !dropped.has(id))
      if (kept.length > 0) {
        await addCampaignAssets(campaignId, kept)
      } else {
        // Nothing left to pin to, but the detach still has to land: it is what
        // re-derives `use_assets`, which the server turns off when the set it
        // leaves behind is empty. Skipping it would leave the campaign holding
        // the sentinel — claiming a bank that is empty today and won't be as
        // soon as anyone uploads anything.
        await removeCampaignAsset(campaignId, assetIds[0])
      }
      settle(campaignId)
      return
    }
    await Promise.all(assetIds.map((id) => removeCampaignAsset(campaignId, id)))
    settle(campaignId)
  } catch {
    // See the doc comment: the delete the caller already ran owns the toast.
  }
}

/**
 * Pins a campaign left in the old whole-bank mode to the set it was actually
 * generating from.
 *
 * `use_assets: true, asset_ids: []` meant *every* asset in the workspace. Read
 * as a set that is an empty bank, so the campaign silently stops writing from
 * anything — and nothing on screen would differ. Called from the page that is
 * about to show the campaign as a set. A campaign another tab already pinned
 * reads back as an ordinary set and no-ops.
 */
export async function seedFromWholeBank(campaignId: string): Promise<void> {
  try {
    const bank = await wholeBankIds(campaignId)
    // An empty bank has nothing to pin to, and needs none: with no assets in
    // the workspace, "everything" and "nothing" are the same campaign. The
    // page pins it on the next visit, by which time there is something to
    // claim — which is exactly when the distinction starts to matter.
    if (!bank || bank.length === 0) return
    await addCampaignAssets(campaignId, bank)
    settle(campaignId)
  } catch {
    // Silent: the user did not ask for this, and the page behind the toast
    // would be showing them an empty campaign either way. The next visit
    // tries again.
  }
}
