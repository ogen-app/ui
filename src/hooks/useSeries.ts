import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CampaignSeries,
  ContentSeries,
  SeriesRhythm,
} from '@/components/series/types'
import { useFeatureFlag } from '@/config/featureFlags'
import {
  attachSeries,
  deleteSeries,
  detachSeries,
  getCampaignSeries,
  listSeries,
  promoteSeries,
  saveSeries,
  setSeriesRhythm,
} from '@/services/api/series'

/**
 * Reading and writing series (CON-264).
 *
 * Two query keys, because they are two resources and will be two endpoints: the
 * workspace's library, and one campaign's runs. Keeping them apart is what lets
 * an attach replace the campaign's row set without re-fetching a library that
 * has not changed — and it is the same separation the post editor and the post
 * list keep (`["post", id]` vs `["campaigns", id, "posts"]`).
 *
 * **The flag is the default `enabled`, not a call-site obligation.** The
 * campaign's Foundation page renders whether or not this feature exists, so an
 * unconditional query here would open a request on an ordinary screen for a
 * section that cannot be shown — the cost `useHelpTopicMap` describes, which
 * fixtures hide until the day the real read is swapped in. Reading the flag
 * inside and letting a caller override it gets that safety without asking eight
 * call sites to remember.
 */

export const SERIES_KEY = ['series'] as const
export const campaignSeriesKey = (campaignId: string) =>
  ['campaigns', campaignId, 'series'] as const

/** Every series the workspace can see, both scopes. Callers filter. */
export function useSeriesLibrary({ enabled }: { enabled?: boolean } = {}) {
  const flagged = useFeatureFlag('series')
  return useQuery<ContentSeries[]>({
    queryKey: SERIES_KEY,
    queryFn: listSeries,
    enabled: enabled ?? flagged,
  })
}

/** Which series one campaign runs, and how often. */
export function useCampaignSeries(
  campaignId: string,
  { enabled }: { enabled?: boolean } = {},
) {
  const flagged = useFeatureFlag('series')
  return useQuery<CampaignSeries>({
    queryKey: campaignSeriesKey(campaignId),
    queryFn: () => getCampaignSeries(campaignId),
    enabled: enabled ?? flagged,
  })
}

/**
 * Create or replace one, and delete one.
 *
 * Both invalidate the library and every campaign's runs: a rename shows on the
 * campaign rows that reference it, and a delete takes its runs with it
 * server-side, so the campaign's cached set is stale in a way only a refetch
 * can settle. Invalidating the `['campaigns']` prefix rather than naming a
 * campaign is deliberate — a series may be run by any number of them, and the
 * mutation does not know which.
 */
export function useSaveSeries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (series: ContentSeries) => saveSeries(series),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERIES_KEY })
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useDeleteSeries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSeries(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERIES_KEY })
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

/** Move a campaign's own series into the workspace library. One-way. */
export function usePromoteSeries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => promoteSeries(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERIES_KEY })
    },
  })
}

/**
 * The campaign's three writes — attach, detach, set a rhythm.
 *
 * Each answers with the whole `CampaignSeries`, and each writes that answer
 * straight into the cache rather than invalidating. Not an optimisation: the
 * response *is* the campaign's row set as the server left it, so taking it is
 * strictly better than asking again, and it keeps the plan arithmetic on
 * Strategy from flickering through a stale total between the write and the
 * refetch.
 *
 * Three hooks rather than one taking a verb, because the call sites are three
 * different controls and a shared one would take a discriminated argument that
 * every caller then has to construct.
 */
export function useAttachSeries(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (seriesId: string) => attachSeries(campaignId, seriesId),
    onSuccess: (data) =>
      queryClient.setQueryData(campaignSeriesKey(campaignId), data),
  })
}

export function useDetachSeries(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (seriesId: string) => detachSeries(campaignId, seriesId),
    onSuccess: (data) =>
      queryClient.setQueryData(campaignSeriesKey(campaignId), data),
  })
}

export function useSetSeriesRhythm(campaignId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      seriesId,
      rhythm,
    }: {
      seriesId: string
      rhythm: SeriesRhythm | null
    }) => setSeriesRhythm(campaignId, seriesId, rhythm),
    onSuccess: (data) =>
      queryClient.setQueryData(campaignSeriesKey(campaignId), data),
  })
}
