/**
 * An idea's fit score (CON-385): how well it fits the reading it came from,
 * 10 (low potential) to 100 (high), or `null` when it was never scored — a
 * person's own idea, or one from a reading made before the score existed.
 *
 * The server owns the score and the rubric behind it; this file only orders
 * by it and places it on a track.
 */

export const FIT_MIN = 10
export const FIT_MAX = 100

type Scored = { id: string; created_at: string; fit_score?: number | null }

/**
 * Best fit first; unscored after every scored idea, because no score is not a
 * low one; then oldest first, then by id. The same order the server uses to
 * pick an asset's `next_idea`, so the card continues the row rather than
 * re-ranking it.
 */
export function byFit(a: Scored, b: Scored): number {
  const fa = a.fit_score ?? null
  const fb = b.fit_score ?? null
  if (fa !== fb) {
    if (fa === null) return 1
    if (fb === null) return -1
    return fb - fa
  }
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * Where a score sits on a track drawn strong-at-the-left: 0 at the left edge
 * (100), 1 at the right (10). Out-of-range values are clamped rather than
 * trusted to draw off the track.
 */
export function fitPlace(score: number): number {
  const clamped = Math.min(FIT_MAX, Math.max(FIT_MIN, score))
  return (FIT_MAX - clamped) / (FIT_MAX - FIT_MIN)
}
