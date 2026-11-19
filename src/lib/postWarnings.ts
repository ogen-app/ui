import type { CampaignPlatform } from '@/types/campaigns'
import type { Post } from '@/types/posts'
import { outsideCampaign } from '@/lib/campaignTarget'
import { isNotGrounded } from '@/lib/grounding'
import {
  accountGap,
  type PublishingAccountResolution,
} from '@/lib/publishingAccount'

/**
 * What the posts list says is wrong with a post, read off the list payload
 * alone — no attachment fetch, no post-type rules. The editor's Quality
 * checks (length, media, alt text) need a fetch per post, so they stay in the
 * editor; this list understates the way the calendar card does, and every
 * entry on it is something really wrong.
 *
 * - **blocking**: the post did not go out, or the server would refuse to
 *   schedule it as it stands — a failed or missed publish, no platform, or no
 *   account it can publish as (the `accountGap` the Not scheduled panel uses).
 * - **warning**: it can go out, but somewhere its campaign no longer targets
 *   (CON-483).
 * - **notice**: generation drew on nothing of the campaign's own (CON-484).
 */
export type PostWarningKind =
  | 'failed'
  | 'missed'
  | 'noPlatform'
  | 'noAccount'
  | 'chooseAccount'
  | 'accountGone'
  | 'outsidePlatform'
  | 'outsidePostType'
  | 'notGrounded'

export type PostWarningLevel = 'blocking' | 'warning' | 'notice'

export type PostWarning = { kind: PostWarningKind; level: PostWarningLevel }

const LEVEL: Record<PostWarningKind, PostWarningLevel> = {
  failed: 'blocking',
  missed: 'blocking',
  noPlatform: 'blocking',
  noAccount: 'blocking',
  chooseAccount: 'blocking',
  accountGone: 'blocking',
  outsidePlatform: 'warning',
  outsidePostType: 'warning',
  notGrounded: 'notice',
}

const RANK: Record<PostWarningLevel, number> = {
  blocking: 0,
  warning: 1,
  notice: 2,
}

export function postWarnings(
  post: Pick<
    Post,
    'status' | 'platform_id' | 'platform_post_type' | 'grounding_mode'
  >,
  {
    targets,
    account,
  }: {
    /** The campaign's targets; undefined while it is loading says nothing. */
    targets: readonly CampaignPlatform[] | undefined
    /**
     * The post's account resolution against the platform list, or `null`
     * while that list is loading or the platform is one this build doesn't
     * know — an empty list there would read as "no account connected".
     */
    account: PublishingAccountResolution | null
  },
): PostWarning[] {
  const kinds: PostWarningKind[] = []
  if (post.status === 'failed') kinds.push('failed')
  if (post.status === 'not_published') kinds.push('missed')
  // Only a post still to go can be stopped by its channel. A failed one
  // counts: it goes out again once whatever stopped it is fixed.
  if (post.status !== 'published' && post.status !== 'not_published') {
    if (!post.platform_id) kinds.push('noPlatform')
    else if (account) {
      const gap = accountGap(post.platform_id, account)
      if (gap) kinds.push(gap)
    }
  }
  const outside = outsideCampaign(post, targets)
  if (outside === 'platform') kinds.push('outsidePlatform')
  if (outside === 'postType') kinds.push('outsidePostType')
  if (isNotGrounded(post.grounding_mode)) kinds.push('notGrounded')
  return kinds.map((kind) => ({ kind, level: LEVEL[kind] }))
}

/** The most serious level among them, or `null` for a post with none. */
export function worstWarning(
  warnings: readonly PostWarning[],
): PostWarningLevel | null {
  let worst: PostWarningLevel | null = null
  for (const w of warnings)
    if (worst === null || RANK[w.level] < RANK[worst]) worst = w.level
  return worst
}
