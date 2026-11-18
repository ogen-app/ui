import { create } from 'zustand'

/**
 * Scores the server reported for posts since this tab opened (CON-511): what
 * `assessment.completed` carries as `overallPct`, by post. A draft the
 * assistant writes is scored about 30 seconds later, after its result card has
 * been drawn without one, so the card reads the score here when it lands.
 *
 * Session state and a hint, like the stream it comes from: the score itself
 * is the post's, and the editor still reads it from the post. Nothing here is
 * fetched, and a reload starts empty.
 */
type FreshScores = { scores: Record<string, number> }

export const useFreshScoreStore = create<FreshScores>()(() => ({
  scores: {},
}))

export function noteFreshScore(postId: string, pct: number): void {
  useFreshScoreStore.setState((s) => ({
    scores: { ...s.scores, [postId]: pct },
  }))
}

/** The score a post was given since this tab opened, if one arrived. */
export function useFreshScore(postId: string): number | undefined {
  return useFreshScoreStore((s) => s.scores[postId])
}
