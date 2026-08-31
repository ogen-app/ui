import { createFileRoute } from '@tanstack/react-router'
import { CampaignBriefForm } from '@/components/forms/campaignBriefForm'
import { PageLoader } from '@/components/page-primitives/PageLoader.tsx'
import { useCampaign } from '@/hooks/useCampaigns.ts'

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/brief',
)({
  component: CampaignBriefView,
})

function CampaignBriefView() {
  const { campaignId } = Route.useParams()
  const { data: campaign } = useCampaign(campaignId)
  // Same gate as the settings section next door — a section that renders
  // nothing reads as a broken page rather than as one still loading.
  if (!campaign) return <PageLoader />
  // The campaign layout owns the scrolling and the fading header for this
  // section, so the form renders bare.
  return <CampaignBriefForm campaign={campaign} />
}
