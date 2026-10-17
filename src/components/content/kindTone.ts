import type { AssetListKind } from '@/types/assetList'

/**
 * Each kind's muted ink (CON-382, `--kind-*` in `index.css`): the four file
 * types people already know by colour keep it, a CSV being a spreadsheet, and
 * every other kind is `text-kind-neutral`.
 */
export const KIND_TONE: Partial<Record<AssetListKind, string>> = {
  pdf: 'text-kind-pdf',
  document: 'text-kind-doc',
  spreadsheet: 'text-kind-sheet',
  csv: 'text-kind-sheet',
  presentation: 'text-kind-slides',
}
