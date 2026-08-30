import { formatRelative } from '@/lib/intl'

const UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'year', seconds: 31_536_000 },
  { unit: 'month', seconds: 2_592_000 },
  { unit: 'week', seconds: 604_800 },
  { unit: 'day', seconds: 86_400 },
  { unit: 'hour', seconds: 3_600 },
  { unit: 'minute', seconds: 60 },
]

/**
 * "2 months ago" / "in 3 days" for a timestamp, in either direction. Sub-minute
 * differences collapse to "just now". Returns null for missing/invalid input.
 *
 * `locale` is threaded rather than left to the default so the caller's
 * subscription and the formatting are the same read — see `useLocale`.
 */
export function relativeTime(
  iso: string | null | undefined,
  now = new Date(),
  locale?: string,
): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const diffSeconds = (date.getTime() - now.getTime()) / 1000
  for (const { unit, seconds } of UNITS) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatRelative(Math.trunc(diffSeconds / seconds), unit, locale)
    }
  }
  // The one string here the catalogue should own once these screens are
  // converted (CON-174) — everything else comes out of `Intl`.
  return 'just now'
}
