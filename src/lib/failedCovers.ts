import { useSyncExternalStore } from 'react'

/**
 * The calendar covers that would not load, shared by the card that drops one
 * and the grid that budgets its height.
 *
 * A card that loses its cover draws no image band, so the column's rung ladder
 * must stop charging it the band too — otherwise a day is squeezed onto a
 * tighter rung for a picture nobody sees. Both read this one set so they
 * cannot disagree. Keyed by URL, not by post: a cover is a presigned GET, the
 * likely failure is expiry, and the list's next refetch signs a different URL
 * — which is not in here, so the picture and its band come back together.
 *
 * Module scope because it is a fact about URLs the browser tried, not about a
 * screen; it is cleared by a reload, which is when the URLs are re-signed
 * anyway.
 */
let failed: ReadonlySet<string> = new Set()
const listeners = new Set<() => void>()

/** Records a cover that errored. A URL already recorded changes nothing. */
export function markCoverFailed(url: string) {
  if (failed.has(url)) return
  failed = new Set(failed).add(url)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * The failed set, re-rendering the caller when it grows. A new set each time,
 * so it can stand in a memo's dependency list.
 */
export function useFailedCovers(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribe,
    () => failed,
    () => failed,
  )
}

/**
 * Whether a cover will be drawn: present, non-empty and not known to fail.
 * Truthiness, as the card decides — a present-but-empty URL draws nothing.
 */
export function coverDrawable(
  url: string | undefined,
  failedCovers: ReadonlySet<string>,
): boolean {
  return url ? !failedCovers.has(url) : false
}

/** Test-only: forgets every failure. */
export function resetFailedCovers() {
  failed = new Set()
  for (const listener of listeners) listener()
}
