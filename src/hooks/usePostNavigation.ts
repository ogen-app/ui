import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useHotkeys } from '@/hooks/useHotkeys'
import { useCampaignPosts } from '@/hooks/usePosts'
import { postNeighbours, type PostNeighbours } from '@/lib/postOrder'
import type { Post } from '@/types/posts'

/**
 * The posts either side of this one, in the campaign's timeline order.
 *
 * Reads the campaign's post list — the same query the calendar and the list
 * view use, so opening a post from either of them finds it already cached and
 * the keys work on the first press.
 */
export function usePostNeighbours(
  campaignId: string,
  postId: string,
): PostNeighbours {
  const { data } = useCampaignPosts(campaignId)
  return useMemo(() => postNeighbours(data ?? [], postId), [data, postId])
}

/**
 * ← and → step through the campaign's posts from inside the editor: left goes
 * back in time, right goes forward, matching the way the calendar reads.
 *
 * At either end the key is left unbound rather than wrapping around. Wrapping
 * would take one keypress from the last post of a campaign to the first, with
 * nothing on screen having suggested that was about to happen.
 *
 * The editor is mostly text fields, and `lib/hotkeys` keeps out of all of
 * them — inside the title, the body or the settings form, the arrows still
 * move the caret.
 */
export function usePostArrowNavigation(
  campaignId: string,
  postId: string,
): void {
  const navigate = useNavigate()
  const { previous, next } = usePostNeighbours(campaignId, postId)

  const go = (post: Post) =>
    navigate({
      to: '/campaigns/$campaignId/posts/$postId',
      params: { campaignId, postId: post.id },
    })

  useHotkeys({
    ArrowLeft: previous ? () => go(previous) : undefined,
    ArrowRight: next ? () => go(next) : undefined,
  })
}
