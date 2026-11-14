import type { CampaignPlatform } from '@/types/campaigns'
import type { Post, PostStatus } from '@/types/posts'

/** How a post sits outside its campaign's platforms or post types. */
export type OutsideCampaign = 'platform' | 'postType'

/**
 * Whether a post is outside what its campaign targets (CON-483): a platform
 * the campaign no longer has, or a post type it no longer takes there. A
 * removal leaves such drafts where they were, and this is what flags them —
 * in the post's Quality checks, on the calendar card and in the posts list.
 *
 * The rule is the readiness one's (`channel-dropped`, `post-type-dropped`):
 * only a post still to go out counts, an unpicked platform or type is not
 * outside anything, and an empty `post_types` is "no restriction". A
 * campaign with no platforms at all says nothing, since then everything is.
 */
export function outsideCampaign(
  post: Pick<Post, 'platform_id' | 'platform_post_type' | 'status'>,
  targets: readonly CampaignPlatform[] | undefined,
): OutsideCampaign | null {
  if (!targets || targets.length === 0) return null
  if (!stillToGo(post.status) || !post.platform_id) return null
  const target = targets.find((tp) => tp.id === post.platform_id)
  if (!target) return 'platform'
  if (
    target.post_types.length > 0 &&
    post.platform_post_type &&
    !target.post_types.includes(post.platform_post_type)
  )
    return 'postType'
  return null
}

function stillToGo(status: PostStatus): boolean {
  return status !== 'published' && status !== 'not_published'
}
