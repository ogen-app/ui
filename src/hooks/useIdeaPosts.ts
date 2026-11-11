import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  compileIdeas,
  draftIdeas,
  listIdeaPosts,
  listIdeaSlots,
  listPostIdeas,
} from '@/services/api/ideaPosts'
import { refreshTouched } from '@/lib/assistantTouched'
import { counted, formatNumber } from '@/lib/intl'
import { useJustWrittenStore } from '@/stores/justWrittenStore'
import { useSettingsStore } from '@/stores/settingsStore'
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

/** Under `['ideas']`, so a compile, a draft or a turn touching ideas refreshes it. */
export const ideaPostsKey = (ideaId: string) =>
  ['ideas', ideaId, 'posts'] as const

/** Ideas planned onto a range of days; `null` asks for nothing. */
export function useIdeaSlots(
  range: { from: string; to: string } | null,
  campaignId: string | null,
) {
  return useQuery({
    queryKey: ideaSlotsKey(range?.from ?? '', range?.to ?? '', campaignId),
    queryFn: () =>
      range ? listIdeaSlots(range.from, range.to, campaignId) : [],
    enabled: range !== null,
    staleTime: 30_000,
  })
}

export function usePostIdeas(postId: string) {
  return useQuery({
    queryKey: postIdeasKey(postId),
    queryFn: () => listPostIdeas(postId),
  })
}

/** What a compile or a draft from ideas is asked for (CON-470). */
export type IdeaPostRequest = {
  ids: string[]
  campaignId?: string
  /** One post per platform; none leaves it to the ideas' plans. */
  platformIds?: string[]
  /** A day the user chose; without one only a date planned on the ideas dates the posts. */
  targetDate?: string
}

function requestOptions({
  campaignId,
  platformIds,
  targetDate,
}: IdeaPostRequest) {
  return {
    ...(campaignId ? { campaign_id: campaignId } : {}),
    ...(platformIds?.length ? { platform_ids: platformIds } : {}),
    ...(targetDate ? { target_date: targetDate } : {}),
  }
}

/** The posts made from one idea (CON-470), for the opened idea's MADE INTO. */
export function useIdeaPostRefs(ideaId: string, enabled: boolean) {
  return useQuery({
    queryKey: ideaPostsKey(ideaId),
    queryFn: () => listIdeaPosts(ideaId),
    enabled,
  })
}

/** Compiles ideas into a planned post per platform, and says so. */
export function useCompileIdeas() {
  const qc = useQueryClient()
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (request: IdeaPostRequest) =>
      compileIdeas(request.ids, requestOptions(request)),
    // The global mutation toast reports a failure; this names the action.
    meta: { errorTitle: t('ideas.lifecycle.compileFailed') },
    onSuccess: async ({ posts }) => {
      await refreshTouched(qc, [
        ...posts.map((p) => ({ kind: 'post' as const, id: p.id })),
        { kind: 'idea' },
      ])
      toast.success(t('ideas.lifecycle.compiled', { count: posts.length }), {
        description: posts[0]?.title,
      })
    },
  })
}

/**
 * Writes drafts from ideas in the background: the stream keeps going while
 * the user moves on, and a toast reports how many landed. A failure part-way
 * keeps — and reports — the drafts already written.
 *
 * Unscheduled is the default (CON-470), so the toast says how many went
 * without a date and, when it knows their campaign, offers SHOW: the
 * campaign's calendar with the Not scheduled panel open and the new drafts
 * on top of it (`justWrittenStore`).
 */
export function useDraftIdeas() {
  const qc = useQueryClient()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const openPanel = useSettingsStore((s) => s.openRightPanel)
  const remember = useJustWrittenStore((s) => s.add)
  return useMutation({
    mutationFn: async (request: IdeaPostRequest & { together?: boolean }) => {
      const written: { id: string; dated: boolean }[] = []
      let failure: string | null = null
      try {
        await draftIdeas(
          request.ids,
          {
            ...requestOptions(request),
            ...(request.together ? { together: true } : {}),
          },
          (event) => {
            if (event.type === 'post')
              written.push({ id: event.postId, dated: !!event.publishDate })
            if (event.type === 'error') failure = event.message
          },
        )
      } catch (err) {
        // A refusal, or a read that broke part-way: either way the drafts
        // already saved are real, and are refreshed and reported below.
        failure = err instanceof Error ? err.message : String(err)
      }
      return { written, failure: failure as string | null }
    },
    onSuccess: async ({ written, failure }, { campaignId }) => {
      const unscheduled = written.filter((p) => !p.dated).map((p) => p.id)
      remember(unscheduled)
      await refreshTouched(qc, [{ kind: 'post' }, { kind: 'idea' }])
      const show =
        campaignId && unscheduled.length > 0
          ? {
              label: t('ideas.lifecycle.show'),
              onClick: () => {
                // The calendar's own choice, recorded before it mounts, so
                // the panel is what the calendar opens with.
                openPanel('notScheduled')
                void navigate({
                  to: '/campaigns/$campaignId/calendar',
                  params: { campaignId },
                })
              },
            }
          : undefined
      if (failure) {
        // The kept drafts are as reachable as a full run's.
        toast.error(t('ideas.lifecycle.draftFailed'), {
          description:
            written.length > 0
              ? t('ideas.lifecycle.draftsKept', { count: written.length })
              : failure,
          action: show,
        })
        return
      }
      toast.success(draftedTitle(t, written.length, unscheduled.length), {
        ...(show ? { description: t('ideas.lifecycle.inNotScheduled') } : {}),
        action: show,
      })
    },
  })
}

/** How many drafts were written, and how many of them have no date. */
function draftedTitle(t: TFunction, written: number, unscheduled: number) {
  if (unscheduled === written)
    return t('ideas.lifecycle.drafted', counted(written))
  if (unscheduled === 0)
    return t('ideas.lifecycle.draftedDated', counted(written))
  return t('ideas.lifecycle.draftedSome', {
    ...counted(written),
    unscheduled: formatNumber(unscheduled),
  })
}
