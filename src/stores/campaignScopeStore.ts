import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * The campaign filter this tab last chose, for the pages that carry none.
 *
 * The address is still the answer wherever it has one — a campaign's route
 * names its campaign, `/ideas` names all of them — and this only fills in on
 * a page no campaign narrows (Foundation, Profile), so the filter survives a
 * visit there. `sessionStorage`, not `localStorage`, for the same reason the
 * active workspace is: two tabs can be looking at two campaigns.
 *
 * Never read directly — `useCampaignScope` checks the id is still one of this
 * workspace's active campaigns, which is what keeps a remembered id from
 * another workspace, or from a campaign since archived, from filtering
 * anything.
 */
type CampaignScopeState = {
  campaignId: string | null
  setCampaignId: (campaignId: string | null) => void
}

export const useCampaignScopeStore = create<CampaignScopeState>()(
  persist(
    (set) => ({
      campaignId: null,
      setCampaignId: (campaignId) => set({ campaignId }),
    }),
    {
      name: 'ogen.campaignScope',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
