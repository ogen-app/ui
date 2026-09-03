import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createPost,
  deletePost,
  listCampaignPosts,
  updatePost,
} from '@/services/api/posts'
import { invalidateCampaignPosts } from '@/lib/postCache'
import { atDefaultTime } from '@/lib/postSchedule'
import { campaignPostsKey } from '@/lib/queryKeys'
import { selectStreamedPosts, useAssistantStore } from '@/stores/assistantStore'
import { toast } from '@/stores/toastStore'
import type { StreamedPost } from '@/types/assistant'
import type { Post, PostPayload } from '@/types/posts'

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

function useCreatePost(campaignId: string) {
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

/**
 * What a copy of a post starts life as (CON-251).
 *
 * Built field by field rather than through `postToPayload`, because what
 * carries over is a decision and not a round-trip: the payload names exactly
 * what the copy is *about* — the words, the channel, the call to action and the
 * documents it was written from — and everything left out is left out on
 * purpose.
 *
 * - **The schedule and the status** belong to the post that went out, so the
 *   copy starts as an unscheduled draft rather than inheriting a date in the
 *   past.
 * - **`media_urls`** is the server's rendering of the original's attachments.
 *   Copying the strings would give the new post a calendar thumbnail of files
 *   it does not have — attachments are their own resource, uploaded per post,
 *   and nothing on the API copies them.
 * - **`published_at` and `publisher_post_id`** are the server's, and naming
 *   them here would claim the copy is the thing that was published.
 *
 * The account *is* carried: a repurposed post almost always goes out as the
 * same one, and a picker that has to tolerate a disconnected value already
 * does.
 */
function duplicatePayload(post: Post, title: string): PostPayload {
  return {
    campaign_id: post.campaign_id,
    platform_id: post.platform_id,
    platform_post_type: post.platform_post_type,
    social_account_id: post.social_account_id,
    title,
    content: post.content,
    cta_type: post.cta_type,
    cta_url: post.cta_url,
    target_audience_notes: post.target_audience_notes,
    used_asset_ids: post.used_asset_ids,
    campaign_type_phase_id: post.campaign_type_phase_id,
    status: 'draft',
    scheduled_at: null,
  }
}

/**
 * Copies a post into a new draft in the same campaign, and opens it.
 *
 * The one forward move a published post has: `published` is terminal, so the
 * bottom bar's commit slot has no transition left to offer, and repurposing
 * what already worked is what people actually want next.
 *
 * It navigates rather than landing the draft silently — a copy you are not
 * taken to is indistinguishable from a button that did nothing.
 */
export function useDuplicatePost(campaignId: string) {
  const create = useCreatePost(campaignId)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const run = useCallback(
    (post: Post) => {
      // An untitled post copies to an untitled draft: "(copy)" on its own
      // names nothing, and the title is Ogen's own label on every platform
      // but YouTube.
      const source = post.title.trim()
      const title = source
        ? t('posts.duplicate.titleSuffix', { title: source })
        : ''
      create.mutate(duplicatePayload(post, title), {
        onSuccess: (created) => {
          toast.success(t('posts.duplicate.success'))
          void navigate({
            to: '/campaigns/$campaignId/posts/$postId',
            params: { campaignId, postId: created.id },
          })
        },
        onError: () => {
          toast.error(t('posts.duplicate.error'))
        },
      })
    },
    [create, navigate, campaignId, t],
  )

  return { run, running: create.isPending }
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
