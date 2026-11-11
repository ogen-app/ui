import type { GroundingSource } from '@/types/assistant'
import type { GroundingMode } from '@/types/posts'

/**
 * Whether a post or idea is marked as written from general knowledge
 * (CON-448/469). Only `exploratory` is: `grounded` is what generation should
 * be, and `null` — nothing generated it — is unknown, never ungrounded.
 *
 * One predicate because more than the mark asks it: the calendar budgets a
 * card's first row for it, so the grids and the card must agree.
 */
export function isNotGrounded(mode: GroundingMode | null | undefined): boolean {
  return mode === 'exploratory'
}

/**
 * Each asset once, in the order first cited: one asset reached through two
 * ideas is still one source. Untitled entries are left out — a name is all
 * the line shows.
 */
export function groundingAssets(sources: GroundingSource[]): GroundingSource[] {
  const seen = new Set<string>()
  return sources.filter((s) => {
    const key = s.id || s.title
    if (!s.title || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
