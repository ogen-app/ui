import { createFileRoute } from '@tanstack/react-router'
import { CampaignAnalyticsPanel } from '@/components/campaigns/analytics/CampaignAnalyticsPanel.tsx'

/**
 * The section exists whether or not the numbers do: `campaign-analytics`
 * decides which of the two the panel renders, not whether the route resolves.
 * A guard here would make the sidebar item lead nowhere.
 */
export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/analytics',
)({
  component: CampaignAnalytics,
})

function CampaignAnalytics() {
  const { campaignId } = Route.useParams()
  return <CampaignAnalyticsPanel campaignId={campaignId} />
}
