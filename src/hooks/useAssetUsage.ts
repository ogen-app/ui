import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCampaigns } from '@/hooks/useCampaigns'
import { assetUsageIndex, type AssetUsage } from '@/lib/assetUsage'
import { WORKSPACE_POSTS_KEY } from '@/lib/queryKeys'
import { listPosts } from '@/services/api/posts'

/**
 * What every document in the workspace is being used by.
 *
 * The campaigns come free — the sidebar mounts `useCampaigns()` on every
 * authenticated screen, and each campaign carries its own `asset_ids`, so the
 * holding side of the answer is already in cache.
 *
 * The posts do not. Which posts wrote from a document lives on the post
 * (`used_asset_ids`), the batched Campaigns-list projection deliberately omits
 * it, and there is no count endpoint — so this reads the workspace's whole
 * post list, once, and counts client-side. That list is hydrated, `used_assets`
 * and all, which is the honest cost of the column: fine at today's scale,
 * worth a slim projection or a server-side count before it is thousands.
 *
 * `ready` exists so a cell can stay blank rather than claim "—" while the
 * count is still in flight — "used by nothing" is a real answer about a
 * document, and it must not be shown before it is known.
 */
export function useAssetUsage(campaignId: string | null): {
  usage: Map<string, AssetUsage>
  ready: boolean
} {
  const campaigns = useCampaigns()
  const posts = useQuery({ queryKey: WORKSPACE_POSTS_KEY, queryFn: listPosts })

  const usage = useMemo(
    () => assetUsageIndex(campaigns.data ?? [], posts.data ?? [], campaignId),
    [campaigns.data, posts.data, campaignId],
  )

  return { usage, ready: !!campaigns.data && !!posts.data }
}
