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
