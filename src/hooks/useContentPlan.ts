import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { streamDraftPlan } from '@/services/api/contentPlan'
import { campaignPostsKey } from '@/hooks/usePosts'

export type GenerationState =
  | { status: 'idle' }
  | { status: 'running'; step: string | null; postCount: number }
  | { status: 'done'; postCount: number; warnings: string[] }
  | { status: 'error'; message: string }

/**
 * Drives AI draft-plan generation for a campaign over the backend's SSE
 * stream. Draft posts are persisted server-side before each `post` event, so
 * the campaign posts query is invalidated as they arrive — the list/calendar
 * fills in live while the stream runs. The stream is aborted on unmount, so
 * keep the owning component mounted for the duration (e.g. the campaign
 * layout, which survives tab switches).
 */
export function useGenerateContentPlan(campaignId: string) {
  const qc = useQueryClient()
  const [state, setState] = useState<GenerationState>({ status: 'idle' })
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const generate = useCallback(() => {
    if (abortRef.current) return // already running
    const controller = new AbortController()
    abortRef.current = controller
    setState({ status: 'running', step: null, postCount: 0 })

    const refreshPosts = () =>
      qc.invalidateQueries({ queryKey: campaignPostsKey(campaignId) })

    let postCount = 0
    const warnings: string[] = []
    streamDraftPlan(
      campaignId,
      {
        onStep: ({ step }) => {
          setState({ status: 'running', step, postCount })
        },
        onPost: () => {
          postCount += 1
          setState({ status: 'running', step: null, postCount })
          refreshPosts()
        },
        onWarning: ({ message }) => {
          warnings.push(message)
          refreshPosts()
        },
        onComplete: () => {
          setState({ status: 'done', postCount, warnings })
        },
      },
      controller.signal,
    )
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Generation failed',
        })
      })
      .finally(() => {
        abortRef.current = null
        // Posts that streamed in before a failure are already persisted.
        refreshPosts()
      })
  }, [campaignId, qc])

  return { state, generate }
}
