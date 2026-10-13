import { VERDICT_ORDER, type VerdictKey } from '@/lib/assetList'

/**
 * An asset page's address beyond its id, on both of its routes:
 *
 * - `?lens=` names the reading the Insights tab opens on — a campaign id or
 *   `workspace` (CON-366) — so a link reopens the reading it was copied from.
 * - `?verdict=` is the ideas pile it opens on (CON-370): the Assets list's
 *   verdict pill links each segment here.
 */
export type AssetSearch = { lens?: string; verdict?: VerdictKey }

export function parseAssetSearch(search: Record<string, unknown>): AssetSearch {
  const out: AssetSearch = {}
  if (typeof search.lens === 'string' && search.lens) out.lens = search.lens
  if (VERDICT_ORDER.includes(search.verdict as VerdictKey))
    out.verdict = search.verdict as VerdictKey
  return out
}
