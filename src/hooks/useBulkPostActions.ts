import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { useDeletePost, useUpdatePost } from '@/hooks/usePosts'
import type { BulkPlan } from '@/lib/bulkPostEdits'
import { postToPayload } from '@/services/api/posts'
import type { Post } from '@/types/posts'

/**
 * What `BulkActionsBar` runs over a selection of a campaign's posts, on the
 * posts list and the calendar alike (CON-472).
 *
 * Both actions resolve with the number of requests that failed, so the bar
 * can report what actually happened instead of announcing success the moment
 * the requests leave. Each failure also raises its own error toast through
 * the mutation's `meta`. Only the posts that were deleted leave the selection:
 * anything refused stays ticked, still there to act on.
 */
export function useBulkPostActions(
  campaignId: string,
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>,
) {
  const { mutateAsync: deletePost, isPending: deleting } =
    useDeletePost(campaignId)
  const { mutateAsync: updatePost, isPending: applying } =
    useUpdatePost(campaignId)

  const applyPlan = useCallback(
    async (plan: BulkPlan) => {
      const results = await Promise.allSettled(
        plan.changes.map(({ post, scheduled_at }) =>
          updatePost({
            id: post.id,
            payload: { ...postToPayload(post), scheduled_at },
          }),
        ),
      )
      return results.filter((r) => r.status === 'rejected').length
    },
    [updatePost],
  )

  const deletePosts = useCallback(
    async (targets: Post[]) => {
      const results = await Promise.allSettled(
        targets.map((post) => deletePost(post.id)),
      )
      const deleted = targets.filter(
        (_, i) => results[i].status === 'fulfilled',
      )
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const post of deleted) next.delete(post.id)
        return next
      })
      return targets.length - deleted.length
    },
    [deletePost, setSelectedIds],
  )

  // A delete sweep in flight must hold the bar just like an update sweep, or
  // a second action can race the first.
  return { applyPlan, deletePosts, busy: applying || deleting, deletePost }
}
