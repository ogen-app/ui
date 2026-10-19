import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { envelopeUnavailable, fetchPerformers } from '@/services/api/analytics'
import {
  buildPerformersView,
  DEFAULT_PERFORMER_BASIS,
  type PerformersBoardView,
} from '@/lib/analyticsPerformersView'
import { canonicalPlatforms, platformsKey } from '@/lib/analyticsPlatformScope'
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
  platforms: readonly string[] = [],
) {
  return [
    ...ANALYTICS_PERFORMERS_KEY,
    window,
    by,
    platformsKey(platforms),
  ] as const
}

export type AnalyticsPerformersResult = {
  view?: PerformersBoardView
  isPending: boolean
  isError: boolean
  /** Nothing is being measured — a setup state, not a fault. */
  isUnavailable: boolean
  /** Wired up, but no posts went out in this window. */
  isEmpty: boolean
  /**
   * The platforms the answer on screen was fetched for — Zernio slugs, empty
   * for every platform. Not the selection: while a new one is in flight the
   * previous answer stays up (`keepPreviousData`), and a card naming the
   * pending platforms over it would say "nothing on LinkedIn" about a read
   * that counted everything.
   */
  platforms: readonly string[]
}

export function useAnalyticsPerformers(
  window: string,
  by: PerformerSort = DEFAULT_PERFORMER_BASIS,
  /** Zernio slugs to narrow to; empty for every platform. */
  platforms: readonly string[] = [],
): AnalyticsPerformersResult {
  const { t } = useTranslation()
  const scope = canonicalPlatforms(platforms)
  const query = useQuery({
    queryKey: analyticsPerformersKey(window, by, scope),
    // The set travels with the answer, so the card can name what it counted.
    queryFn: async () => ({
      platforms: scope,
      envelope: await fetchPerformers({ window, by, platforms: scope }),
    }),
    staleTime: 5 * 60_000,
    retry: 2,
    // Re-ranking is a refetch, and a board that empties itself into a skeleton
    // on every change of the picker reads as a page reload. The previous
    // answer stays up — it is the same posts in a different order — until the
    // new one lands.
    placeholderData: keepPreviousData,
  })

  const envelope = query.data?.envelope
  const withheld = envelope ? envelopeUnavailable(envelope) : false
  const board = envelope && !withheld ? envelope.data : null

  // `t` alone, and it is enough: react-i18next rebuilds `t` when the language
  // changes (its snapshot is cached on `lng`), so a switch invalidates this
  // memo and every phrase built below is rebuilt in the new language.
  const view = useMemo(
    () => (board ? buildPerformersView(t, board) : undefined),
    [board, t],
  )

  return {
    view,
    isPending: query.isPending,
    isError: query.isError,
    isUnavailable: withheld && envelope?.reason !== 'no_data',
    isEmpty: withheld && envelope?.reason === 'no_data',
    platforms: query.data?.platforms ?? scope,
  }
}
