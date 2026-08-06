import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  QualityUnavailableError,
  getPostAssessment,
  streamPostAssessment,
} from '@/services/api/quality'
import { beginLocalRun } from '@/lib/localRuns'
import { toast } from '@/stores/toastStore'
import type { PostEvaluation } from '@/types/quality'

/**
 * Why a run failed goes to a toast rather than into the panel: the reason is
 * a server message ("usage limit reached", "the model returned an unparseable
 * response") that the panel has nothing useful to do with, and printing it
 * mid-rail buries the one thing the user can act on — the button. The panel
 * says something broke and offers the retry; this says what broke, once.
 */
function reportFailure(message: string): void {
  toast.error("The assessment didn't finish", { description: message })
}

/**
 * Its own namespace rather than `['post', id, 'assessment']` on purpose: the
 * editor invalidates `['post', id]` on every autosave, and prefix matching
 * would drag the assessment along with it — refetching a scored result once
 * per keystroke pause. The assessment only changes when a run finishes, and a
 * run writes the cache itself.
 */
export const postAssessmentKey = (postId: string) => ['postAssessment', postId] as const

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
  /** Stages completed so far in the running assessment, in arrival order. */
  steps: string[]
  /** The last run returned the stored result without calling the model. */
  cached: boolean
  assessError: string | null
}

/**
 * The Post quality assessment (CON-85): the stored result, and the trigger
 * for a fresh one.
 *
 * The run is a stream rather than a mutation — it reports six stages over SSE
 * and takes long enough that showing them matters. It writes its result
 * straight into the query cache, because the flow persists before it emits
 * `complete`: what arrives *is* the stored assessment, so refetching to
 * confirm would only cost a round trip.
 */
export function usePostAssessment(postId: string): UsePostAssessmentResult {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: postAssessmentKey(postId),
    queryFn: () => getPostAssessment(postId),
    enabled: !!postId,
    // Both are settled facts about the deployment, not transient failures.
    retry: (count, error) => !(error instanceof QualityUnavailableError) && count < 2,
  })

  const [assessing, setAssessing] = useState(false)
  const [steps, setSteps] = useState<string[]>([])
  const [cached, setCached] = useState(false)
  const [assessError, setAssessError] = useState<string | null>(null)
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
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [postId])

  // The panel says a load failed; this says why, once. Keyed on the message
  // so TanStack's retries and every re-render after them stay silent — only a
  // genuinely new failure raises a second toast.
  const loadFailure =
    query.error && !(query.error instanceof QualityUnavailableError)
      ? query.error.message || 'Unable to load the assessment'
      : null
  useEffect(() => {
    if (loadFailure) {
      toast.error("Couldn't load the assessment", { description: loadFailure })
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
            qc.setQueryData(postAssessmentKey(postId), event.evaluation)
          } else {
            // `complete` without a readable evaluation is a malformed payload,
            // not "nothing stored" — the flow persists before it emits
            // `complete`. Don't write null over a real score; go look instead.
            void qc.invalidateQueries({ queryKey: postAssessmentKey(postId) })
          }
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
        const message = error instanceof Error ? error.message : 'The assessment failed'
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
    assessment: query.data,
    loading: query.isPending,
    unavailable: query.error instanceof QualityUnavailableError || unavailableFromRun,
    loadError: loadFailure,
    reload,
    assess,
    assessing,
    steps,
    cached,
    assessError,
  }
}
