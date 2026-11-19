import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { OVERVIEW_WINDOWS } from '@/hooks/useAnalyticsOverview'
import {
  validateAnalyticsSearch,
  type AnalyticsSearch,
} from '@/lib/analyticsSearch'

/**
 * The address without a campaign: the path already names it, and a second
 * answer in the query could only disagree with it.
 */
const withoutCampaign = (search: AnalyticsSearch): AnalyticsSearch => ({
  ...search,
  campaign_id: undefined,
})

/**
 * A campaign's Analytics: the workspace's dashboard with the campaign fixed by
 * the address (`AnalyticsDashboard`). The period and platforms are search
 * params here as there.
 */
export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/analytics',
)({
  staticData: { help: 'analytics' },
  validateSearch: (raw: Record<string, unknown>) =>
    withoutCampaign(
      validateAnalyticsSearch(
        raw,
        OVERVIEW_WINDOWS.map((w) => w.window),
      ),
    ),
  component: CampaignAnalytics,
})

function CampaignAnalytics() {
  const { campaignId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <div className="pb-10">
      <AnalyticsDashboard
        search={search}
        onSearchChange={(next) =>
          void navigate({ search: withoutCampaign(next), replace: true })
        }
        campaign={campaignId}
      />
    </div>
  )
}
