import { create } from 'zustand'
import type { CampaignPlatform } from '@/types/campaigns'

/**
 * One removal the assistant just made on a campaign (CON-483), so Strategy
 * can strike it through and say so until the page reloads: the platforms and
 * post types the campaign targeted before it, the words the rail used, and
 * the undo that puts it back.
 */
export type AssistantRemoval = {
  before: CampaignPlatform[]
  /** What was removed, in the server's words ("Facebook", "reel"). */
  removed: string
  undoId?: string
}

type AssistantRemovalState = {
  /** Each campaign's removals, oldest first. */
  removals: Record<string, AssistantRemoval[]>
  mark: (campaignId: string, removal: AssistantRemoval) => void
  /** Drops the removal an UNDO put back, and keeps the others. */
  clear: (campaignId: string, undoId: string) => void
}

/**
 * Session state, never persisted: the strike-through is about this visit,
 * and a reload shows the campaign as it is.
 */
export const useAssistantRemovalStore = create<AssistantRemovalState>(
  (set) => ({
    removals: {},
    mark: (campaignId, removal) =>
      set((state) => ({
        removals: {
          ...state.removals,
          [campaignId]: [...(state.removals[campaignId] ?? []), removal],
        },
      })),
    clear: (campaignId, undoId) =>
      set((state) => {
        const list = state.removals[campaignId]
        if (!list?.some((r) => r.undoId === undoId)) return {}
        const rest = list.filter((r) => r.undoId !== undoId)
        const removals = { ...state.removals }
        if (rest.length > 0) removals[campaignId] = rest
        else delete removals[campaignId]
        return { removals }
      }),
  }),
)

/**
 * Everything the campaign targeted before any of the removals still standing:
 * what is in it and not in the campaign now is what the assistant took off.
 */
export function targetedBefore(
  removals: readonly AssistantRemoval[],
): CampaignPlatform[] {
  const byId = new Map<string, Set<string>>()
  for (const { before } of removals)
    for (const { id, post_types } of before) {
      const types = byId.get(id) ?? new Set<string>()
      for (const slug of post_types) types.add(slug)
      byId.set(id, types)
    }
  return [...byId].map(([id, types]) => ({ id, post_types: [...types] }))
}
