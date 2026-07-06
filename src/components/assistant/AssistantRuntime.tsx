import { useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { postKey } from '@/hooks/usePost'
import { campaignPostsKey } from '@/hooks/usePosts'
import { postVersionsKey } from '@/hooks/usePostVersions'
import { threadKey } from '@/assistant/agents'
import type { Post } from '@/types/posts'
import { useAssistantStore, type AssistantCompletionHandler } from '@/stores/assistantStore'

/**
 * Bridges the React/query-free assistant store to TanStack Query. Mount once
 * inside the authenticated layout so it lives for the whole session — assistant
 * turns keep streaming in the store even when no panel/editor is mounted, and
 * this is the single place that applies a completed turn's side effects.
 *
 * For content-changing actions (`edited`, `restored`) the backend has already
 * persisted the new content, so we invalidate the post query (refetch into
 * cache) and only THEN bump the thread's `contentRevision`. The post route
 * watches that revision to remount its editor; ordering the refetch first
 * guarantees the editor re-reads fresh content rather than the stale pre-edit
 * version.
 */
export function AssistantRuntime() {
  const qc = useQueryClient()

  useEffect(() => {
    const { setCompletionHandler, markContentApplied } = useAssistantStore.getState()

    const handler: AssistantCompletionHandler = (ref, result) => {
      if (ref.kind !== 'post' || !ref.targetId) return
      const postId = ref.targetId

      if (result.saveVersion || result.action === 'restored') {
        qc.invalidateQueries({ queryKey: postVersionsKey(postId) })
      }

      switch (result.action) {
        case 'edited':
        case 'restored':
          qc.invalidateQueries({ queryKey: postKey(postId) }).finally(() => {
            markContentApplied(threadKey(ref))
          })
          break
        case 'scheduled':
          // Content is untouched (no editor remount); status/scheduled_at
          // changed on the post and in any campaign list showing it.
          qc.invalidateQueries({ queryKey: postKey(postId) })
          invalidateCampaignPosts(qc, postId)
          break
        case 'cloned':
          // Clones land in the source post's campaign.
          invalidateCampaignPosts(qc, postId)
          break
        case 'declined':
          break
      }
    }

    setCompletionHandler(handler)
    return () => setCompletionHandler(null)
  }, [qc])

  return null
}

/**
 * Invalidates the campaign post list affected by a turn. The source post's
 * campaign id comes from the query cache (the user reached the assistant from
 * that post's page, so it is virtually always present); when it isn't, every
 * campaign post list is invalidated rather than silently skipping the refresh.
 */
function invalidateCampaignPosts(qc: QueryClient, postId: string) {
  const campaignId = qc.getQueryData<Post>(postKey(postId))?.campaign_id
  if (campaignId) {
    qc.invalidateQueries({ queryKey: campaignPostsKey(campaignId) })
  } else {
    qc.invalidateQueries({
      predicate: (q) => q.queryKey[0] === 'campaigns' && q.queryKey[2] === 'posts',
    })
  }
}
