import type { TFunction } from 'i18next'
import { assetScreen } from '@/lib/assetKind'
import { formatBytes } from '@/lib/assetStatus'
import { retrievability } from '@/lib/campaignSources'
import { formatNumber } from '@/lib/intl'
import type { Asset } from '@/types/content'

/**
 * How much of a document there actually is.
 *
 * The row's second line wants the size of the file, and the API does not send
 * one for most assets. What it does send is the whole extracted text of the
 * ones whose text is `content` (`GET /api/content-bank/assets`), which the
 * front end had always thrown away. So the row states what the campaign can
 * *read* instead of what the file weighs, which is the more useful of the two
 * here and costs one pass over something already in memory.
 *
 * It also catches the case a size never would: a file that uploaded perfectly
 * and extracted to nothing.
 */
export function wordCount(asset: Pick<Asset, 'content'>): number {
  const text = asset.content.trim()
  return text === '' ? 0 : text.split(/\s+/).length
}

/**
 * "1,240 words", "12 pages" — or why there isn't anything.
 *
 * A PDF or an office document is the exception to counting words: its
 * `content` is a placeholder (`"[]"`, which would read as "1 word") and its
 * text lives in the chunks, which the list does not fetch. What the list does
 * have is the file, so a PDF states its pages and a document its size.
 */
export function extentLabel(
  t: TFunction,
  asset: Pick<Asset, 'content' | 'status' | 'type' | 'file'>,
  locale?: string,
): string {
  // Empty while the server is still working on it is a wait, not a verdict.
  const waiting = retrievability(asset.status) === 'waiting'

  if (assetScreen(asset) === 'extracted') {
    if (waiting) return t('content.extent.waiting')
    if (asset.status === 'failed') return t('content.extent.nothing')
    const pages = asset.file?.page_count ?? 0
    if (pages > 0) return t('content.extent.pages', { count: pages })
    const size = asset.file?.size_bytes ?? 0
    return size > 0 ? formatBytes(size) : t('content.extent.nothing')
  }

  const count = wordCount(asset)
  if (count > 0) {
    return t('content.extent.words', {
      count,
      formatted: formatNumber(count, {}, locale),
    })
  }
  if (waiting) return t('content.extent.waiting')
  // Nothing was extracted from an image because its `content` is a
  // description, not text pulled out of a file — image-service writes one
  // since CON-281, and a person can. "Nothing extracted" on a picture that
  // uploaded perfectly reads as a failed ingest, which is the one thing it
  // isn't.
  return asset.type === 'IMG'
    ? t('content.extent.noDescription')
    : t('content.extent.nothing')
}
