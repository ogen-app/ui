import { createFileRoute } from '@tanstack/react-router'
import { ContentPage } from '@/components/content/ContentPage'
import { useCampaign } from '@/hooks/useCampaigns'

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/assets',
)({
  component: CampaignAssets,
})

/**
 * `/campaigns/:id/assets` — this campaign's documents, and only this
 * campaign's.
 *
 * The level-1 twin of `/assets`, in the same slot: the workspace's module,
 * narrowed. It was `/campaigns/:id/foundation` and carried a read-only band of
 * the campaign's inherited voice, audience and guardrails above the table —
 * which made the page two things and the row's name true of neither half. The
 * binding is chosen and explained on Strategy (`CampaignBrandCard`), the
 * library it comes out of is the workspace's Foundation, and what is left here
 * is the list, which is what people came for.
 */
function CampaignAssets() {
  const { campaignId } = Route.useParams()
  const { data: campaign } = useCampaign(campaignId)
  // The layout above has already handled loading and failure for this
  // campaign; this only renders once it is here.
  if (!campaign) return null
  return <ContentPage key={campaign.id} campaign={campaign} />
}
