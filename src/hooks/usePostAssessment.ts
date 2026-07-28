import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  QualityUnavailableError,
  getPostAssessment,
  streamPostAssessment,
} from '@/services/api/quality'
import type { PostEvaluation } from '@/types/quality'

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
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [postId])

  const assess = useCallback(() => {
    if (abortRef.current) return
    const controller = new AbortController()
    abortRef.current = controller

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
          }
        } else {
          terminal = true
          setAssessError(event.message)
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
        setAssessError(error instanceof Error ? error.message : 'The assessment failed')
      })
      .finally(() => {
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

  const loadUnavailable = query.error instanceof QualityUnavailableError

  return {
    assessment: query.data,
    loading: query.isPending,
    unavailable: loadUnavailable || unavailableFromRun,
    loadError:
      query.error && !loadUnavailable
        ? query.error.message || 'Unable to load the assessment'
        : null,
    reload,
    assess,
    assessing,
    steps,
    cached,
    assessError,
  }
}
