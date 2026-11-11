import { useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ContentPage } from '@/components/content/ContentPage'
import { useCampaign } from '@/hooks/useCampaigns'
import { parseAssetListSearch, type AssetListSearch } from '@/lib/assetFilter'

type CampaignAssetsSearch = AssetListSearch & {
  /** The assistant asking for a source (`open_add_source`, CON-474). */
  add?: 'source'
}

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/assets',
)({
  component: CampaignAssets,
  // The list's filter, as on `/assets` — see `lib/assetFilter`. The sort and
  // the grouping are per-device preferences, not part of the address.
  // `campaign` never reaches the request here: the campaign is the scope.
  // `add=source` is the assistant's: it opens ADD CONTENT once and goes.
  validateSearch: (raw: Record<string, unknown>): CampaignAssetsSearch => ({
    ...parseAssetListSearch(raw),
    ...(raw.add === 'source' ? { add: 'source' as const } : {}),
  }),
})

/**
 * `/campaigns/:id/assets` — this campaign's documents, and only this
 * campaign's.
 *
 * The level-1 twin of `/assets`, in the same slot: the workspace's module,
 * narrowed. It was `/campaigns/:id/foundation` and carried a read-only band of
 * the campaign's inherited voice, audience and guardrails above the table —
 * which made the page two things and the row's name true of neither half. The
 * binding is chosen and explained on Strategy (`CampaignBrandCard`), the
 * library it comes out of is the workspace's Foundation, and what is left here
 * is the list, which is what people came for.
 */
function CampaignAssets() {
  const { campaignId } = Route.useParams()
  const { data: campaign } = useCampaign(campaignId)
  const { add, ...search } = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = useCallback(
    (next: AssetListSearch) => void navigate({ search: next, replace: true }),
    [navigate],
  )
  const onAddSourceOpened = useCallback(
    () =>
      void navigate({
        search: ({ add: _add, ...rest }: CampaignAssetsSearch) => rest,
        replace: true,
      }),
    [navigate],
  )
  // The layout above has already handled loading and failure for this
  // campaign; this only renders once it is here.
  if (!campaign) return null
  return (
    <ContentPage
      key={campaign.id}
      campaign={campaign}
      search={search}
      onSearchChange={onSearchChange}
      addSource={add === 'source'}
      onAddSourceOpened={onAddSourceOpened}
    />
  )
}
