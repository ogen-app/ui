import { useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AssetDocument } from '@/components/content/AssetDocument'
import { parseAssetSearch } from '@/lib/assetSearch'

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId_/assets/$assetId',
)({
  component: CampaignDocument,
  // `?lens=` and `?verdict=` — see `lib/assetSearch`.
  validateSearch: parseAssetSearch,
})

/** One of a campaign's documents — the same screen, knowing whose it is. */
function CampaignDocument() {
  const { campaignId, assetId } = Route.useParams()
  const { lens, at } = Route.useSearch()
  const navigate = Route.useNavigate()
  // Stable, so the page's stale-lens effect does not re-run on every render.
  const onLensChange = useCallback(
    (next: string) =>
      void navigate({
        search: (prev) => ({ ...prev, lens: next || undefined }),
        replace: true,
      }),
    [navigate],
  )
  const onPlaceReached = useCallback(
    () =>
      void navigate({
        search: (prev) => ({ ...prev, at: undefined }),
        replace: true,
      }),
    [navigate],
  )
  return (
    <AssetDocument
      assetId={assetId}
      campaignId={campaignId}
      lens={lens}
      onLensChange={onLensChange}
      at={at}
      onPlaceReached={onPlaceReached}
    />
  )
}
