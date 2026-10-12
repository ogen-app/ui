import { useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AssetDocument } from '@/components/content/AssetDocument'

/** See the bank's copy of this route: `?lens=` picks the Insights reading. */
type AssetSearch = { lens?: string }

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId_/assets/$assetId',
)({
  component: CampaignDocument,
  validateSearch: (search: Record<string, unknown>): AssetSearch =>
    typeof search.lens === 'string' && search.lens ? { lens: search.lens } : {},
})

/** One of a campaign's documents — the same screen, knowing whose it is. */
function CampaignDocument() {
  const { campaignId, assetId } = Route.useParams()
  const { lens } = Route.useSearch()
  const navigate = Route.useNavigate()
  // Stable, so the page's stale-lens effect does not re-run on every render.
  const onLensChange = useCallback(
    (next: string) =>
      void navigate({ search: next ? { lens: next } : {}, replace: true }),
    [navigate],
  )
  return (
    <AssetDocument
      assetId={assetId}
      campaignId={campaignId}
      lens={lens}
      onLensChange={onLensChange}
    />
  )
}
