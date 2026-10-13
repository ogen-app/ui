import { useEffect, useState } from 'react'
import type { Idea } from '@/lib/ideas'

/** `setTimeout`'s ceiling; a reminder further out re-arms when this fires. */
const MAX_DELAY_MS = 2 ** 31 - 1

/**
 * "Now", for sorting ideas into piles (CON-370) — moved on exactly when the
 * next postponed idea comes due, rather than on a ticking interval.
 *
 * A "later" whose reminder has passed counts as waiting (`isWaiting`), so a
 * screen that stays open past that moment has to recount, even though the
 * ideas themselves have not changed. One timer for the earliest reminder still
 * ahead; it re-arms after each wake, and again whenever the ideas change.
 */
export function useIdeaClock(ideas: readonly Idea[]): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const from = now.getTime()
    let next = Infinity
    for (const idea of ideas) {
      if (idea.verdict !== 'later' || !idea.remindAt) continue
      const at = Date.parse(idea.remindAt)
      if (at > from && at < next) next = at
    }
    if (!Number.isFinite(next)) return
    // Against the wall clock, not `now`: the ideas may have arrived long after
    // `now` was taken, and a reminder already past should fire at once.
    const delay = Math.min(Math.max(0, next - Date.now()), MAX_DELAY_MS)
    const id = setTimeout(() => setNow(new Date()), delay)
    return () => clearTimeout(id)
  }, [ideas, now])

  return now
}
