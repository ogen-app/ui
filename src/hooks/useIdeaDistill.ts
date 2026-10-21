import { useMemo, useState } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { activeRun, isRunActive, outcomeOf } from '@/lib/ideaDistill'
import { ApiError } from '@/services/api/errors'
import { listIdeaDistills, requestIdeaDistill } from '@/services/api/content'
import type { IdeaDistillRun } from '@/types/assetAnalysis'
import { assetAnalysesKey } from './useAssetAnalyses'
import { ASSET_LIST_KEY } from './useContent'

/**
 * Under the asset's own key, like its analyses — so the event bus's
 * `asset.ideas.distill.updated`, which invalidates the asset's subtree, moves
 * these and the ideas they produce in one go (`lib/eventRouting`).
 */
export const ideaDistillsKey = (assetId: string, campaignId: string | null) =>
  ['assets', assetId, 'distills', campaignId ?? 'workspace'] as const

/** The event bus is at-most-once; this is the slow look for a lost event. */
const FALLBACK_POLL_MS = 15_000

/** Why a request for more ideas was refused before it became a run. */
export type DistillRefusal = 'limit' | 'plan' | 'invalid' | 'failed'

/**
 * Asking one lens of an asset for more ideas (CON-397/398): its runs, the one
 * in flight, what the latest one came to, and the request itself.
 *
 * **What a settled run says is only said once.** A run's outcome row (nothing
 * new, failed, out of runs) belongs to the visit that watched it — so only a
 * run this page saw in flight, or sent itself, reports. Without that, a run
 * that failed last week would greet every visit to the asset. For the same
 * reason the ideas a run added are `fresh` only on the visit that saw them
 * land: that is what the list's dot means.
 */
export function useIdeaDistill(
  assetId: string,
  campaignId: string | null,
  { enabled }: { enabled: boolean },
) {
  const qc = useQueryClient()
  const key = ideaDistillsKey(assetId, campaignId)
  const runs = useQuery({
    queryKey: key,
    queryFn: async () => {
      const before = qc.getQueryData<IdeaDistillRun[]>(key)
      const after = await listIdeaDistills(assetId, campaignId)
      // The poll found a run settled that the event bus never reported: its
      // ideas are what the lens and every list are now missing.
      if (settledSince(before, after)) refreshIdeas(qc, assetId)
      return after
    },
    enabled: enabled && !!assetId,
    refetchInterval: (query) =>
      activeRun(query.state.data ?? []) ? FALLBACK_POLL_MS : false,
  })

  const [watched, setWatched] = useState<ReadonlySet<string>>(new Set())
  const list = runs.data ?? []
  const active = activeRun(list)
  // Adjusted during render rather than in an effect, as `useLensArrival` does:
  // a run seen in flight is watched from the render that first shows it.
  if (active && !watched.has(active.id))
    setWatched(new Set(watched).add(active.id))

  const [refusal, setRefusal] = useState<DistillRefusal | null>(null)
  const request = useMutation({
    mutationFn: (input: { focus: string; count: number }) =>
      requestIdeaDistill(assetId, campaignId, input),
    // Every refusal is answered where it happened — in the modal or at the
    // foot of the list — never in the global toast.
    meta: { errorToast: false },
    onMutate: () => setRefusal(null),
    onSuccess: (run) => {
      setWatched((prev) => new Set(prev).add(run.id))
      qc.setQueryData<IdeaDistillRun[]>(key, (prev) => [
        run,
        ...(prev ?? []).filter((r) => r.id !== run.id),
      ])
    },
    onError: (err) => {
      setRefusal(refusalOf(err))
      // A 409 is the server knowing better: either the lens is not ready, or
      // somebody else's run is already in flight. Both are a re-read.
      if (err instanceof ApiError && err.status === 409) {
        void qc.invalidateQueries({ queryKey: key })
        void qc.invalidateQueries({ queryKey: assetAnalysesKey(assetId) })
      }
    },
  })

  const latest = list[0]
  const reported =
    latest && !isRunActive(latest) && watched.has(latest.id)
      ? latest
      : undefined
  const fresh = useMemo(
    () =>
      new Set(
        (runs.data ?? [])
          .filter((r) => watched.has(r.id) && outcomeOf(r) === 'landed')
          .map((r) => r.id),
      ),
    [runs.data, watched],
  )

  return {
    active,
    /** The settled run whose outcome this visit should state, if any. */
    reported,
    /** The runs whose ideas landed while this page was open. */
    fresh,
    refusal: request.isPending ? null : refusal,
    request,
  }
}

/** A 409 is not a refusal to state — the re-read that follows answers it. */
export function refusalOf(err: unknown): DistillRefusal | null {
  if (!(err instanceof ApiError)) return 'failed'
  switch (err.status) {
    case 402:
      return 'limit'
    case 403:
      return err.code === 'feature_not_available' ? 'plan' : 'failed'
    case 400:
      return 'invalid'
    case 409:
      return null
    default:
      return 'failed'
  }
}

/** A run that was in flight in the last read and is not in this one. */
function settledSince(
  before: IdeaDistillRun[] | undefined,
  after: IdeaDistillRun[],
): boolean {
  const was = before && activeRun(before)
  if (!was) return false
  const now = after.find((r) => r.id === was.id)
  return !!now && !isRunActive(now)
}

/** Where a run's ideas show up: the lens, the Assets list's counts, Ideas. */
function refreshIdeas(qc: QueryClient, assetId: string) {
  void qc.invalidateQueries({ queryKey: assetAnalysesKey(assetId) })
  void qc.invalidateQueries({ queryKey: ASSET_LIST_KEY })
  void qc.invalidateQueries({ queryKey: ['ideas'] })
}
