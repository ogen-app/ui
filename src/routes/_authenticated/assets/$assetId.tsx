import { useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AssetDocument } from '@/components/content/AssetDocument'
import { parseAssetSearch } from '@/lib/assetSearch'

export const Route = createFileRoute('/_authenticated/assets/$assetId')({
  component: BankDocument,
  // `?lens=` and `?verdict=` — see `lib/assetSearch`.
  validateSearch: parseAssetSearch,
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
  const { lens } = Route.useSearch()
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
  return (
    <AssetDocument
      assetId={assetId}
      campaignId={null}
      lens={lens}
      onLensChange={onLensChange}
    />
  )
}
