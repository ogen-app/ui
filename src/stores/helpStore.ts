import { create } from 'zustand'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * What the help panel is reading (CON-173).
 *
 * Whether help is *showing* is not here: help is a right-rail panel, the
 * floor that the top bar's Support button shares with the assistant, so it
 * is open when `selectActivePanel` says `'help'` and nowhere else. What lives
 * here is the trail — about this visit only, so nothing is persisted.
 */

type HelpState = {
  /**
   * Where the reader has been, oldest first. The last entry is what shows; an
   * empty trail is the help home, the article list.
   *
   * A stack rather than a single key because following a cross-link and coming
   * back is the ordinary way to read help — and because the app's own router
   * must stay out of it. Browsing help is not navigating the app, and a Back
   * button that sometimes leaves the screen you are being helped with would be
   * its own bug.
   */
  history: string[]

  /** Open one article in the rail — a contextual trigger, or a deep link. */
  open: (articleKey: string) => void
  /** Follow a link inside the panel. */
  push: (articleKey: string) => void
  back: () => void
  /** Back to the article list. */
  home: () => void
}

export const useHelpStore = create<HelpState>()((set, get) => ({
  history: [],

  // Opening from a trigger starts a fresh trail: the reader asked about
  // *this*, and inheriting where they were last time would put a Back button in
  // front of an article they have no memory of.
  open: (articleKey) => {
    set({ history: [articleKey] })
    useSettingsStore.getState().openRightPanel('help')
  },

  push: (articleKey) => {
    const { history } = get()
    if (history[history.length - 1] === articleKey) return
    set({ history: [...history, articleKey] })
  },

  // Back from the first article lands on the list, which is where an article
  // opened from the list came from — and the obvious next place for one opened
  // from a trigger.
  back: () => set({ history: get().history.slice(0, -1) }),

  home: () => set({ history: [] }),
}))

/** The article on screen, or null on the help home. */
export const selectCurrentArticle = (state: HelpState): string | null =>
  state.history[state.history.length - 1] ?? null

/** What Back would return to — the breadcrumb names it rather than pointing. */
export const selectPreviousArticle = (state: HelpState): string | null =>
  state.history.length > 1 ? state.history[state.history.length - 2] : null
