import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import i18next from 'i18next'
import {
  QualityUnavailableError,
  getPostAssessment,
  streamPostAssessment,
} from '@/services/api/quality'
import { beginLocalRun } from '@/lib/localRuns'
import { runsLeft } from '@/lib/postQuality'
import { toast } from '@/stores/toastStore'
import { useAutoAssessment } from '@/stores/autoAssessmentStore'
import type { PostEvaluation, QualityTrigger } from '@/types/quality'

/**
 * Why a run failed goes to a toast rather than into the panel: the reason is
 * a server message ("the model returned an unparseable response") that the
 * panel has nothing useful to do with, and printing it mid-rail buries the
 * one thing the user can act on — the button. The panel says something broke
 * and offers the retry; this says what broke, once.
 */
function reportFailure(message: string): void {
  toast.error(i18next.t('posts.quality.runFailed'), { description: message })
}

/**
 * The post's allowance is used up (CON-438). Worded like every other plan
 * refusal — what was refused as the title, the plan's reason under it
 * (`denialReason`) — and with our sentence rather than the server's, which is
 * a machine string (`entitlement_exceeded: quality_reviews_per_post …`).
 */
function reportLimit(limit: number | null): void {
  toast.error(i18next.t('posts.quality.runs.limitTitle'), {
    description:
      limit === null
        ? i18next.t('tiers.deniedLimitFlat')
        : i18next.t('tiers.deniedLimit', { count: limit }),
  })
}

/**
 * Its own namespace rather than `['post', id, 'assessment']` on purpose: the
 * editor invalidates `['post', id]` on every autosave, and prefix matching
 * would drag the assessment along with it — refetching a scored result once
 * per keystroke pause. The assessment changes when a run finishes, and when
 * the post first moves away from what was scored (see the staleness effect
 * below), and nothing else needs it read again.
 */
export const postAssessmentKey = (postId: string) =>
  ['postAssessment', postId] as const

type UsePostAssessmentResult = {
  /** The stored assessment, or `null` when the post has never been scored. */
  assessment: PostEvaluation | null | undefined
  loading: boolean
  /** The flow isn't wired on this backend — nothing to retry. */
  unavailable: boolean
  /** A real failure to load the stored result, worth a retry. */
  loadError: string | null
  reload: () => void

  /** Starts a fresh run. A no-op while one is already streaming. */
  assess: () => void
  assessing: boolean
  /**
   * The server is scoring this post on its own, at a lifecycle checkpoint
   * (CON-438) — what started it, while it runs.
   */
  autoAssessing: QualityTrigger | null
  /** Stages completed so far in the running assessment, in arrival order. */
  steps: string[]
  /** The last run returned the stored result without calling the model. */
  cached: boolean
  assessError: string | null
  /**
   * The post's run allowance is used up: the read says so, or the last run
   * was refused with a 402. Nothing to retry until the plan changes.
   */
  exhausted: boolean
  /**
   * The assessment a newer run replaced while this post was open, for the
   * radar's "before your edits" outline and the per-dimension changes
   * (CON-440). Manual or automatic, whichever landed. Memory only: the server
   * keeps one evaluation per post, so after a reload there is nothing to
   * compare against and the comparison simply isn't drawn.
   */
  previous: PostEvaluation | null
}

/**
 * The Post quality assessment (CON-85): the stored result, and the trigger
 * for a fresh one.
 *
 * The run is a stream rather than a mutation — it reports six stages over SSE
 * and takes long enough that showing them matters. It writes its result
 * straight into the query cache, because the flow persists before it emits
 * `complete`: what arrives *is* the stored assessment, so the only thing a
 * refetch adds is what the read endpoint knows on top — the allowance.
 *
 * `postUpdatedAt` is the live post's, and is what makes the server's `stale`
 * flag hold up while the user types: see the effect that reads it.
 */
export function usePostAssessment(
  postId: string,
  postUpdatedAt?: string,
): UsePostAssessmentResult {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: postAssessmentKey(postId),
    queryFn: () => getPostAssessment(postId),
    enabled: !!postId,
    // Both are settled facts about the deployment, not transient failures.
    retry: (count, error) =>
      !(error instanceof QualityUnavailableError) && count < 2,
  })
  const autoRun = useAutoAssessment(postId)

  const [assessing, setAssessing] = useState(false)
  const [steps, setSteps] = useState<string[]>([])
  const [cached, setCached] = useState(false)
  const [assessError, setAssessError] = useState<string | null>(null)
  const [refused, setRefused] = useState(false)
  const [unavailableFromRun, setUnavailableFromRun] = useState(false)

  // A run outlives the panel being closed (the sidebar keeps panels mounted),
  // but not the post: leaving the editor abandons the stream, and its late
  // events must not write another post's cache entry.
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => {
    // Run-local state belongs to one post's run: the sidebar keeps this hook
    // mounted across post switches, so post A's steps, error and cached badge
    // must not show under post B. `unavailableFromRun` deliberately survives —
    // a 503 is a fact about the deployment, not about the post.
    setSteps([])
    setCached(false)
    setAssessError(null)
    setRefused(false)
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [postId])

  // The server's `stale` is true as of the read, and the read is not repeated
  // per autosave (see `postAssessmentKey`). So the first save after a current
  // score asks again — the one edit that can turn "current" into "outdated".
  // Once the read says stale, later edits can't make it more so, and the
  // query is left alone until a run lands.
  //
  // Not held back while a run streams: a save that lands mid-run would be
  // dropped for good — nothing re-runs this effect when the run ends — and
  // the run's own result, current as of the text it read, would then sit
  // over the edit as "current". Invalidating mid-run is harmless; `complete`
  // writes over whatever the refetch brought.
  const data = query.data
  const scoredCurrent = !!data && !data.stale
  const seenUpdatedAt = useRef(postUpdatedAt)
  useEffect(() => {
    if (postUpdatedAt === seenUpdatedAt.current) return
    seenUpdatedAt.current = postUpdatedAt
    if (scoredCurrent) {
      void qc.invalidateQueries({ queryKey: postAssessmentKey(postId) })
    }
  }, [postUpdatedAt, scoredCurrent, postId, qc])

  // A refusal stands until the next read, which counts the runs itself — so
  // a plan upgrade (which refetches every assessment, `eventRouting`) gives
  // the button back rather than leaving it locked on an old 402.
  const { dataUpdatedAt } = query
  useEffect(() => {
    setRefused(false)
  }, [dataUpdatedAt])

  // A new run is a new `updated_at`; a refetch of the same score (staleness,
  // the allowance) is not, and a cached run hands back the same row. Kept as
  // state adjusted during render rather than in an effect, so the outline
  // arrives in the same render as the score it is compared with. Keyed by post
  // so a comparison never shows under another one — the sidebar keeps this
  // hook mounted across post switches.
  const [history, setHistory] = useState<{
    postId: string
    latest: PostEvaluation | null
    previous: PostEvaluation | null
  }>({ postId, latest: data ?? null, previous: null })
  if (history.postId !== postId) {
    setHistory({ postId, latest: data ?? null, previous: null })
  } else if (data && data.updated_at !== history.latest?.updated_at) {
    setHistory({ postId, latest: data, previous: history.latest })
  }

  // The panel says a load failed; this says why, once. Keyed on the message
  // so TanStack's retries and every re-render after them stay silent — only a
  // genuinely new failure raises a second toast.
  const loadFailure =
    query.error && !(query.error instanceof QualityUnavailableError)
      ? query.error.message || 'Unable to load the assessment'
      : null
  useEffect(() => {
    if (loadFailure) {
      toast.error(i18next.t('posts.quality.loadFailed'), {
        description: loadFailure,
      })
    }
  }, [loadFailure])

  const assess = useCallback(() => {
    if (abortRef.current) return
    const controller = new AbortController()
    abortRef.current = controller
    // This run writes the assessment cache itself; the hub's copy of the same
    // outcome would only refetch what we already have (CON-134).
    const endLocalRun = beginLocalRun('assessment', postId)

    setAssessing(true)
    setSteps([])
    setCached(false)
    setAssessError(null)
    setRefused(false)

    // Set when the stream reports its own outcome. Without one, the stream
    // was cut short — the run may still have persisted, so we go and look.
    let terminal = false

    streamPostAssessment(
      postId,
      (event) => {
        if (event.type === 'step') {
          setSteps((prev) => [...prev, event.step])
        } else if (event.type === 'complete') {
          terminal = true
          setCached(event.cached)
          if (event.evaluation) {
            // The run's copy is the bare evaluation: current by definition,
            // and silent about the allowance, which only the read reports. So
            // the cap is carried over from the read before, and the read is
            // asked again for the rest — a fingerprint check, no model call.
            const fresh = event.evaluation
            qc.setQueryData<PostEvaluation | null>(
              postAssessmentKey(postId),
              (prev) => ({
                ...fresh,
                stale: false,
                stale_reason: undefined,
                runs_limit: prev?.runs_limit ?? null,
              }),
            )
          }
          // Either way: `complete` without a readable evaluation is a
          // malformed payload, not "nothing stored" — the flow persists
          // before it emits `complete`. Don't write null over a real score.
          void qc.invalidateQueries({ queryKey: postAssessmentKey(postId) })
        } else if (event.code === 402) {
          terminal = true
          setRefused(true)
          reportLimit(
            qc.getQueryData<PostEvaluation | null>(postAssessmentKey(postId))
              ?.runs_limit ?? null,
          )
          // The read we hold under-counted, or the refusal would have come
          // from it. Ask for the real numbers, which take over from here.
          void qc.invalidateQueries({ queryKey: postAssessmentKey(postId) })
        } else {
          terminal = true
          setAssessError(event.message)
          reportFailure(event.message)
        }
      },
      controller.signal,
    )
      .then(() => {
        if (!terminal && !controller.signal.aborted) {
          void qc.invalidateQueries({ queryKey: postAssessmentKey(postId) })
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof QualityUnavailableError) {
          setUnavailableFromRun(true)
          return
        }
        const message =
          error instanceof Error ? error.message : 'The assessment failed'
        setAssessError(message)
        reportFailure(message)
      })
      .finally(() => {
        endLocalRun()
        if (abortRef.current === controller) abortRef.current = null
        // Unconditionally: an abort that came from switching posts rather
        // than unmounting leaves this hook alive, and a stuck `assessing`
        // would lock the button for good.
        setAssessing(false)
      })
  }, [postId, qc])

  const { refetch } = query
  const reload = useCallback(() => {
    setAssessError(null)
    void refetch()
  }, [refetch])

  return {
    assessment: data,
    loading: query.isPending,
    unavailable:
      query.error instanceof QualityUnavailableError || unavailableFromRun,
    loadError: loadFailure,
    reload,
    assess,
    assessing,
    // The manual run's own progress wins: it has steps to show, and the two
    // can only overlap when a checkpoint fires mid-run.
    autoAssessing: autoRun && !assessing ? autoRun.trigger : null,
    steps,
    cached,
    assessError,
    exhausted: refused || runsLeft(data)?.left === 0,
    previous: history.postId === postId ? history.previous : null,
  }
}
