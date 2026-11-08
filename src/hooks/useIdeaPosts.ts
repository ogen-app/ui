import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  compileIdeas,
  draftIdeas,
  listIdeaSlots,
  listPostIdeas,
} from '@/services/api/ideaPosts'
import { refreshTouched } from '@/lib/assistantTouched'
import { toast } from '@/stores/toastStore'

/**
 * Ideas and the posts made from them (CON-449). Every key sits under
 * `['ideas']` or the post's own key, so the writes that already invalidate
 * those — a verdict, an assistant turn touching ideas or a post — refresh
 * these too.
 */

export const ideaSlotsKey = (
  from: string,
  to: string,
  campaignId: string | null,
) => ['ideas', 'slots', campaignId ?? 'all', from, to] as const

export const postIdeasKey = (postId: string) =>
  ['post', postId, 'ideas'] as const

export function useIdeaSlots(
  from: string,
  to: string,
  campaignId: string | null,
) {
  return useQuery({
    queryKey: ideaSlotsKey(from, to, campaignId),
    queryFn: () => listIdeaSlots(from, to, campaignId),
    staleTime: 30_000,
  })
}

export function usePostIdeas(postId: string) {
  return useQuery({
    queryKey: postIdeasKey(postId),
    queryFn: () => listPostIdeas(postId),
  })
}

/** Compiles ideas into one planned post, and says so. */
export function useCompileIdeas() {
  const qc = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: ({
      ids,
      campaignId,
      targetDate,
    }: {
      ids: string[]
      campaignId?: string
      targetDate?: string
    }) =>
      compileIdeas(ids, {
        ...(campaignId ? { campaign_id: campaignId } : {}),
        ...(targetDate ? { target_date: targetDate } : {}),
      }),
    onSuccess: async ({ post }) => {
      await refreshTouched(qc, [
        { kind: 'post', id: post.id },
        { kind: 'idea' },
      ])
      toast.success(t('ideas.lifecycle.compiled'), { description: post.title })
    },
  })
}

/**
 * Writes drafts from ideas in the background: the stream keeps going while
 * the user moves on, and a toast reports how many landed. A failure part-way
 * keeps — and reports — the drafts already written.
 */
export function useDraftIdeas() {
  const qc = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: async ({
      ids,
      campaignId,
      targetDate,
    }: {
      ids: string[]
      campaignId?: string
      targetDate?: string
    }) => {
      const written: string[] = []
      let failure: string | null = null
      await draftIdeas(
        ids,
        {
          ...(campaignId ? { campaign_id: campaignId } : {}),
          ...(targetDate ? { target_date: targetDate } : {}),
        },
        (event) => {
          if (event.type === 'post') written.push(event.postId)
          if (event.type === 'error') failure = event.message
        },
      )
      return { written, failure: failure as string | null }
    },
    onSuccess: async ({ written, failure }) => {
      await refreshTouched(qc, [{ kind: 'post' }, { kind: 'idea' }])
      if (failure) {
        toast.error(t('ideas.lifecycle.draftFailed'), {
          description:
            written.length > 0
              ? t('ideas.lifecycle.draftsKept', { count: written.length })
              : failure,
        })
        return
      }
      toast.success(t('ideas.lifecycle.drafted', { count: written.length }))
    },
  })
}
