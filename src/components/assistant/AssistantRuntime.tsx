import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { postKey } from '@/hooks/usePost'
import { threadKey } from '@/assistant/agents'
import { useAssistantStore, type AssistantCompletionHandler } from '@/stores/assistantStore'

/**
 * Bridges the React/query-free assistant store to TanStack Query. Mount once
 * inside the authenticated layout so it lives for the whole session — assistant
 * turns keep streaming in the store even when no panel/editor is mounted, and
 * this is the single place that applies a completed edit.
 *
 * On an `edited` completion the backend has already persisted the new content,
 * so we invalidate the post query (refetch into cache) and only THEN bump the
 * thread's `contentRevision`. The post route watches that revision to remount its
 * editor; ordering the refetch first guarantees the editor re-reads fresh
 * content rather than the stale pre-edit version.
 */
export function AssistantRuntime() {
  const qc = useQueryClient()

  useEffect(() => {
    const { setCompletionHandler, markContentApplied } = useAssistantStore.getState()

    const handler: AssistantCompletionHandler = (ref, result) => {
      if (result.action !== 'edited') return
      if (ref.kind === 'post' && ref.targetId) {
        const key = threadKey(ref)
        qc.invalidateQueries({ queryKey: postKey(ref.targetId) }).finally(() => {
          markContentApplied(key)
        })
      }
    }

    setCompletionHandler(handler)
    return () => setCompletionHandler(null)
  }, [qc])

  return null
}
