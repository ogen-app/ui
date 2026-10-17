import { useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { IdeasSurface } from '@/components/ideas/IdeasSurface'
import { parseIdeaListSearch, type IdeaListSearch } from '@/lib/ideaFilter'

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
  component: CampaignIdeasView,
  validateSearch: parseIdeaListSearch,
})

function CampaignIdeasView() {
  const { campaignId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useCallback(
    (next: IdeaListSearch) => void navigate({ search: next, replace: true }),
    [navigate],
  )
  return (
    <IdeasSurface
      campaignId={campaignId}
      search={search}
      onSearchChange={onSearchChange}
    />
  )
}
