import { useCallback } from 'react'
import type { Post } from '@/types/posts'
import { useCampaign } from '@/hooks/useCampaigns'
import { usePlatformCatalog, usePlatforms } from '@/hooks/usePlatforms'
import { resolveForPlatform } from '@/lib/publishingAccount'
import { postWarnings, type PostWarning } from '@/lib/postWarnings'

/**
 * What is wrong with each post on a posts list (`lib/postWarnings`), resolved
 * from one platform-list read rather than a hook per row — the same way the
 * calendar grids resolve accounts for their cards.
 *
 * `campaignId` null is the workspace's list, where each post answers to its
 * own campaign's targets, which the list payload carries.
 */
export function usePostWarnings(
  campaignId: string | null,
): (post: Post) => PostWarning[] {
  const targets = useCampaign(campaignId ?? '').data?.target_platforms
  const { isSuccess: platformsLoaded } = usePlatforms()
  const catalog = usePlatformCatalog()
  return useCallback(
    (post: Post) =>
      postWarnings(post, {
        targets: campaignId ? targets : post.campaign?.target_platforms,
        // Not until the list is in, and not for a platform this build does
        // not know: either would resolve against no accounts and read as
        // "nothing connected".
        account:
          platformsLoaded && post.platform_id && catalog.view(post.platform_id)
            ? resolveForPlatform(
                catalog.views,
                post.platform_id,
                post.social_account_id,
                post.social_account,
              )
            : null,
      }),
    [campaignId, targets, platformsLoaded, catalog],
  )
}
