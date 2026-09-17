import { createFileRoute, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PageNotBuiltYet } from '@/components/page-primitives/PageNotBuiltYet.tsx'
import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * The campaign's ideas — the same module as the workspace's, narrowed to one
 * campaign, which is the whole argument the rail is making at this level.
 *
 * The campaign layout owns the header and the scrolling for its sections, so
 * this renders bare.
 */
export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/ideas',
)({
  beforeLoad: () => {
    if (!isFeatureEnabled('ideas')) throw redirect({ to: '/campaigns' })
  },
  component: CampaignIdeasView,
})

function CampaignIdeasView() {
  const { t } = useTranslation()
  return (
    <PageNotBuiltYet
      title={t('ideas.stub.campaignTitle')}
      subtitle={t('ideas.stub.campaignBody')}
    />
  )
}
