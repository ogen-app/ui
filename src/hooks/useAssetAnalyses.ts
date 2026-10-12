import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { analysisInFlight } from '@/lib/assetAnalysis'
import { ApiError } from '@/services/api/errors'
import { listAssetAnalyses, retryAssetAnalysis } from '@/services/api/content'
import { toast } from '@/stores/toastStore'
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
 * Re-queues a failed or skipped lens. Optimism is the analyses refetch rather
 * than a cache patch: the server writes the lens `pending`, and the next read
 * shows the skeleton the user expects. A 409 means somebody else already
 * retried it or it settled meanwhile — the refetch is the whole answer.
 */
export function useRetryAssetAnalysis(id: string) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (campaignId: string | null) =>
      retryAssetAnalysis(id, campaignId),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) return
      toast.error(t('assetInsights.retryFailed'))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: assetAnalysesKey(id) }),
  })
}
