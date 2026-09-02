import { retrievability } from '@/lib/campaignSources'
import { formatNumber } from '@/lib/intl'
import type { Asset } from '@/types/content'

/**
 * How much of a document there actually is.
 *
 * The row's second line wants the size of the file, and the API does not send
 * one — `Asset` has no size field. What it does send is the whole extracted
 * text of every asset (`GET /api/content-bank/assets`), which the front end
 * has always thrown away. So the row states what the campaign can *read*
 * instead of what the file weighs, which is the more useful of the two here
 * and costs one pass over something already in memory.
 *
 * It also catches the case a size never would: a PDF that uploaded perfectly
 * and extracted to nothing.
 */
export function wordCount(asset: Pick<Asset, 'content'>): number {
  const text = asset.content.trim()
  return text === '' ? 0 : text.split(/\s+/).length
}

/**
 * "1,240 words" — or why there aren't any.
 *
 * The digits group in the app's language rather than the browser's; the noun
 * beside them is still hard-coded English, because this screen has not been
 * through the catalogue yet (CON-174). Half-right on the number is not an
 * improvement worth arguing about on its own — it is that a `toLocaleString()`
 * left here is the exact call the rest of the app just stopped making, and it
 * would read as permission to make it again.
 */
export function extentLabel(
  asset: Pick<Asset, 'content' | 'status' | 'type'>,
): string {
  const count = wordCount(asset)
  if (count > 0)
    return `${formatNumber(count)} ${count === 1 ? 'word' : 'words'}`
  // Empty while the server is still working on it is a wait, not a verdict.
  if (retrievability(asset.status) === 'waiting') return 'Not read yet'
  // Nothing was extracted from an image because nothing was ever going to be:
  // its `content` is a description somebody writes, not text pulled out of a
  // file. "Nothing extracted" on a picture that uploaded perfectly reads as a
  // failed ingest, which is the one thing it isn't.
  return asset.type === 'IMG' ? 'No description' : 'Nothing extracted'
}
