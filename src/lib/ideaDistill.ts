import type { IdeaDistillRun } from '@/types/assetAnalysis'

/**
 * Asking a lens for more ideas (CON-397/398) — the rules the server enforces,
 * mirrored so the form can say no before a round trip does. The server is the
 * source of truth: these match `models/idea_distill.go`.
 */
export const DISTILL_MIN_COUNT = 3
export const DISTILL_MAX_COUNT = 10
export const DISTILL_DEFAULT_COUNT = 5
export const DISTILL_MAX_FOCUS = 300

/** Every count the form offers, in order. */
export const DISTILL_COUNTS: readonly number[] = Array.from(
  { length: DISTILL_MAX_COUNT - DISTILL_MIN_COUNT + 1 },
  (_, i) => DISTILL_MIN_COUNT + i,
)

/**
 * Whether a focus is too long to send. Counted in code points, as Go's
 * `utf8.RuneCountInString` counts it, so an emoji is one character here too.
 */
export function focusTooLong(focus: string): boolean {
  return focusLength(focus) > DISTILL_MAX_FOCUS
}

/** The focus's length as the server counts it — after trimming. */
export function focusLength(focus: string): number {
  return [...focus.trim()].length
}

/** Still waiting or running — the run that holds the button. */
export function isRunActive(run: IdeaDistillRun): boolean {
  return run.status === 'pending' || run.status === 'running'
}

/**
 * The run in flight, if there is one. The list is newest first and the server
 * allows one active run per lens, so it is the first active one.
 */
export function activeRun(
  runs: readonly IdeaDistillRun[],
): IdeaDistillRun | undefined {
  return runs.find(isRunActive)
}

/**
 * What a settled run has to say at the foot of the list.
 *
 * `landed` says nothing there — its ideas are the answer, and they are already
 * in the list. The other four each get a row: nothing new, a failure, the
 * month's runs used up, or a plan that does not include it.
 */
export type DistillOutcome = 'landed' | 'empty' | 'failed' | 'limit' | 'plan'

export function outcomeOf(run: IdeaDistillRun): DistillOutcome | null {
  switch (run.status) {
    case 'ready':
      return run.ideas_count > 0 ? 'landed' : 'empty'
    case 'failed':
      return 'failed'
    case 'skipped':
      // The two gates the server skips on; any other code is a failure to
      // state as one, not a limit to sell past.
      if (run.failure_code === 'entitlement_disabled') return 'plan'
      if (run.failure_code === 'limit_reached') return 'limit'
      return 'failed'
    default:
      return null
  }
}
