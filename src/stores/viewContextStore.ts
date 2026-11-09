import { create } from 'zustand'
import type { ViewLocation, ViewPage } from '@/lib/viewContext'

/**
 * What the assistant sees with the next turn (CON-450/451): where the user is,
 * and what the screen in front of them has selected, filtered or windowed.
 * Session state, never persisted — it describes the screen, and the screen is
 * gone on reload.
 *
 * The location is tracked once, from the router (`useViewLocation`). The page
 * is registered by the screen that owns it (`useAssistantPage`) — a list, a
 * dashboard — and only one owns it at a time: registering hands back a token,
 * and only the matching token can clear it, so a screen unmounting after its
 * successor mounted can't wipe the successor's selection.
 */
type ViewContextState = {
  location: ViewLocation
  page: ViewPage | null
  pageToken: number
  /**
   * The user dismissed the composer's context chip: the next turn goes out
   * with the screen only. Lifted again by the next change to the page, or by
   * that turn being sent.
   */
  dismissed: boolean
  setLocation: (location: ViewLocation) => void
  registerPage: (page: ViewPage) => number
  updatePage: (token: number, page: ViewPage) => void
  clearPage: (token: number) => void
  dismiss: () => void
  restore: () => void
}

let nextToken = 0

export const useViewContextStore = create<ViewContextState>()((set, get) => ({
  location: { screen: null },
  page: null,
  pageToken: 0,
  dismissed: false,

  // A new screen is a new thing for the chip to describe, so a dismissal
  // made on the last one lifts (`useViewLocation` sets this only when the
  // route changes).
  setLocation: (location) => set({ location, dismissed: false }),

  registerPage: (page) => {
    const token = ++nextToken
    set({ page, pageToken: token, dismissed: false })
    return token
  },

  updatePage: (token, page) => {
    if (get().pageToken !== token) return
    set({ page, dismissed: false })
  },

  clearPage: (token) => {
    if (get().pageToken !== token) return
    set({ page: null, pageToken: 0, dismissed: false })
  },

  dismiss: () => set({ dismissed: true }),
  restore: () => set({ dismissed: false }),
}))
