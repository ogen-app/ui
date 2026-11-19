import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { campaignSection } from '@/lib/campaignSections'
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
 * params here as there. It draws its own header, which carries them, so the
 * campaign layout hands it the whole column.
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
  const { t } = useTranslation()
  const { campaignId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <AnalyticsDashboard
      title={t(campaignSection('analytics').labelKey)}
      search={search}
      onSearchChange={(next) =>
        void navigate({ search: withoutCampaign(next), replace: true })
      }
      campaign={campaignId}
    />
  )
}
