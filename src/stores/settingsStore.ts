import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import { SETTINGS_STORE_PERSIST_KEY } from '@/stores/constants'


/** Content shown in the right sidebar. Only one panel is active at a time. */
export type RightPanel =
  | 'assistant'
  | 'calendarSettings'
  | 'notScheduled'
  | 'postSettings'

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
}

type SettingsState = LocalSettings & {
  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void

  /** Activate the panel, or close the sidebar if it is already active. */
  toggleRightPanel: (panel: RightPanel, campaignId?: string) => void
  closeRightPanel: () => void

  recordModalOpened: (modalId: string) => void

  // Reset all settings to defaults
  resetAllSettings: () => void
}

const DEFAULT_SETTINGS: LocalSettings = {
  sidebarCollapsed: false,
  activeRightPanel: null,
  rightPanelCampaignId: null,
  lastOpenedModals: {},
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

        // Reset all settings
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
