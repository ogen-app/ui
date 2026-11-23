import type { VerdictKey } from '@/lib/assetList'
import { isWaiting, type Idea } from '@/lib/ideas'

/** Which pile an idea sits in today: a postponed one whose day has come is a question again. */
export function pileOf(idea: Idea, now: Date): VerdictKey {
  return isWaiting(idea, now) ? 'waiting' : (idea.verdict ?? 'waiting')
}
