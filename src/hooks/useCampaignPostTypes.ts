import { useMemo } from 'react'
import { useCampaign } from '@/hooks/useCampaigns'
import {
  releasedPostTypes,
  type PlatformPostType,
} from '@/lib/platformDictionary'

/**
 * The post types a campaign offers for one platform.
 *
 * Two readers have to agree on this list or the editor contradicts itself: the
 * quick-settings picker, which is what the author chooses from, and the Auto
 * resolver, which chooses on their behalf (`lib/postTypeAuto`). A type Auto
 * could pick but the picker never showed would be a format the post arrived at
 * by a route nobody can retrace.
 *
 * `releasedPostTypes` rather than the platform's whole dictionary: the campaign
 * filter is the wrong thing to lean on for the release gate, because the
 * fallback below deliberately drops it — and because a campaign row could name
 * a slug this build has not released.
 *
 * **An unloaded campaign is not an empty one.** While the query is in flight,
 * and after it has failed, this answers with the platform's full released set
 * rather than nothing: the picker disables its trigger during the load, so the
 * unfiltered list is what an *errored* campaign leaves behind, and an over-wide
 * menu beats no menu once there is nothing left to wait for.
 */
export function useCampaignPostTypes(
  campaignId: string,
  platformId: string,
): PlatformPostType[] {
  const { data: campaign } = useCampaign(campaignId)

  return useMemo(() => {
    const released = releasedPostTypes(platformId)
    if (!campaign) return released
    const enabled = new Set(
      campaign.target_platforms?.find((tp) => tp.id === platformId)
        ?.post_types ?? [],
    )
    return released.filter((pt) => enabled.has(pt.slug))
  }, [campaign, platformId])
}
