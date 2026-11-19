import { create } from 'zustand'
import type { HelpPage } from '@/lib/helpTopics'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * What the help panel is reading (CON-173).
 *
 * Whether help is *showing* is not here: help is a right-rail panel, so that
 * is `settingsStore.helpOpen`, read through `selectActivePanel`. This holds
 * the reading — the trail of articles followed in this visit — and the screen
 * on view, and none of it is persisted: a trail from last week would put a
 * Back button in front of an article nobody remembers opening.
 */

type HelpState = {
  /**
   * Where the reader has been, oldest first. The last entry is what shows, and
   * an empty trail is a screen nobody has written help for yet.
   *
   * A stack rather than a single key because following a cross-link and coming
   * back is the ordinary way to read help — and because the app's own router
   * must stay out of it. Browsing help is not navigating the app, and a Back
   * button that sometimes leaves the screen you are being helped with would be
   * its own bug.
   */
  history: string[]
  /**
   * The screen on view, as its route declares it (`staticData.help`). Written
   * by the router subscription in `main.tsx` and nothing else.
   */
  page: HelpPage | null

  /**
   * Show `articleKey` in the rail, on a fresh trail: the reader asked about
   * *this*, and inheriting where they were last time would put a Back button
   * in front of an article they have no memory of. `null` opens the panel on
   * a screen with nothing written for it, which says so.
   */
  open: (articleKey: string | null) => void
  /** Follow a link inside the panel. */
  push: (articleKey: string) => void
  back: () => void
  /** Replace the trail without touching the rail — the panel following the page. */
  follow: (articleKey: string | null) => void
  setPage: (page: HelpPage | null) => void
}

export const useHelpStore = create<HelpState>()((set, get) => ({
  history: [],
  page: null,

  open: (articleKey) => {
    set({ history: articleKey ? [articleKey] : [] })
    useSettingsStore.getState().openRightPanel('help')
  },

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

  follow: (articleKey) => set({ history: articleKey ? [articleKey] : [] }),

  setPage: (page) => set({ page }),
}))

/** The article on screen, or null when there is none for this screen. */
export const selectCurrentArticle = (state: HelpState): string | null =>
  state.history[state.history.length - 1] ?? null

/** What Back would return to — the trail names it rather than pointing. */
export const selectPreviousArticle = (state: HelpState): string | null =>
  state.history.length > 1 ? state.history[state.history.length - 2] : null
