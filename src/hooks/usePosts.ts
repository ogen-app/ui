import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import { createPost, deletePost, listCampaignPosts, updatePost } from '@/services/api/posts'
import { CAMPAIGN_SUMMARIES_KEY, campaignOverviewKey } from '@/hooks/useCampaigns'
import { atDefaultTime } from '@/lib/postSchedule'
import { selectStreamedPosts, useAssistantStore } from '@/stores/assistantStore'
import type { StreamedPost } from '@/types/assistant'
import type { Post, PostPayload } from '@/types/posts'

export const campaignPostsKey = (campaignId: string) => ['campaigns', campaignId, 'posts'] as const

/**
 * The server's overview is a roll-up of these posts, so it goes stale with
 * them. It sits beside this key rather than under it, so invalidating the
 * post list alone leaves the Overview's distribution showing the old totals.
 *
 * The Campaigns-list summaries (CON-152) are a roll-up of the same posts and
 * sit beside them too — across *all* campaigns, so one workspace-wide key
 * covers every card at once.
 */
function invalidateCampaignPosts(qc: QueryClient, campaignId: string): void {
  qc.invalidateQueries({ queryKey: campaignPostsKey(campaignId) })
  qc.invalidateQueries({ queryKey: campaignOverviewKey(campaignId) })
  qc.invalidateQueries({ queryKey: CAMPAIGN_SUMMARIES_KEY })
}

/**
 * The campaign's posts, with any the assistant is generating right now folded
 * in. The content-plan flow persists each draft as it writes it and streams it
 * ahead of the refetch, so the calendar fills in live instead of jumping at
 * the end of a multi-minute turn. Streamed rows carry the id they were saved
 * under, so the refetched copy replaces them without a flicker.
 */
export function useCampaignPosts(campaignId: string) {
  const query = useQuery({
    queryKey: campaignPostsKey(campaignId),
    queryFn: () => listCampaignPosts(campaignId),
    enabled: !!campaignId,
  })

  const streamed = useAssistantStore(selectStreamedPosts(campaignId))
  const data = useMemo(() => {
    if (streamed.length === 0) return query.data
    const saved = query.data ?? []
    const known = new Set(saved.map((p) => p.id))
    const pending = streamed
      .filter((p) => !known.has(p.id))
      .map((p) => draftPost(p, campaignId))
    return pending.length === 0 ? saved : [...saved, ...pending]
  }, [query.data, streamed, campaignId])

  return { ...query, data }
}

/** Fills a streamed draft out to a `Post` the calendar and list can render. */
function draftPost(streamed: StreamedPost, campaignId: string): Post {
  return {
    ...streamed,
    campaign_id: campaignId,
    social_account_id: '',
    media_urls: [],
    published_at: null,
    status: 'draft',
    cta_type: 'none',
    cta_url: '',
    target_audience_notes: '',
    used_asset_ids: [],
    created_by: '',
    created_at: '',
    updated_at: '',
    campaign: null,
    platform: null,
    used_assets: [],
    campaign_type_phase: null,
  }
}

export function useCreatePost(campaignId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: PostPayload) => createPost(payload),
    onSuccess: () => {
      invalidateCampaignPosts(qc, campaignId)
    },
  })
}

/**
 * Returns a handler that creates a blank post in the campaign and navigates to
 * its editor. Shared by the campaign header action, the empty-state buttons and
 * the calendar (which passes the clicked day so the post lands on that date).
 *
 * Note the explicit `Date` parameter: wiring this straight to `onClick` would
 * pass a MouseEvent, so button call sites must use `onClick={() => addPost()}`.
 * TypeScript rejects the bare form.
 */
export function useAddPost(campaignId: string) {
  const createPost = useCreatePost(campaignId)
  const navigate = useNavigate()
  return useCallback(
    (day?: Date) => {
      const scheduled_at = day ? atDefaultTime(day) : undefined
      createPost.mutate(
        { campaign_id: campaignId, scheduled_at },
        {
          onSuccess: (post) => {
            navigate({
              to: '/campaigns/$campaignId/posts/$postId',
              params: { campaignId, postId: post.id },
            })
          },
        },
      )
    },
    [createPost, navigate, campaignId],
  )
}

export function useUpdatePost(campaignId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PostPayload }) =>
      updatePost(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: campaignPostsKey(campaignId) })
      const prev = qc.getQueryData<Post[]>(campaignPostsKey(campaignId))
      if (prev) {
        qc.setQueryData<Post[]>(
          campaignPostsKey(campaignId),
          prev.map((p) => (p.id === id ? { ...p, ...payload } : p)),
        )
      }
      return { prev }
    },
    // The rollback only. The toast comes from the mutation cache default
    // (CON-164): without it this rollback is the *entire* visible effect of a
    // refused update, so a dragged post snapping back reads as a UI glitch
    // rather than as the server saying no.
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(campaignPostsKey(campaignId), ctx.prev)
    },
    onSettled: () => {
      invalidateCampaignPosts(qc, campaignId)
    },
  })
}

export function useDeletePost(campaignId: string) {
  const qc = useQueryClient()
  return useMutation({
    // Keeps the wording `DeletePostDialog` used to supply itself: the server's
    // reason for refusing lands in the description under a title that names
    // what the user was trying to do.
    meta: { errorTitle: 'Unable to delete post' },
    mutationFn: (id: string) => deletePost(id),
    onSuccess: () => {
      invalidateCampaignPosts(qc, campaignId)
    },
  })
}
