import { useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useCampaign } from '@/hooks/useCampaigns'
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
 * It owns its whole page, header included, as Assets does: the layout hands
 * the section over, and the header is titled the way the layout titles every
 * section — the campaign's name, then the section's.
 */
export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/ideas',
)({
  component: CampaignIdeasView,
  validateSearch: parseIdeaListSearch,
})

function CampaignIdeasView() {
  const { t } = useTranslation()
  const { campaignId } = Route.useParams()
  // The layout has the campaign in hand already, so this is a cache read.
  const { data: campaign } = useCampaign(campaignId)
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useCallback(
    (next: IdeaListSearch) => void navigate({ search: next, replace: true }),
    [navigate],
  )
  return (
    <IdeasSurface
      campaignId={campaignId}
      heading={t('ideas.page.campaignTitle', {
        campaign: campaign?.name.trim() || t('ideas.page.untitledCampaign'),
      })}
      search={search}
      onSearchChange={onSearchChange}
    />
  )
}
