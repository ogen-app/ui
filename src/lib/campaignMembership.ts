import { getCampaign, updateCampaign } from "@/services/api/campaigns";
import { campaignKey } from "@/hooks/useCampaigns";
import { campaignToPayload } from "@/lib/campaignPayload";
import { membershipPayload, seedsWholeBank } from "@/lib/campaignSources";
import { queryClient } from "@/lib/queryClient";
import type { Campaign } from "@/types/campaigns";
import { toast } from "@/stores/toastStore";

/**
 * Adding and removing a campaign's documents, from outside React.
 *
 * Membership is a field on the campaign until the backend can scope assets
 * properly (CON-210 phase 2), which makes every change a whole-campaign PUT —
 * and that has two consequences this module exists to handle.
 *
 * **It must not be lost.** An upload that lands after the user has walked to
 * another page still has to join the campaign it was dropped on; an asset
 * created inside a campaign but attached to nothing is the bug the whole
 * change exists to prevent. So this runs on the upload store's timeline rather
 * than a component's, and holds no React state.
 *
 * **It must not race itself.** Read-modify-write on one field, from three
 * uploads finishing at once, loses ids: each writes the set it read. Writes
 * are therefore queued per campaign, and each one re-reads the campaign
 * immediately before it writes rather than trusting the cache.
 */

/** One promise chain per campaign, so writes to it are serial. */
const queues = new Map<string, Promise<unknown>>();

function enqueue(campaignId: string, run: () => Promise<void>): Promise<void> {
  const previous = queues.get(campaignId) ?? Promise.resolve();
  // `catch` on the tail, not on `run`: a failed write must not break the chain
  // for the next one, but its own rejection still has to reach the caller.
  const next = previous.then(run, run);
  queues.set(
    campaignId,
    next.catch(() => {}),
  );
  return next;
}

async function write(
  campaignId: string,
  nextIds: (campaign: Campaign) => string[],
): Promise<void> {
  const campaign = await getCampaign(campaignId);
  const ids = nextIds(campaign);
  if (
    ids.length === campaign.asset_ids.length &&
    ids.every((id, i) => id === campaign.asset_ids[i])
  ) {
    return;
  }
  await updateCampaign(
    campaignId,
    campaignToPayload(campaign, membershipPayload(ids)),
  );
  queryClient.invalidateQueries({ queryKey: campaignKey(campaignId) });
  queryClient.invalidateQueries({ queryKey: ["campaigns"] });
}

/**
 * Adds documents to a campaign, ignoring any it already holds.
 *
 * Reports its own failure: this is called from the upload store and from
 * create-and-open, neither of which goes through the mutation cache that
 * toasts everything else.
 */
export function addToCampaign(
  campaignId: string,
  assetIds: string[],
): Promise<void> {
  return enqueue(campaignId, () =>
    write(campaignId, (campaign) => {
      const held = new Set(campaign.asset_ids);
      return [...campaign.asset_ids, ...assetIds.filter((id) => !held.has(id))];
    }),
  ).catch((error: unknown) => {
    toast.error("Unable to add to this campaign", {
      description:
        error instanceof Error
          ? error.message
          : "The document was saved but is not attached to the campaign.",
    });
  });
}

/**
 * Removes documents from a campaign, leaving the assets themselves alone.
 *
 * Failure is not reported: the only caller deletes the asset first, and an id
 * left pointing at a deleted asset shows nowhere and retrieves nothing. The
 * delete itself toasts if it fails, which is the part the user can act on.
 */
export function removeFromCampaign(
  campaignId: string,
  assetIds: string[],
): Promise<void> {
  const dropped = new Set(assetIds);
  return enqueue(campaignId, () =>
    write(campaignId, (campaign) =>
      campaign.asset_ids.filter((id) => !dropped.has(id)),
    ),
  ).catch(() => {});
}

/**
 * Pins a campaign left in the old whole-bank mode to the set it was actually
 * generating from.
 *
 * `use_assets: true, asset_ids: []` meant *every* asset in the workspace. Read
 * as a set that is an empty bank, so the campaign silently stops writing from
 * anything — and nothing on screen would differ. Called once, from the page
 * that is about to show the campaign as a set.
 */
export function seedFromWholeBank(
  campaignId: string,
  bankIds: string[],
): Promise<void> {
  return enqueue(campaignId, () =>
    // Re-checked against the campaign as it is now, not as the page saw it:
    // by the time this runs, another tab may already have pinned it.
    write(campaignId, (campaign) =>
      seedsWholeBank(campaign) ? bankIds : campaign.asset_ids,
    ),
  ).catch(() => {
    // Silent: the user did not ask for this, and the page behind the toast
    // would be showing them an empty campaign either way. The next visit
    // tries again.
  });
}
