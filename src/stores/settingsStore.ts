import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import { SETTINGS_STORE_PERSIST_KEY } from '@/stores/constants'


/** Content shown in the right sidebar. Only one panel is active at a time. */
export type RightPanel =
  | 'assistant'
  | 'calendarSettings'
  | 'notScheduled'
  | 'postSettings'
  | 'postPreview'
  | 'postQuality'

/**
 * Local-only settings stored in localStorage
 * These settings are device/browser specific and do NOT sync across devices
 */
export type LocalSettings = {
  // UI State
  sidebarCollapsed: boolean
  activeRightPanel: RightPanel | null
  /**
   * Campaign context for the notScheduled panel. Kept after the panel
   * deactivates so its content can fade out instead of vanishing.
   */
  rightPanelCampaignId: string | null

  // Modal/Dialog State
  lastOpenedModals: Record<string, string> // modal ID -> last opened timestamp

  /**
   * Ids of `<Explainer>` notes the user has closed for good. Device-local on
   * purpose: it is display noise, not data, and the shared `/api/settings`
   * table is the wrong home for it.
   */
  dismissedNotes: string[]

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

type SettingsState = LocalSettings & {
  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void

  /** Activate the panel, or close the sidebar if it is already active. */
  toggleRightPanel: (panel: RightPanel, campaignId?: string) => void
  /** Activate the panel, never closing it — for buttons that mean "open". */
  openRightPanel: (panel: RightPanel, campaignId?: string) => void
  closeRightPanel: () => void

  recordModalOpened: (modalId: string) => void

  /** Close an explainer permanently. Idempotent. */
  dismissNote: (id: string) => void

  /** Stash what this campaign has picked, so "all assets" can't lose it. */
  rememberAssetSelection: (campaignId: string, assetIds: string[]) => void

  // Reset all settings to defaults
  resetAllSettings: () => void
}

const DEFAULT_SETTINGS: LocalSettings = {
  sidebarCollapsed: false,
  activeRightPanel: null,
  rightPanelCampaignId: null,
  lastOpenedModals: {},
  dismissedNotes: [],
  assetSelections: {},
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, _get) => ({
        // Initial state
        ...DEFAULT_SETTINGS,

        // Sidebar actions
        setSidebarCollapsed: (collapsed) => {
          set({ sidebarCollapsed: collapsed })
        },

        toggleSidebar: () => {
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
        },

        // Right sidebar actions (session-only, not persisted)
        toggleRightPanel: (panel, campaignId) => {
          set((state) => ({
            activeRightPanel: state.activeRightPanel === panel ? null : panel,
            ...(campaignId !== undefined && { rightPanelCampaignId: campaignId }),
          }))
        },

        openRightPanel: (panel, campaignId) => {
          set({
            activeRightPanel: panel,
            ...(campaignId !== undefined && { rightPanelCampaignId: campaignId }),
          })
        },

        closeRightPanel: () => {
          set({ activeRightPanel: null })
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
          set(DEFAULT_SETTINGS)
        },
      }),
      {
        name: SETTINGS_STORE_PERSIST_KEY,
        // Persist all state except transient modal open states
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          lastOpenedModals: state.lastOpenedModals,
          dismissedNotes: state.dismissedNotes,
          assetSelections: state.assetSelections,
          // Don't persist
          // activeRightPanel, rightPanelCampaignId
        }),
      }
    ),
    {
      name: SETTINGS_STORE_PERSIST_KEY,
    }
  )
)
