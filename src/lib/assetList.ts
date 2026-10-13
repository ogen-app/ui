import type { TFunction } from 'i18next'
import { readableTitle } from '@/lib/assetAnalysis'
import { formatDate } from '@/lib/intl'
import { countIdeas, type Idea, type IdeaCounts } from '@/lib/ideas'
import { relativeTime } from '@/lib/relativeTime'
import { isSpreadsheet } from '@/lib/sheetChunks'
import { pageUrlLabel } from '@/lib/webPageUrl'
import type { Asset } from '@/types/content'

/**
 * The rules behind the Assets list's rows (CON-370), pure so they can be
 * tested without a table: what a row is called, what kind of thing it is,
 * when it last changed, and how its ideas have been answered.
 */

/** What the list draws in the kind slot — finer than `AssetKind`. */
export type ListKind =
  | 'pdf'
  | 'document'
  | 'spreadsheet'
  | 'csv'
  | 'page'
  | 'audio'
  | 'image'
  | 'note'

export function listKind(asset: Pick<Asset, 'type' | 'file'>): ListKind {
  switch (asset.type) {
    case 'PDF':
      return 'pdf'
    case 'URL':
      return 'page'
    case 'AUDIO':
      return 'audio'
    case 'IMG':
      return 'image'
    case 'DOC': {
      const name = asset.file?.original_name.toLowerCase() ?? ''
      if (name.endsWith('.csv') || asset.file?.mime_type === 'text/csv')
        return 'csv'
      return isSpreadsheet(asset) ? 'spreadsheet' : 'document'
    }
    default:
      return 'note'
  }
}

/** A short trailing " - Publisher" / " | Publisher": four words at most. */
const PUBLISHER_SUFFIX = /\s+[-–—|·]\s+([^-–—|·]{1,40})$/

/**
 * A row's title as words a person would write.
 *
 * - A page still titled by its own address reads as that address, tidied.
 * - URL-encoding is decoded (`%20` → space).
 * - A file name loses its extension, and underscores become spaces.
 * - A hyphenated file name reads as words (`readableTitle`).
 * - A page's " - InfoQ" suffix goes when the row already shows its domain.
 */
export function listTitle(
  asset: Pick<Asset, 'title' | 'type' | 'source_url' | 'file'>,
  fallback: string,
): string {
  const raw = asset.title.trim()
  if (raw === '') return fallback
  if (asset.type === 'URL' && asset.source_url === asset.title)
    return pageUrlLabel(raw)

  let title = decodeLoosely(raw)
  if (asset.file && /\.[a-z0-9]{2,5}$/i.test(title))
    title = title.replace(/\.[a-z0-9]{2,5}$/i, '')
  if (title.includes('_')) title = title.replace(/_+/g, ' ')
  title = readableTitle(title).replace(/\s+/g, ' ').trim()

  if (asset.type === 'URL' && asset.source_url) {
    const suffix = PUBLISHER_SUFFIX.exec(title)
    if (suffix && suffix[1].trim().split(/\s+/).length <= 4)
      title = title.slice(0, suffix.index)
  }
  return title || fallback
}

/** `%20` and friends decoded, a malformed escape left as it is. */
function decodeLoosely(value: string): string {
  if (!value.includes('%')) return value
  try {
    return decodeURIComponent(value)
  } catch {
    return value.replace(/%20/g, ' ')
  }
}

/** Within this, a date is said as a distance ("3 hours ago"). */
const RECENT_MS = 7 * 24 * 60 * 60 * 1000

/**
 * A row's date, one line: a distance for the last week, then a date with its
 * four-digit year ("4 Oct 2026"), never a two-digit year that reads as a day.
 * `exact` is the tooltip — the full date and time.
 */
export function listDate(
  t: TFunction,
  iso: string,
  now: Date,
  locale?: string,
): { label: string; exact: string } | null {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return null
  const exact =
    formatDate(at, { dateStyle: 'medium', timeStyle: 'short' }, locale) ?? ''
  const age = now.getTime() - at.getTime()
  if (age < 60_000) return { label: t('content.list.justNow'), exact }
  if (age < RECENT_MS)
    return { label: relativeTime(iso, now, locale) ?? exact, exact }
  return {
    label:
      formatDate(
        at,
        { day: 'numeric', month: 'short', year: 'numeric' },
        locale,
      ) ?? exact,
    exact,
  }
}

/** "18 min" for a recording a minute or longer, "0:21" for a shorter one. */
export function formatDuration(t: TFunction, ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `0:${String(seconds).padStart(2, '0')}`
  return t('content.list.minutes', { count: Math.round(seconds / 60) })
}

/**
 * How an asset's distilled ideas have been answered, per asset (CON-370).
 *
 * From the whole ideas backlog, which already names each idea's source asset
 * — grouped here rather than fetched per row. Only ideas an analysis wrote
 * count. A "later" whose reminder has come due is counted as waiting, the
 * rule the Ideas inbox uses (`countIdeas`), so the four figures always add up
 * to the asset's ideas.
 */
export function ideaCountsByAsset(
  ideas: readonly Idea[],
  now: Date,
): Map<string, IdeaCounts> {
  const byAsset = new Map<string, Idea[]>()
  for (const idea of ideas) {
    const assetId = idea.sourceAsset?.id
    if (idea.origin !== 'asset_analysis' || !assetId) continue
    const list = byAsset.get(assetId)
    if (list) list.push(idea)
    else byAsset.set(assetId, [idea])
  }
  const counts = new Map<string, IdeaCounts>()
  for (const [assetId, list] of byAsset)
    counts.set(assetId, countIdeas(list, now))
  return counts
}

/** The order the pill draws verdicts in — always the same, so icons stay put. */
export const VERDICT_ORDER = ['waiting', 'yes', 'later', 'no'] as const

export type VerdictKey = (typeof VERDICT_ORDER)[number]

/** "4 undecided · 2 yes · 1 not now" — the pill's tooltip and its name. */
export function verdictSentence(t: TFunction, counts: IdeaCounts): string {
  return VERDICT_ORDER.filter((v) => counts[v] > 0)
    .map((v) => t(`content.list.verdict.${v}`, { count: counts[v] }))
    .join(' · ')
}
