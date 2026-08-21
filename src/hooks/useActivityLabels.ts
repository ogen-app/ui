import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { dayKey, parseDayKey } from '@/lib/activityFeed'

/**
 * The date and time labels Activity reads by.
 *
 * Hooks rather than module constants on purpose: an `Intl` formatter built at
 * module scope freezes whichever language loaded first, and these are rebuilt
 * per language — the same rule that makes the Zod schemas `(t) => schema`
 * factories. See CLAUDE.md on the catalogues.
 */

/** `Today` / `Yesterday` / `Tuesday, 18 August` for a `YYYY-MM-DD` day key. */
export function useDayLabel() {
  const { t, i18n } = useTranslation()
  const format = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    [i18n.language],
  )

  return useCallback(
    (date: string, now: Date = new Date()) => {
      const parsed = parseDayKey(date)
      if (!parsed) return date
      if (date === dayKey(now)) return t('activity.today')
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      if (date === dayKey(yesterday)) return t('activity.yesterday')
      return format.format(parsed)
    },
    [format, t],
  )
}

/**
 * `19 August, 11:45` — a moment written out in full.
 *
 * Deliberately absolute where `useDayLabel` is relative: "Yesterday" is what
 * you want while scanning a feed, and exactly what you don't want in a record
 * you opened to find out when something actually happened.
 */
export function useDateTimeLabel() {
  const { i18n } = useTranslation()
  const format = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [i18n.language],
  )

  return useCallback(
    (iso: string) => {
      const date = new Date(iso)
      return Number.isNaN(date.getTime()) ? iso : format.format(date)
    },
    [format],
  )
}

/** The clock time an entry happened at, in the reader's own locale. */
export function useTimeLabel() {
  const { i18n } = useTranslation()
  const format = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' }),
    [i18n.language],
  )

  return useCallback(
    (iso: string) => {
      const date = new Date(iso)
      return Number.isNaN(date.getTime()) ? '' : format.format(date)
    },
    [format],
  )
}
