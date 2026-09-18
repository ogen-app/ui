import { createFileRoute } from '@tanstack/react-router'
import { AssetDocument } from '@/components/content/AssetDocument'

/**
 * `/foundation/sources/:id` — a document opened from the bank, so belonging to no
 * campaign in particular.
 *
 * Escaped from the Brand layout (the trailing underscore on `brand_`) because
 * `/foundation/sources` is a leaf and a leaf cannot have children — the same reason
 * and the same shape as the voice editor beside it. The URL is identical
 * either way; the underscore never reaches the address bar.
 */
export const Route = createFileRoute(
  '/_authenticated/foundation_/sources/$assetId',
)({
  component: BankDocument,
})

function BankDocument() {
  const { assetId } = Route.useParams()
  return <AssetDocument assetId={assetId} campaignId={null} />
}
