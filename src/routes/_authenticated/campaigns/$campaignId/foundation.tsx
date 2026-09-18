import { createFileRoute } from '@tanstack/react-router'
import { ContentPage } from '@/components/content/ContentPage'
import { useCampaign } from '@/hooks/useCampaigns.ts'

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/foundation',
)({
  component: CampaignFoundation,
})

function CampaignFoundation() {
  const { campaignId } = Route.useParams()
  const { data: campaign } = useCampaign(campaignId)
  // The layout above has already handled loading and failure for this
  // campaign; this only renders once it is here.
  if (!campaign) return null
  return <ContentPage key={campaign.id} campaign={campaign} />
}
