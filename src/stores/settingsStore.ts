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
   * Note id -> whether it sits above the post body (CON-188).
   *
   * A map rather than a list because the default is not "unpinned": a
   * `draft_thesis` starts pinned, so an explicit `false` has to be storable to
   * outvote it. Absent means "whatever the type says" (`lib/postNotes`).
   *
   * Device-local, which is the compromise the API forces — `post_notes` has no
   * `pinned` column, so there is nowhere shared to put it. A teammate opening
   * the same post sees the type-based default, not your arrangement.
   */
  notePins: Record<string, boolean>

  /**
   * Campaign id -> the asset ids that campaign last had explicitly picked.
   *
   * A stash, not the record: the campaign itself is the record. It exists
   * because switching a campaign to "all assets" has to clear `asset_ids`
   * server-side (an empty list is how the API spells *everything*), which
   * would otherwise throw away a hand-picked set the moment someone looked at
   * the other option. Keeping a copy here makes that switch reversible.
   */
  assetSelections: Record<string, string[]>
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

    /** Pin a note above the post body, or send it back down. */
    setNotePin: (noteId: string, pinned: boolean) => void

    /** Forget a deleted note's pin — the map is persisted and never expires. */
    clearNotePin: (noteId: string) => void

    /** Stash what this campaign has picked, so "all assets" can't lose it. */
    rememberAssetSelection: (campaignId: string, assetIds: string[]) => void

    // Reset all settings to defaults
    resetAllSettings: () => void
  }

const DEFAULT_SETTINGS: LocalSettings = {
  sidebarCollapsed: false,
  panelMemory: DEFAULT_PANEL_MEMORY,
  lastOpenedModals: {},
  dismissedNotes: [],
  notePins: {},
  assetSelections: {},
}

const DEFAULT_PANEL_CONTEXT: PanelContext = { scope: null, campaignId: null }

/**
 * The panel on screen right now — the remembered choice for this screen, or the
 * assistant, or nothing. Every component asks this; none reads `panelMemory`.
 */
export const selectActivePanel = (state: SettingsState): RightPanel | null =>
  resolveActivePanel(state.panelMemory, state.scope)

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
              : { dismissedNotes: [...state.dismissedNotes, id] }
          )
        },

        setNotePin: (noteId, pinned) => {
          set((state) => ({ notePins: { ...state.notePins, [noteId]: pinned } }))
        },

        clearNotePin: (noteId) => {
          set((state) => {
            if (!(noteId in state.notePins)) return state
            const next = { ...state.notePins }
            delete next[noteId]
            return { notePins: next }
          })
        },

        rememberAssetSelection: (campaignId, assetIds) => {
          set((state) => ({
            assetSelections: {
              ...state.assetSelections,
              [campaignId]: assetIds,
            },
          }))
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
          notePins: state.notePins,
          assetSelections: state.assetSelections,
          // Don't persist
          // scope, campaignId — where you are, not what you chose
        }),
        // Rehydration is the one place a panel id arrives from outside this
        // build, so it is the one place that has to distrust it.
        merge: (persisted, current) => {
          const saved = (persisted ?? {}) as Partial<LocalSettings>
          return {
            ...current,
            ...saved,
            panelMemory: sanitizePanelMemory(saved.panelMemory),
          }
        },
      }
    ),
    {
      name: SETTINGS_STORE_PERSIST_KEY,
    }
  )
)
