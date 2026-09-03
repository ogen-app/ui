import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import { SETTINGS_STORE_PERSIST_KEY } from '@/stores/constants'
import {
  DEFAULT_PANEL_MEMORY,
  closePanel,
  openPanel,
  resolveActivePanel,
  sanitizePanelMemory,
  togglePanel,
  type PanelMemory,
  type PanelScope,
  type RightPanel,
} from '@/lib/rightPanel'
import {
  rememberVisit,
  sanitizePostsPlaces,
  type PostsPlace,
  type PostsView,
} from '@/lib/postsPlace'

/**
 * Local-only settings stored in localStorage
 * These settings are device/browser specific and do NOT sync across devices
 */
export type LocalSettings = {
  // UI State
  sidebarCollapsed: boolean

  /**
   * What the right sidebar should show *when it can* — one remembered choice
   * per screen, not a live "current panel". See `lib/rightPanel`; read it
   * through `selectActivePanel`, never directly.
   */
  panelMemory: PanelMemory

  // Modal/Dialog State
  lastOpenedModals: Record<string, string> // modal ID -> last opened timestamp

  /**
   * Ids of `<Explainer>` notes the user has closed for good. Device-local on
   * purpose: it is display noise, not data, and the shared `/api/settings`
   * table is the wrong home for it.
   */
  dismissedNotes: string[]

  /**
   * Campaign id -> where the user last was in that campaign's posts. See
   * `lib/postsPlace`; read it through `selectPostsPlace` / `selectCalendarPlace`
   * rather than the map directly.
   *
   * Unbounded, and it doesn't matter: an entry is three short strings and a
   * workspace has campaigns in the dozens. A deleted campaign leaves one
   * behind that nothing will ever ask for again.
   */
  postsPlace: Record<string, PostsPlace>
}

/**
 * Which screen is under the sidebar right now, declared by the route via
 * `usePanelScope` and cleared when it unmounts.
 *
 * Session-only, and pointedly not part of `LocalSettings`: it is a fact about
 * where you are, not a preference, and persisting it would let a reload restore
 * a screen context that no longer matches the URL.
 */
type PanelContext = {
  scope: PanelScope | null
  /**
   * The campaign you are in, for the panels that are about one. Sticky — it
   * survives the scope clearing so a panel can fade out instead of vanishing
   * mid-transition, and is only ever overwritten by the next campaign.
   */
  campaignId: string | null
}

type SettingsState = LocalSettings &
  PanelContext & {
    // Actions
    setSidebarCollapsed: (collapsed: boolean) => void
    toggleSidebar: () => void

    /**
     * Declare the screen under the sidebar. Called by `usePanelScope` on mount
     * and unmount only — it never touches `panelMemory`, which is what keeps
     * navigating around from rewriting the user's choices.
     */
    setPanelScope: (scope: PanelScope | null, campaignId?: string) => void

    /** Show the panel, or close it if it is the one already showing. */
    toggleRightPanel: (panel: RightPanel) => void
    /** Show the panel, never closing it — for buttons that mean "open". */
    openRightPanel: (panel: RightPanel) => void
    /** Close what is showing: a panel drops back to the assistant, the assistant closes the rail. */
    closeRightPanel: () => void

    recordModalOpened: (modalId: string) => void

    /** Close an explainer permanently. Idempotent. */
    dismissNote: (id: string) => void

    /**
     * Record that the user is looking at this campaign's posts, arranged this
     * way. Called by the views themselves, on every anchor change — the fold is
     * identity-stable when nothing moved, so a re-render is not a write.
     *
     * The list passes no anchor; it has none, and keeps the calendar's.
     */
    rememberPostsPlace: (
      campaignId: string,
      visit: { view: PostsView; anchor?: string },
    ) => void

    // Reset all settings to defaults
    resetAllSettings: () => void
  }

const DEFAULT_SETTINGS: LocalSettings = {
  sidebarCollapsed: false,
  panelMemory: DEFAULT_PANEL_MEMORY,
  lastOpenedModals: {},
  dismissedNotes: [],
  postsPlace: {},
}

const DEFAULT_PANEL_CONTEXT: PanelContext = { scope: null, campaignId: null }

/**
 * The panel on screen right now — the remembered choice for this screen, or the
 * assistant, or nothing. Every component asks this; none reads `panelMemory`.
 */
export const selectActivePanel = (state: SettingsState): RightPanel | null =>
  resolveActivePanel(state.panelMemory, state.scope)

/**
 * The raw entry for one campaign, or `undefined` — the identity is what makes
 * this safe to subscribe to. Both readers derive from it outside the store, so
 * that the default (which reads the clock, and so is a fresh object every time)
 * is never what a subscriber is comparing against. See `hooks/usePostsPlace`.
 */
export const selectPostsPlaceEntry =
  (campaignId: string) =>
  (state: SettingsState): PostsPlace | undefined =>
    state.postsPlace[campaignId]

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, _get) => ({
        // Initial state
        ...DEFAULT_SETTINGS,
        ...DEFAULT_PANEL_CONTEXT,

        // Sidebar actions
        setSidebarCollapsed: (collapsed) => {
          set({ sidebarCollapsed: collapsed })
        },

        toggleSidebar: () => {
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
        },

        // Right sidebar. The screen context is session state; the choices are
        // the persisted part, and only the three panel actions write them.
        setPanelScope: (scope, campaignId) => {
          set((state) => ({
            scope,
            // Never cleared, only replaced — see `PanelContext.campaignId`.
            campaignId: campaignId ?? state.campaignId,
          }))
        },

        toggleRightPanel: (panel) => {
          set((state) => ({
            panelMemory: togglePanel(state.panelMemory, panel, state.scope),
          }))
        },

        openRightPanel: (panel) => {
          set((state) => ({
            panelMemory: openPanel(state.panelMemory, panel, state.scope),
          }))
        },

        closeRightPanel: () => {
          set((state) => ({
            panelMemory: closePanel(state.panelMemory, state.scope),
          }))
        },

        // Modal tracking actions
        recordModalOpened: (modalId) => {
          set((state) => ({
            lastOpenedModals: {
              ...state.lastOpenedModals,
              [modalId]: new Date().toISOString(),
            },
          }))
        },

        dismissNote: (id) => {
          set((state) =>
            state.dismissedNotes.includes(id)
              ? state
              : { dismissedNotes: [...state.dismissedNotes, id] },
          )
        },

        rememberPostsPlace: (campaignId, visit) => {
          set((state) => {
            const prev = state.postsPlace[campaignId]
            const next = rememberVisit(prev, visit)
            // `rememberVisit` hands back the same object when nothing moved,
            // and this is what that is for: the calendar records on every
            // render of every anchor, so an unconditional `set` would notify
            // every subscriber — the sidebar and the post header among them —
            // on navigations that changed nothing.
            if (next === prev) return state
            return { postsPlace: { ...state.postsPlace, [campaignId]: next } }
          })
        },

        // Reset all settings — this brings closed explainers back, which is
        // the only way to see one again.
        resetAllSettings: () => {
          set({ ...DEFAULT_SETTINGS, ...DEFAULT_PANEL_CONTEXT })
        },
      }),
      {
        name: SETTINGS_STORE_PERSIST_KEY,
        // Persist all state except transient modal open states
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          panelMemory: state.panelMemory,
          lastOpenedModals: state.lastOpenedModals,
          dismissedNotes: state.dismissedNotes,
          postsPlace: state.postsPlace,
          // Don't persist
          // scope, campaignId — where you are, not what you chose
        }),
        // Rehydration is the one place a panel id — or a remembered calendar
        // anchor — arrives from outside this build, so it is the one place that
        // has to distrust them.
        merge: (persisted, current) => {
          const saved = (persisted ?? {}) as Partial<LocalSettings>
          return {
            ...current,
            ...saved,
            panelMemory: sanitizePanelMemory(saved.panelMemory),
            postsPlace: sanitizePostsPlaces(saved.postsPlace),
          }
        },
      },
    ),
    {
      name: SETTINGS_STORE_PERSIST_KEY,
    },
  ),
)
