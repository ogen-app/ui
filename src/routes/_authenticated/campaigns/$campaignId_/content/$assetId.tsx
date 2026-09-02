import { createFileRoute } from '@tanstack/react-router'
import { AssetDocument } from '@/components/content/AssetDocument'

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId_/content/$assetId',
)({
  component: CampaignDocument,
})

/** One of a campaign's documents — the same screen, knowing whose it is. */
function CampaignDocument() {
  const { campaignId, assetId } = Route.useParams()
  return <AssetDocument assetId={assetId} campaignId={campaignId} />
}
