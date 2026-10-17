import { cn } from '@/lib'
import type { VerdictKey } from '@/lib/assetList'
import { isWaiting, type Idea } from '@/lib/ideas'

/** Which pile an idea sits in today: a postponed one whose day has come is a question again. */
export function pileOf(idea: Idea, now: Date): VerdictKey {
  return isWaiting(idea, now) ? 'waiting' : (idea.verdict ?? 'waiting')
}

/**
 * The row's chrome: no box, a pale rule between rows, inset by the row's
 * padding, stepping aside for a row that is hovered or open, which take one
 * pale fill. What tells the opened row from a hovered one is its title turning
 * semibold.
 */
export const IDEA_ROW = cn(
  'relative rounded-md transition-colors',
  "before:absolute before:inset-x-3 before:top-0 before:border-t before:border-quaternary before:content-[''] first:before:hidden",
  'hover:bg-secondary hover:before:opacity-0 [li:hover+&]:before:opacity-0',
  'data-[open]:bg-secondary data-[open]:before:opacity-0 [li[data-open]+&]:before:opacity-0',
)
