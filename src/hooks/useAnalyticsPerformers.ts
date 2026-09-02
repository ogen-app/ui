import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { envelopeUnavailable, fetchPerformers } from '@/services/api/analytics'
import {
  buildPerformersView,
  DEFAULT_PERFORMER_BASIS,
  type PerformersBoardView,
} from '@/lib/analyticsPerformersView'
import type { PerformerSort } from '@/types/analytics'

/**
 * The window's best and worst posts (CON-238), each scored against the typical
 * post on its platform at the same age.
 *
 * Tenant-scoped like the overview, and on the same envelope conventions — which
 * is why the four states below are the overview's four, named the same and
 * decided the same way.
 *
 * The one structural difference: **`by` is part of the key.** The server ranks
 * and sends two clamped ends, so changing the criterion is a different answer
 * rather than a different view of the same one, and there is no way to re-sort
 * what is already in hand.
 */
export const ANALYTICS_PERFORMERS_KEY = ['analytics', 'performers'] as const

export function analyticsPerformersKey(
  window: string,
  by: PerformerSort,
  platform?: string,
) {
  return [...ANALYTICS_PERFORMERS_KEY, window, by, platform ?? 'all'] as const
}

export type AnalyticsPerformersResult = {
  view?: PerformersBoardView
  isPending: boolean
  isError: boolean
  /** Nothing is being measured — a setup state, not a fault. */
  isUnavailable: boolean
  /** Wired up, but no posts went out in this window. */
  isEmpty: boolean
}

export function useAnalyticsPerformers(
  window: string,
  by: PerformerSort = DEFAULT_PERFORMER_BASIS,
  /**
   * The wire slug of one platform, or nothing for all of them. This is the only
   * one of the three dashboard reads the server will narrow by platform — see
   * the `analytics-overview` flag.
   */
  platform?: string,
): AnalyticsPerformersResult {
  const query = useQuery({
    queryKey: analyticsPerformersKey(window, by, platform),
    queryFn: () => fetchPerformers({ window, by, platform }),
    staleTime: 5 * 60_000,
    retry: 2,
    // Re-ranking is a refetch, and a board that empties itself into a skeleton
    // on every change of the picker reads as a page reload. The previous
    // answer stays up — it is the same posts in a different order — until the
    // new one lands.
    placeholderData: keepPreviousData,
  })

  const envelope = query.data
  const withheld = envelope ? envelopeUnavailable(envelope) : false
  const board = envelope && !withheld ? envelope.data : null

  const view = useMemo(
    () => (board ? buildPerformersView(board) : undefined),
    [board],
  )

  return {
    view,
    isPending: query.isPending,
    isError: query.isError,
    isUnavailable: withheld && envelope?.reason !== 'no_data',
    isEmpty: withheld && envelope?.reason === 'no_data',
  }
}
