import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { EMPTY_REVIEW, type DistillReview } from '@/lib/brandDistill'
import type { DistillCommitResult } from '@/types/brandDistill'

/**
 * The half of a brand read (CON-400) that is the user's and not yet the
 * server's: what they have kept, dropped and rewritten in a review, and the
 * receipt of the last save.
 *
 * **In `sessionStorage`, never `localStorage`.** A review is somebody working
 * through one proposal in one tab — a reload must not lose twenty decisions,
 * but another tab opening the same run is another person's pass at it, and
 * handing it the first tab's half-finished drops would be one person's review
 * silently becoming another's. The run itself resumes in any tab, from the
 * server (`GET /api/brand/distills`); only the decisions stay put.
 *
 * Not server state: nothing here was fetched, and the commit is the first and
 * only moment any of it leaves the tab.
 */

/** What the hub says once, after a save, and then never again. */
export type SavedReceipt = {
  runId: string
  result: DistillCommitResult
  /** Where it was read from, as the run named it — `acme-roasters.com`. */
  source: { route: 'website' | 'document' | 'questions'; label: string }
}

type BrandDistillState = {
  reviews: Record<string, DistillReview>
  /** Gap-question cards closed, by run. */
  closedQuestions: string[]
  saved: SavedReceipt | null
  updateReview: (
    runId: string,
    update: (review: DistillReview) => DistillReview,
  ) => void
  /**
   * Hands a review to the run that superseded it. Decisions travel by
   * `proposalId`, so the child reads them as they are — see `lib/brandDistill`.
   */
  carryReview: (fromRunId: string, toRunId: string) => void
  forgetReview: (runId: string) => void
  closeQuestions: (runId: string) => void
  openQuestions: (runId: string) => void
  setSaved: (receipt: SavedReceipt | null) => void
}

export const useBrandDistillStore = create<BrandDistillState>()(
  persist(
    (set) => ({
      reviews: {},
      closedQuestions: [],
      saved: null,
      updateReview: (runId, update) =>
        set((state) => ({
          reviews: {
            ...state.reviews,
            [runId]: update(state.reviews[runId] ?? EMPTY_REVIEW),
          },
        })),
      carryReview: (fromRunId, toRunId) =>
        set((state) => {
          const from = state.reviews[fromRunId]
          if (!from || state.reviews[toRunId]) return state
          return { reviews: { ...state.reviews, [toRunId]: from } }
        }),
      forgetReview: (runId) =>
        set((state) => {
          const { [runId]: _forgotten, ...rest } = state.reviews
          return { reviews: rest }
        }),
      closeQuestions: (runId) =>
        set((state) => ({
          closedQuestions: [...state.closedQuestions, runId],
        })),
      openQuestions: (runId) =>
        set((state) => ({
          closedQuestions: state.closedQuestions.filter((id) => id !== runId),
        })),
      setSaved: (saved) => set({ saved }),
    }),
    {
      name: 'brand-distill',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)

/** One run's review, or the untouched one. */
export function useDistillReview(runId: string): DistillReview {
  return useBrandDistillStore((s) => s.reviews[runId] ?? EMPTY_REVIEW)
}
