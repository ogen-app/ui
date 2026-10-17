import { VERDICT_ORDER, type VerdictKey } from '@/lib/assetList'

/**
 * An asset page's address beyond its id, on both of its routes:
 *
 * - `?lens=` names the reading the Insights tab opens on — a campaign id or
 *   `workspace` (CON-366) — so a link reopens the reading it was copied from.
 * - `?verdict=` is the ideas pile it opens on (CON-370): the Assets list's
 *   verdict pill links each segment here.
 * - `?at=` is a place an idea cites (CON-388) — `p. 5`, `12:03`, a sheet's
 *   rows — which the page goes to once, then drops from the address.
 */
export type AssetSearch = { lens?: string; verdict?: VerdictKey; at?: string }

export function parseAssetSearch(search: Record<string, unknown>): AssetSearch {
  const out: AssetSearch = {}
  if (typeof search.lens === 'string' && search.lens) out.lens = search.lens
  if (VERDICT_ORDER.includes(search.verdict as VerdictKey))
    out.verdict = search.verdict as VerdictKey
  if (typeof search.at === 'string' && search.at.trim())
    out.at = search.at.trim().slice(0, 200)
  return out
}
