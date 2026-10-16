import { useCallback } from 'react'
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { analysisInFlight } from '@/lib/assetAnalysis'
import type { IdeaVerdict } from '@/lib/ideas'
import { ApiError } from '@/services/api/errors'
import { listAssetAnalyses, retryAssetAnalysis } from '@/services/api/content'
import { setIdeaVerdict } from '@/services/api/ideas'
import { toast } from '@/stores/toastStore'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import type { AssetStatus } from '@/types/content'
import { ASSET_LIST_KEY } from './useContent'

/**
 * Under the asset's own key, so an `asset.updated` (re-extraction, a finished
 * scrape) takes the analyses with it, and the event bus's reconnect sweep of
 * `['assets']` reaches them too.
 */
export const assetAnalysesKey = (id: string) =>
  ['assets', id, 'analyses'] as const

/**
 * How often to look again while an analysis is on its way. The event bus says
 * when one lands, but it is at-most-once — this is what makes "no need to
 * refresh" true when an event is lost, so it is slow on purpose and stops the
 * moment everything has settled.
 */
const FALLBACK_POLL_MS = 15_000

/**
 * Every lens of an asset's analysis (CON-364/366).
 *
 * `assetStatus` is the asset's own: while its text is still being extracted
 * the analyses cannot have started, and the poll covers that stretch too.
 */
export function useAssetAnalyses(
  id: string,
  {
    assetStatus,
    enabled = true,
  }: { assetStatus: AssetStatus | undefined; enabled?: boolean },
) {
  return useQuery({
    queryKey: assetAnalysesKey(id),
    queryFn: () => listAssetAnalyses(id),
    enabled: enabled && !!id,
    refetchInterval: (query) =>
      assetStatus && analysisInFlight(assetStatus, query.state.data ?? [])
        ? FALLBACK_POLL_MS
        : false,
  })
}

/**
 * Re-queues a failed or skipped lens — or starts one that does not exist yet
 * (CON-367: the endpoint creates a missing lens), which is what "Analyse now"
 * on a never-analysed asset sends. A missing lens is not in the cache, so
 * there is nothing to mark optimistically; the refetch brings it in pending.
 *
 * Optimistic: the lens is marked `pending` in the cache at once, so the
 * skeleton is on screen before the round trip, and the refetch on settle
 * replaces the guess with what the server wrote. A 409 means somebody else
 * already retried it or it settled meanwhile — the refetch is the whole
 * answer. Anything else puts the lens back as it was and says so.
 */
export function useRetryAssetAnalysis(id: string) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const key = assetAnalysesKey(id)
  return useMutation({
    mutationFn: (campaignId: string | null) =>
      retryAssetAnalysis(id, campaignId),
    onMutate: async (campaignId) => {
      await qc.cancelQueries({ queryKey: key })
      const before = qc.getQueryData<AssetAnalysis[]>(key)
      qc.setQueryData<AssetAnalysis[]>(key, (lenses) =>
        lenses?.map((lens) =>
          lens.campaign_id === campaignId
            ? {
                ...lens,
                status: 'pending',
                failure_code: '',
                failure_reason: '',
              }
            : lens,
        ),
      )
      return { before }
    },
    onError: (err, _campaignId, context) => {
      if (err instanceof ApiError && err.status === 409) return
      if (context?.before) qc.setQueryData(key, context.before)
      toast.error(t('assetInsights.retryFailed'))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}

/**
 * Answers one of an asset's ideas where it is read (CON-387): the same
 * `PUT /api/ideas/:id/verdict` the Ideas inbox sends, `null` putting it back
 * with the undecided.
 *
 * Optimistic, as triage in Ideas is: the verdict lands in this asset's
 * readings at once, so the mark, the piles and the buttons move with the
 * click, and a failure puts the readings back and says so in Ideas' words.
 * Settling re-reads the readings, the Assets list (whose counts and ideas card
 * read verdicts) and every Ideas list, so no screen keeps the old answer.
 *
 * **One answer per idea at a time.** A second click while the first is in
 * flight is refused, not queued: two PUTs racing could land in either order,
 * the first one's settling refetch would flash the old verdict under the
 * second, and its failure would restore a snapshot taken before both. The
 * request is a mutation keyed by the idea, so `pending` survives the row being
 * closed and opened again mid-flight.
 */
export function useAnswerIdea(assetId: string, ideaId: string) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const key = assetAnalysesKey(assetId)
  const mutationKey = ['ideas', ideaId, 'verdict'] as const
  const pending = useIsMutating({ mutationKey }) > 0

  const mutation = useMutation({
    mutationKey,
    mutationFn: ({
      verdict,
      remindAt,
    }: {
      verdict: IdeaVerdict | null
      remindAt: string | null
    }) => setIdeaVerdict(ideaId, verdict, remindAt),
    onMutate: async ({ verdict, remindAt }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<AssetAnalysis[]>(key)
      const at = new Date().toISOString()
      qc.setQueryData<AssetAnalysis[]>(key, (lenses) =>
        lenses?.map((lens) => ({
          ...lens,
          ideas: lens.ideas.map((idea) =>
            idea.id === ideaId
              ? {
                  ...idea,
                  verdict,
                  decided_at: verdict ? at : null,
                  remind_at: verdict === 'later' ? remindAt : null,
                }
              : idea,
          ),
        })),
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
      toast.error(t('ideas.saveFailed'))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key })
      void qc.invalidateQueries({ queryKey: ASSET_LIST_KEY })
      void qc.invalidateQueries({ queryKey: ['ideas'] })
    },
  })

  const answer = useCallback(
    (verdict: IdeaVerdict | null, remindAt: string | null = null) => {
      if (qc.isMutating({ mutationKey }) > 0) return
      mutation.mutate({ verdict, remindAt })
    },
    // `mutationKey` is rebuilt from `ideaId` each render; `mutate` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ideaId, qc, mutation.mutate],
  )

  return { answer, pending }
}
