/**
 * The runs *this tab* started and is still streaming.
 *
 * Every AI flow reports twice: down the POST stream the caller is already
 * rendering, and again over the broadcast hub. For the tab that started it the
 * hub copy is not news — it is a second, later account of something already
 * handled, and acting on it would refetch a post whose cache the running flow
 * is still writing.
 *
 * So the hub consumer ignores events for runs listed here. What is left is
 * exactly what the hub is for: runs started somewhere else — another tab,
 * another device, a teammate.
 *
 * Module scope, not a store: a run outlives the component that started it
 * (see `assistantStore`), and nothing renders from this.
 */
const active = new Set<string>()

export type LocalRunScope = 'assistant' | 'assessment' | 'contentPlan'

/** The key a scope+subject pair is tracked under. Also used by event routing. */
export function localRunKey(scope: LocalRunScope, subjectId: string): string {
  return `${scope}:${subjectId}`
}

/**
 * Marks a run as owned here. Returns the disposer — call it in the `finally`
 * of the run, so an abort or a throw can't leave the key stuck and silently
 * deafen this tab to that subject for the rest of the session.
 */
export function beginLocalRun(scope: LocalRunScope, subjectId: string): () => void {
  const key = localRunKey(scope, subjectId)
  active.add(key)
  return () => {
    active.delete(key)
  }
}

export function isLocalRun(key: string): boolean {
  return active.has(key)
}
