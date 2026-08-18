import { createFileRoute } from '@tanstack/react-router'
import { AssetDocument } from '@/components/content/AssetDocument'

export const Route = createFileRoute('/_authenticated/content-bank/$assetId')({
  component: BankDocument,
})

/** A document opened from the bank, so belonging to no campaign in particular. */
function BankDocument() {
  const { assetId } = Route.useParams()
  return <AssetDocument assetId={assetId} campaignId={null} />
}
