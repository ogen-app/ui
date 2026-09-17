import { createFileRoute } from '@tanstack/react-router'
import { CampaignStrategyForm } from '@/components/forms/campaignStrategyForm'
import { PageLoader } from '@/components/page-primitives/PageLoader.tsx'
import { useCampaign } from '@/hooks/useCampaigns.ts'

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/strategy',
)({
  component: CampaignStrategyView,
})

function CampaignStrategyView() {
  const { campaignId } = Route.useParams()
  const { data: campaign } = useCampaign(campaignId)
  // Same gate as the settings section on the footer's gear — a section that
  // renders nothing reads as a broken page rather than as one still loading.
  if (!campaign) return <PageLoader />
  // The campaign layout owns the scrolling and the fading header for this
  // section, so the form renders bare.
  return <CampaignStrategyForm campaign={campaign} />
}
