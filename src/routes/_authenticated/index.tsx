import { createFileRoute, redirect } from '@tanstack/react-router'
import { campaignsQuery } from '@/hooks/useCampaigns'
import { queryClient } from '@/lib/queryClient'

/**
 * The app's front door: the campaigns, or — in a workspace that has exactly
 * one — that campaign's Overview, because a list of one card is a click that
 * chooses nothing. A failed read falls back to the list, which says why.
 */
export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: async () => {
    const campaigns = await queryClient
      .ensureQueryData(campaignsQuery)
      .catch(() => null)
    if (campaigns?.length === 1) {
      throw redirect({
        to: '/campaigns/$campaignId/overview',
        params: { campaignId: campaigns[0].id },
      })
    }
    throw redirect({ to: '/campaigns' })
  },
})
