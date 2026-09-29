import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PageNotBuiltYet } from '@/components/page-primitives/PageNotBuiltYet.tsx'

/**
 * The campaign's activity — what happened inside this campaign.
 *
 * Still a placeholder. It ships beside the workspace feed so the two levels
 * agree the feature exists; the reports it will read already take a
 * `campaign_id` (`useActivityReports`).
 */
export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/activity',
)({
  component: CampaignActivityView,
})

function CampaignActivityView() {
  const { t } = useTranslation()
  return (
    <PageNotBuiltYet
      title={t('activity.stub.campaignTitle')}
      subtitle={t('activity.stub.campaignBody')}
    />
  )
}
