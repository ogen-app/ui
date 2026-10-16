import type { TFunction } from 'i18next'
import type { LinkProps } from '@tanstack/react-router'
import { readableTitle } from '@/lib/assetAnalysis'
import { formatDate } from '@/lib/intl'
import type { IdeaCounts } from '@/lib/ideas'
import { relativeTime } from '@/lib/relativeTime'
import { pageUrlLabel } from '@/lib/webPageUrl'
import type { Asset } from '@/types/content'
import type { AssetListItem } from '@/types/assetList'

/**
 * The rules behind the Assets list's rows (CON-370), pure so they can be
 * tested without a table: what a row is called, when it last changed, and
 * how its ideas have been answered. What kind of thing a row is comes from the
 * server (`kind`, CON-374), which owns that classification.
 */

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
  asset: Pick<Asset, 'title' | 'type'> & {
    source_url?: string | null
    file?: object | null
  },
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

/** The order the pill draws verdicts in — always the same, so icons stay put. */
export const VERDICT_ORDER = ['waiting', 'yes', 'later', 'no'] as const

export type VerdictKey = (typeof VERDICT_ORDER)[number]

/**
 * Which pile one idea sits in today, for a mark beside it: never answered, or
 * postponed to a day that has come, is `waiting` — a woken idea is a question
 * again, as `lib/ideas`'s `isWaiting` has it, though its record still says
 * `later`.
 */
export function ideaVerdictKey(
  idea: { verdict: 'yes' | 'later' | 'no' | null; remind_at: string | null },
  now: Date,
): VerdictKey {
  if (idea.verdict === null) return 'waiting'
  if (idea.verdict === 'later' && idea.remind_at) {
    const at = Date.parse(idea.remind_at)
    if (Number.isFinite(at) && at <= now.getTime()) return 'waiting'
  }
  return idea.verdict
}

/** "4 undecided · 2 yes · 1 not now" — the pill's tooltip and its name. */
export function verdictSentence(t: TFunction, counts: IdeaCounts): string {
  return VERDICT_ORDER.filter((v) => counts[v] > 0)
    .map((v) => t(`content.list.verdict.${v}`, { count: counts[v] }))
    .join(' · ')
}

/**
 * What a row has to say about its ideas (CON-378), one of five:
 *
 * - `failed` — the file couldn't be read, so nothing will come of it.
 * - `reading` — ingest or analysis is still under way; ideas are on their way.
 * - `ideas` — the analysis distilled some; the pill counts them.
 * - `noIdeas` — read and analysed, and nothing came out of it.
 * - `unanalysed` — no analysis to speak of (none ran, it failed or was
 *   skipped): the row says nothing rather than claim "no ideas".
 */
export type RowState = 'failed' | 'reading' | 'ideas' | 'noIdeas' | 'unanalysed'

export function rowState(
  row: Pick<AssetListItem, 'status' | 'analysis_status' | 'idea_counts'>,
): RowState {
  if (row.status === 'failed') return 'failed'
  if (
    row.status === 'pending' ||
    row.status === 'processing' ||
    row.analysis_status === 'pending' ||
    row.analysis_status === 'running'
  )
    return 'reading'
  if (Object.values(row.idea_counts).some((n) => n > 0)) return 'ideas'
  if (row.analysis_status === 'ready') return 'noIdeas'
  return 'unanalysed'
}

/**
 * The row's two dates, each as a distance with the exact date for its
 * tooltip: when the asset was added, always, and when its source was
 * published, when the source's own metadata said (`published_at`). They are
 * different facts — a report published last year and added two days ago — so
 * neither stands in for the other.
 */
export function rowDates(
  t: TFunction,
  row: Pick<AssetListItem, 'published_at' | 'created_at'>,
  now: Date,
  locale?: string,
): {
  added: { label: string; exact: string } | null
  published: { label: string; exact: string } | null
} {
  const distance = (iso: string, style: Intl.DateTimeFormatOptions) => {
    const at = new Date(iso)
    if (Number.isNaN(at.getTime())) return null
    const exact = formatDate(at, style, locale) ?? ''
    const when =
      now.getTime() - at.getTime() < 60_000
        ? t('content.list.justNow')
        : (relativeTime(iso, now, locale) ?? exact)
    return { when, exact }
  }
  const added = distance(row.created_at, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const published = row.published_at
    ? distance(row.published_at, { dateStyle: 'long' })
    : null
  return {
    added: added && {
      label: t('content.list.addedAgo', { when: added.when }),
      exact: added.exact,
    },
    published: published && {
      label: t('content.list.publishedAgo', { when: published.when }),
      exact: published.exact,
    },
  }
}

/**
 * The page a row opens, on a verdict pile when one is named. Same row, two
 * pages: the campaign's copy keeps the campaign in the URL so its back caret
 * and its delete know where they are.
 */
export function assetLink(
  row: Pick<AssetListItem, 'id'>,
  campaignId: string | null,
  verdict?: VerdictKey,
): LinkProps {
  const search = verdict ? { verdict } : {}
  return campaignId
    ? {
        to: '/campaigns/$campaignId/assets/$assetId',
        params: { campaignId, assetId: row.id },
        search,
      }
    : { to: '/assets/$assetId', params: { assetId: row.id }, search }
}
