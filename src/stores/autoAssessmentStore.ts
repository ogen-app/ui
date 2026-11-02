import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { QualityTrigger } from '@/types/quality'

/**
 * The automatic assessments running right now, by post (CON-438).
 *
 * The server scores a post on its own at lifecycle checkpoints — marked
 * ready, a version saved, scheduled, published — and says so on the post's
 * topic: `assessment.started`, then `assessment.completed` or
 * `assessment.failed`. Nobody in this tab started the run, so there is no
 * stream to watch; this is the only record that one is going.
 *
 * Session state, not server state — nothing here is fetched, and the score
 * itself still lands through the query cache when `completed` invalidates it.
 *
 * The stream is at-most-once, so a `started` can lose its ending. Two things
 * keep that from leaving a spinner up for good: a run is forgotten after
 * `AUTO_RUN_TTL_MS`, and a reconnect forgets them all (`clearAll`), since the
 * gap it covers may have held the ending.
 */

/**
 * Comfortably past a slow run: one model call per dimension with a retry is
 * well under two minutes, and a run that has not reported by then is one we
 * missed the end of.
 */
export const AUTO_RUN_TTL_MS = 3 * 60_000

type AutoRun = { trigger: QualityTrigger; startedAt: number }

type AutoAssessmentState = {
  runs: Record<string, AutoRun>
}

export const useAutoAssessmentStore = create<AutoAssessmentState>()(
  devtools(() => ({ runs: {} }), { name: 'autoAssessment' }),
)

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function clearTimer(postId: string): void {
  const timer = timers.get(postId)
  if (timer) clearTimeout(timer)
  timers.delete(postId)
}

export function autoAssessmentStarted(
  postId: string,
  trigger: QualityTrigger,
): void {
  clearTimer(postId)
  timers.set(
    postId,
    setTimeout(() => autoAssessmentEnded(postId), AUTO_RUN_TTL_MS),
  )
  useAutoAssessmentStore.setState((s) => ({
    runs: { ...s.runs, [postId]: { trigger, startedAt: Date.now() } },
  }))
}

export function autoAssessmentEnded(postId: string): void {
  clearTimer(postId)
  if (!(postId in useAutoAssessmentStore.getState().runs)) return
  useAutoAssessmentStore.setState((s) => {
    const runs = { ...s.runs }
    delete runs[postId]
    return { runs }
  })
}

export function clearAutoAssessments(): void {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
  useAutoAssessmentStore.setState({ runs: {} })
}

/** The automatic run in progress on this post, if there is one. */
export function useAutoAssessment(postId: string): AutoRun | undefined {
  return useAutoAssessmentStore((s) => s.runs[postId])
}
