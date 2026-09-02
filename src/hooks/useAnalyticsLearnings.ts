import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { envelopeUnavailable, fetchLearnings } from '@/services/api/analytics'
import {
  buildLearningsView,
  DEFAULT_LEARNINGS_METRIC,
  type LearningsView,
} from '@/lib/analyticsLearningsView'
import type { LearningsMetric } from '@/types/analytics'

/**
 * What the workspace has learned over all of its history (CON-239).
 *
 * Same envelope and same four states as the other two dashboard reads, with one
 * difference that shows up in the key: **there is no window in it.** This
 * endpoint takes no `window`/`from`/`to`, so the page's period picker must not
 * reach the query — which is the whole reason the card is marked `all-time`.
 * Changing the period leaves this answer cached and on screen, deliberately.
 *
 * `since` exists on the wire and is not exposed. It cuts off a past the
 * workspace has disowned, which is a workspace setting rather than a control on
 * a card, and offering it beside the metric would turn an all-time card back
 * into a period one.
 */
export const ANALYTICS_LEARNINGS_KEY = ['analytics', 'learnings'] as const

export function analyticsLearningsKey(metric: LearningsMetric) {
  return [...ANALYTICS_LEARNINGS_KEY, metric] as const
}

export type AnalyticsLearningsResult = {
  view?: LearningsView
  isPending: boolean
  isError: boolean
  /** Nothing is being measured — a setup state, not a fault. */
  isUnavailable: boolean
  /** Wired up, and nothing has been published yet. */
  isEmpty: boolean
}

export function useAnalyticsLearnings(
  metric: LearningsMetric = DEFAULT_LEARNINGS_METRIC,
): AnalyticsLearningsResult {
  const query = useQuery({
    queryKey: analyticsLearningsKey(metric),
    queryFn: () => fetchLearnings({ metric }),
    // Ten minutes rather than the five the windowed reads use: these are
    // all-time aggregates refreshed daily server-side, so a fresher request
    // would return the same bytes.
    staleTime: 10 * 60_000,
    retry: 2,
    // Switching metric re-scores the heatmap and re-mines the patterns, but it
    // is the same three sections about the same workspace — emptying the card
    // into a skeleton for it reads as a page reload.
    placeholderData: keepPreviousData,
  })

  const envelope = query.data
  const withheld = envelope ? envelopeUnavailable(envelope) : false
  const learnings = envelope && !withheld ? envelope.data : null

  const view = useMemo(
    () => (learnings ? buildLearningsView(learnings) : undefined),
    [learnings],
  )

  return {
    view,
    isPending: query.isPending,
    isError: query.isError,
    isUnavailable: withheld && envelope?.reason !== 'no_data',
    isEmpty: withheld && envelope?.reason === 'no_data',
  }
}
