import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { analysisInFlight } from '@/lib/assetAnalysis'
import { ApiError } from '@/services/api/errors'
import { listAssetAnalyses, retryAssetAnalysis } from '@/services/api/content'
import { toast } from '@/stores/toastStore'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import type { AssetStatus } from '@/types/content'

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
