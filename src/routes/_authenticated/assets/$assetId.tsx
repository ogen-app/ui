import { createFileRoute } from '@tanstack/react-router'
import { AssetDocument } from '@/components/content/AssetDocument'

export const Route = createFileRoute('/_authenticated/assets/$assetId')({
  component: BankDocument,
})

/**
 * `/assets/:id` — a document opened from the bank, so belonging to no campaign
 * in particular.
 *
 * A plain child rather than the trailing-underscore escape its predecessor
 * needed: `/foundation/sources` was a leaf under a layout, and a leaf cannot
 * have children. `/assets` is its own destination with nothing above it but
 * `_authenticated`, so the document sits under it and keeps the app's rail,
 * which is what the campaign's copy does too.
 *
 * No flag guard either, for the reason on the list route: the document editor
 * predates Foundation and never depended on it.
 */
function BankDocument() {
  const { assetId } = Route.useParams()
  return <AssetDocument assetId={assetId} campaignId={null} />
}
