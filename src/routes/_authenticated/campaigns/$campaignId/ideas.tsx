import { createFileRoute, redirect } from '@tanstack/react-router'
import { IdeasSurface } from '@/components/ideas/IdeasSurface'
import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * The campaign's ideas — the same module as the workspace's, narrowed to one
 * campaign, which is the whole argument the rail is making at this level.
 *
 * Narrowed rather than separate: `campaign_id` is a filter on one list, so an
 * idea filed onto a campaign keeps the verdict and the history it already had
 * instead of becoming a second row somewhere else. Capture here files to this
 * campaign, which is the one thing this page does that the workspace's cannot.
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
  const { campaignId } = Route.useParams()
  return <IdeasSurface campaignId={campaignId} />
}
