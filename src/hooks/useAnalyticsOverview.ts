import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  envelopeUnavailable,
  fetchAnalyticsOverview,
} from '@/services/api/analytics'
import { buildNowView } from '@/lib/analyticsOverviewView'
import type { NowView } from '@/components/analytics/types'

/**
 * The workspace's cumulative overview (CON-237): one call, five cards, a series
 * per metric and the deterministic callouts.
 *
 * Tenant-scoped and workspace-wide — there is no campaign or platform
 * parameter, which is why this hook takes a window and nothing else.
 */
export const ANALYTICS_OVERVIEW_KEY = ['analytics', 'overview'] as const

export function analyticsOverviewKey(window: string) {
  return [...ANALYTICS_OVERVIEW_KEY, window] as const
}

/**
 * The windows the surface offers.
 *
 * All three stay inside the server's 90-day day-bucketing threshold, so the
 * chart is drawn in days whichever is picked and its shape never changes
 * meaning under the reader. Anything past that adapts to weekly buckets on the
 * server, which is a different picture and wants its own design pass before it
 * is offered.
 *
 * The `label` is what the card's heading reads — `periodPhrase` turns a label
 * beginning "last" into "over last 28 days".
 */
export const OVERVIEW_WINDOWS = [
  { window: '7d', label: 'last 7 days' },
  { window: '28d', label: 'last 28 days' },
  { window: '90d', label: 'last 90 days' },
] as const

export const DEFAULT_OVERVIEW_WINDOW = '28d'

export type AnalyticsOverviewResult = {
  view?: NowView
  isPending: boolean
  isError: boolean
  /**
   * Nothing is being measured: no analytics database, no Zernio profile, no
   * Analytics add-on — or a reason this client has never heard of. A setup
   * state, not a fault, and distinct from {@link isEmpty}, which is a workspace
   * that is wired up and simply hasn't published anything yet.
   *
   * Deliberately the fall-through of the two rather than a list of known
   * reasons: `reason` is a plain string the server is free to add to, and an
   * unrecognised one has to be explained rather than crash or read as data.
   */
  isUnavailable: boolean
  /** Wired up, nothing to report: no posts, no followers, no snapshots. */
  isEmpty: boolean
}

export function useAnalyticsOverview(
  window: string = DEFAULT_OVERVIEW_WINDOW,
): AnalyticsOverviewResult {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: analyticsOverviewKey(window),
    queryFn: () => fetchAnalyticsOverview({ window }),
    // The figures move when the refresh sweep writes, not when the user does
    // anything here, so re-reading on every mount buys nothing.
    staleTime: 5 * 60_000,
    // A workspace that isn't set up answers 200 with `available: false` rather
    // than failing, so there is no unavailable-shaped error to skip retries
    // for — the ordinary policy is right.
    retry: 2,
  })

  const envelope = query.data
  const withheld = envelope ? envelopeUnavailable(envelope) : false
  const overview = envelope && !withheld ? envelope.data : null

  // `t` alone, and it is enough: react-i18next rebuilds `t` when the language
  // changes (its snapshot is cached on `lng`), so a switch invalidates this
  // memo and every phrase built below is rebuilt in the new language.
  const view = useMemo(
    () => (overview ? buildNowView(t, overview) : undefined),
    [overview, t],
  )

  return {
    view,
    isPending: query.isPending,
    isError: query.isError,
    isUnavailable: withheld && envelope?.reason !== 'no_data',
    isEmpty: withheld && envelope?.reason === 'no_data',
  }
}
