import { createFileRoute, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PageNotBuiltYet } from '@/components/page-primitives/PageNotBuiltYet.tsx'
import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * The campaign's activity — what happened inside this campaign.
 *
 * Behind Activity's own flag rather than one of its own: it is the same feed
 * with a campaign filter, so it is blocked on exactly what the workspace feed
 * is blocked on (`activity_event` has no HTTP surface), and shipping one
 * without the other would leave the levels disagreeing about whether the
 * feature exists.
 */
export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/activity',
)({
  beforeLoad: () => {
    if (!isFeatureEnabled('activity')) throw redirect({ to: '/campaigns' })
  },
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
