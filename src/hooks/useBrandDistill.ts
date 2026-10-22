import { useState } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { isRunOpen, resumableRun } from '@/lib/brandDistill'
import { denialReason } from '@/lib/queryClient'
import { toast } from '@/stores/toastStore'
import { ApiError } from '@/services/api/errors'
import {
  answerDistill,
  commitDistill,
  discardDistill,
  getDistillRun,
  listDistillRuns,
  listStarterQuestions,
  requestDistill,
} from '@/services/api/brandDistill'
import { useBrandDistillStore } from '@/stores/brandDistillStore'
import type {
  DistillAnswer,
  DistillCommit,
  DistillRequest,
  DistillRun,
} from '@/types/brandDistill'
import { BRAND_KEY } from './useBrand'
import { invalidateEntitlements } from './useEntitlements'

/**
 * Brand reads (CON-400) — the runs, one run, and the four things that move
 * one along.
 *
 * Their own root, deliberately **not** under `['brand']`: every voice, fact
 * and guardrail save invalidates that whole subtree, and a library edit has no
 * business refetching a list of reads.
 */
export const DISTILLS_KEY = ['brandDistills'] as const
export const distillRunKey = (id: string) =>
  [...DISTILLS_KEY, 'run', id] as const
export const DISTILL_LIST_KEY = [...DISTILLS_KEY, 'list'] as const
const STARTER_KEY = [...DISTILLS_KEY, 'starter-questions'] as const

/**
 * The event bus is at-most-once (`brand.distill.updated` is a hint), so a run
 * in flight is also looked at on a slow clock — a dropped event costs a few
 * seconds of a stale checklist rather than a screen that never moves.
 */
const FALLBACK_POLL_MS = 10_000

export function useDistillRuns(enabled = true) {
  return useQuery({
    queryKey: DISTILL_LIST_KEY,
    queryFn: listDistillRuns,
    enabled,
  })
}

/** The run a workspace left mid-way, if there is one — to resume it. */
export function useResumableRun(enabled = true): DistillRun | undefined {
  const { data } = useDistillRuns(enabled)
  return data ? resumableRun(data) : undefined
}

export function useDistillRun(id: string) {
  return useQuery({
    queryKey: distillRunKey(id),
    queryFn: () => getDistillRun(id),
    refetchInterval: (query) =>
      query.state.data && isRunOpen(query.state.data.status)
        ? FALLBACK_POLL_MS
        : false,
  })
}

export function useStarterQuestions() {
  return useQuery({
    queryKey: STARTER_KEY,
    queryFn: listStarterQuestions,
    // A fixed set; the server changes it with a deploy, not with use.
    staleTime: Infinity,
  })
}

/** Why a request was refused before it became a run, as this client words it. */
export type DistillRefusal =
  'invalidUrl' | 'scrapingUnavailable' | 'gateOff' | 'unavailable' | 'failed'

function refusalOf(err: unknown): DistillRefusal | null {
  if (!(err instanceof ApiError)) return 'failed'
  switch (err.code) {
    case 'invalid_url':
      return 'invalidUrl'
    case 'scraping_unavailable':
      return 'scrapingUnavailable'
    case 'feature_not_available':
      return 'gateOff'
    case 'distill_unavailable':
      return 'unavailable'
    // A plan limit is the global toast's to word (CON-295), and a run already
    // open is not a refusal at all — the page goes to it.
    case 'entitlement_exceeded':
    case 'distill_in_progress':
      return null
  }
  return 'failed'
}

/**
 * Starting a read, from any of the three routes.
 *
 * A 409 `distill_in_progress` is the workspace already having a read open —
 * the user's own in another tab, or a teammate's — and the answer to it is to
 * open that one: there is one per workspace, so it is the one they were going
 * to be shown anyway. Every other refusal is said beside the control that
 * asked, except the plan's 402, which the global toast words like every other
 * entitlement refusal.
 */
export function useRequestDistill() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [refusal, setRefusal] = useState<DistillRefusal | null>(null)

  const open = (runId: string) =>
    navigate({ to: '/foundation/read/$runId', params: { runId } })

  const mutation = useMutation({
    mutationFn: (request: DistillRequest) => requestDistill(request),
    meta: { errorToast: false },
    onMutate: () => setRefusal(null),
    onSuccess: (run) => {
      qc.setQueryData(distillRunKey(run.id), run)
      void qc.invalidateQueries({ queryKey: DISTILL_LIST_KEY })
      invalidateEntitlements(qc)
      void open(run.id)
    },
    onError: async (err) => {
      if (err instanceof ApiError && err.code === 'distill_in_progress') {
        const runs = await qc.fetchQuery({
          queryKey: DISTILL_LIST_KEY,
          queryFn: listDistillRuns,
        })
        const running = resumableRun(runs)
        if (running) void open(running.id)
        return
      }
      // The plan's refusal is the toast the rest of the app answers one with —
      // the message as the title, the plan's reason under it — written here
      // because this mutation opted out of the global one for everything else.
      if (err instanceof ApiError && err.code === 'entitlement_exceeded') {
        toast.error(err.message, { description: denialReason(err) })
      }
      setRefusal(refusalOf(err))
    },
  })

  return {
    request: mutation,
    refusal: mutation.isPending ? null : refusal,
  }
}

/** A round of gap answers. The page follows the child run it answers with. */
export function useAnswerDistill(runId: string) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const carryReview = useBrandDistillStore((s) => s.carryReview)
  return useMutation({
    mutationFn: (answers: DistillAnswer[]) => answerDistill(runId, answers),
    onSuccess: (child) => {
      carryReview(runId, child.id)
      qc.setQueryData(distillRunKey(child.id), child)
      void qc.invalidateQueries({ queryKey: distillRunKey(runId) })
      void qc.invalidateQueries({ queryKey: DISTILL_LIST_KEY })
      void navigate({
        to: '/foundation/read/$runId',
        params: { runId: child.id },
        replace: true,
      })
    },
  })
}

/** Saving what was kept. Swaps the brand in behind it. */
export function useCommitDistill(runId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commit: DistillCommit) => commitDistill(runId, commit),
    onSuccess: () => {
      refreshAfterCommit(qc, runId)
    },
  })
}

function refreshAfterCommit(qc: QueryClient, runId: string) {
  void qc.invalidateQueries({ queryKey: BRAND_KEY })
  void qc.invalidateQueries({ queryKey: distillRunKey(runId) })
  void qc.invalidateQueries({ queryKey: DISTILL_LIST_KEY })
}

export function useDiscardDistill(runId: string) {
  const qc = useQueryClient()
  const forgetReview = useBrandDistillStore((s) => s.forgetReview)
  return useMutation({
    mutationFn: () => discardDistill(runId),
    onSuccess: () => {
      forgetReview(runId)
      void qc.invalidateQueries({ queryKey: distillRunKey(runId) })
      void qc.invalidateQueries({ queryKey: DISTILL_LIST_KEY })
      // A run that never reached the model gives its read back.
      invalidateEntitlements(qc)
    },
  })
}
