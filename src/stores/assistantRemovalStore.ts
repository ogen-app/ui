import { create } from 'zustand'
import type { CampaignPlatform } from '@/types/campaigns'

/**
 * What the assistant just took off a campaign (CON-483), so Strategy can
 * strike it through and say so until the page reloads: the platforms and
 * post types the campaign targeted before, and the words the rail used.
 */
export type AssistantRemoval = {
  before: CampaignPlatform[]
  /** What was removed, in the server's words ("Facebook", "reel"). */
  removed: string
}

type AssistantRemovalState = {
  removals: Record<string, AssistantRemoval>
  mark: (campaignId: string, removal: AssistantRemoval) => void
  clear: (campaignId: string) => void
}

/**
 * Session state, never persisted: the strike-through is about this visit,
 * and a reload shows the campaign as it is. A second removal keeps the
 * first one's `before`, so both stay struck; an UNDO clears it.
 */
export const useAssistantRemovalStore = create<AssistantRemovalState>(
  (set) => ({
    removals: {},
    mark: (campaignId, removal) =>
      set((state) => {
        const prior = state.removals[campaignId]
        return {
          removals: {
            ...state.removals,
            [campaignId]: prior
              ? {
                  before: prior.before,
                  removed: `${prior.removed}, ${removal.removed}`,
                }
              : removal,
          },
        }
      }),
    clear: (campaignId) =>
      set((state) => {
        if (!(campaignId in state.removals)) return {}
        const rest = { ...state.removals }
        delete rest[campaignId]
        return { removals: rest }
      }),
  }),
)
