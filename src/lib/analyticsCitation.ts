import type { TFunction } from 'i18next'
import { formatDate } from '@/lib/intl'

/** A day of an analytics window, read in UTC: a day, not an instant. */
export function windowDay(iso: string): string {
  return (
    formatDate(iso, { day: 'numeric', month: 'short', timeZone: 'UTC' }) ?? iso
  )
}

/**
 * A window's days as its cards cite them (CON-463) — one day, or the two
 * ends of an inclusive range.
 */
export function periodLabel(t: TFunction, from: string, to: string): string {
  return from === to
    ? windowDay(from)
    : t('assistant.analytics.cite.range', {
        from: windowDay(from),
        to: windowDay(to),
      })
}
