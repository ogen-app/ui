import { pageSpan, timeLabelSeconds } from '@/lib/assetAnalysis'
import { parseSheetLabel } from '@/lib/sheetChunks'

/**
 * A place in an asset, as an idea cites it (`p. 5`, `12:03–12:47`,
 * `Sheet "Pipeline" rows 10-24`, `Slide 4`), read as where to take the reader
 * when the asset page opens with `?at=` (CON-388): a recording plays from the
 * time, a sheet's rows are opened and marked, a page or any other labelled
 * part is scrolled to in the Source tab.
 */
export type AssetPlace =
  | { kind: 'time'; seconds: number }
  | { kind: 'rows'; label: string }
  | { kind: 'page'; page: number }
  | { kind: 'label'; label: string }

export function assetPlace(label: string): AssetPlace | null {
  const text = label.trim()
  if (!text) return null
  const seconds = timeLabelSeconds(text)
  if (seconds !== null) return { kind: 'time', seconds }
  if (parseSheetLabel(text)?.part === 'rows')
    return { kind: 'rows', label: text }
  const span = pageSpan([text])
  if (span) return { kind: 'page', page: span.from }
  return { kind: 'label', label: text }
}

/**
 * The Source tab's part a place points at: the chunk whose pages hold it, or
 * whose own label is it. Chunks carry `data-page-from`, `data-page-to` and
 * `data-label` for this (`AssetExtractedView`).
 */
export function findPlace(
  root: ParentNode,
  place: Extract<AssetPlace, { kind: 'page' | 'label' }>,
): HTMLElement | null {
  const parts = root.querySelectorAll<HTMLElement>('[data-place]')
  for (const part of parts) {
    if (place.kind === 'label') {
      if (part.dataset.label === place.label) return part
      continue
    }
    const from = Number(part.dataset.pageFrom)
    const to = Number(part.dataset.pageTo || part.dataset.pageFrom)
    if (from > 0 && place.page >= from && place.page <= to) return part
  }
  return null
}
