import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * The help drawer's own state (CON-173).
 *
 * Separate from `settingsStore` on purpose: almost everything here is about
 * *this* visit — what is open, what you read before it — and only the width
 * outlives the session. Persisting the rest would reopen the drawer on every
 * page load.
 *
 * Deliberately **not** part of the right rail's `panelMemory`. The drawer is
 * not a panel: it sits above the app rather than beside it, it never takes the
 * assistant's place, and navigating does not close it.
 */

/**
 * Narrower than a phone is useless; wider than this covers the work.
 *
 * The default is deliberately wider than the right rail's 480px (`w-120` in
 * `RightSidebar`): the rail holds controls, this holds prose, and a column of
 * running text wants more room than a column of switches.
 */
export const HELP_MIN_WIDTH = 320
export const HELP_MAX_WIDTH = 880
export const HELP_DEFAULT_WIDTH = 560

export const clampHelpWidth = (px: number): number =>
  Math.min(HELP_MAX_WIDTH, Math.max(HELP_MIN_WIDTH, Math.round(px)))

type HelpState = {
  isOpen: boolean
  /**
   * Where the reader has been, oldest first. The last entry is what shows.
   *
   * A stack rather than a single key because following a cross-link and coming
   * back is the ordinary way to read help — and because the app's own router
   * must stay out of it. Browsing help is not navigating the app, and a Back
   * button that sometimes leaves the screen you are being helped with would be
   * its own bug.
   */
  history: string[]
  width: number

  open: (articleKey: string) => void
  close: () => void
  /** Follow a link inside the drawer. */
  push: (articleKey: string) => void
  back: () => void
  setWidth: (px: number) => void
}

export const useHelpStore = create<HelpState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      history: [],
      width: HELP_DEFAULT_WIDTH,

      // Opening from a trigger starts a fresh trail: the reader asked about
      // *this*, and inheriting where they were last time would put a Back
      // button in front of an article they have no memory of.
      open: (articleKey) => set({ isOpen: true, history: [articleKey] }),

      close: () => set({ isOpen: false }),

      push: (articleKey) => {
        const { history } = get()
        if (history[history.length - 1] === articleKey) return
        set({ history: [...history, articleKey] })
      },

      back: () => {
        const { history } = get()
        if (history.length < 2) return
        set({ history: history.slice(0, -1) })
      },

      setWidth: (px) => set({ width: clampHelpWidth(px) }),
    }),
    {
      name: 'ogen.help',
      // Bumped when the default width changed: a stored width always wins over
      // a new default, so without this the people who have already opened the
      // drawer would be the only ones who never see the width it now ships at.
      version: 2,
      migrate: () => ({ width: HELP_DEFAULT_WIDTH }),
      // Width only. It is display state for this device — the same rule that
      // keeps `dismissedNotes` out of the workspace-wide `/api/settings`.
      partialize: (state) => ({ width: state.width }),
      merge: (persisted, current) => ({
        ...current,
        // A width from an older build, or a hand-edited localStorage entry,
        // must not be able to produce a drawer nobody can resize back.
        width: clampHelpWidth(
          (persisted as { width?: number })?.width ?? HELP_DEFAULT_WIDTH,
        ),
      }),
    },
  ),
)

/** The article on screen, or null when the drawer is empty. */
export const selectCurrentArticle = (state: HelpState): string | null =>
  state.history[state.history.length - 1] ?? null

/** Whether Back has anywhere to go. */
export const selectCanGoBack = (state: HelpState): boolean =>
  state.history.length > 1

/** What Back would return to — the breadcrumb names it rather than pointing. */
export const selectPreviousArticle = (state: HelpState): string | null =>
  state.history.length > 1 ? state.history[state.history.length - 2] : null
