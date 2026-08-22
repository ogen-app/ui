import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { dayKey, parseDayKey } from '@/lib/activityFeed'
import { formatDate } from '@/lib/intl'

/**
 * The date and time labels Activity reads by.
 *
 * Hooks rather than module constants on purpose: a formatter built at module
 * scope freezes whichever language loaded first, and these are rebuilt per
 * language — the same rule that makes the Zod schemas `(t) => schema`
 * factories. See CLAUDE.md on the catalogues.
 *
 * The formatting itself goes through `lib/intl`, which caches one formatter per
 * (locale, options) pair — so passing the language in per call costs nothing
 * and there is no memo here to keep in step with it. The language is threaded
 * explicitly rather than left to the default because the `useTranslation` these
 * already hold is what re-renders the caller on a switch: the read and the
 * subscription have to be the same one.
 */

/** `Today` / `Yesterday` / `Tuesday, 18 August` for a `YYYY-MM-DD` day key. */
export function useDayLabel() {
  const { t, i18n } = useTranslation()

  return useCallback(
    (date: string, now: Date = new Date()) => {
      const parsed = parseDayKey(date)
      if (!parsed) return date
      if (date === dayKey(now)) return t('activity.today')
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      if (date === dayKey(yesterday)) return t('activity.yesterday')
      return formatDate(parsed, { weekday: 'long', day: 'numeric', month: 'long' }, i18n.language)
    },
    [i18n.language, t],
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

  return useCallback(
    (iso: string) =>
      formatDate(
        iso,
        { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' },
        i18n.language,
      ) ?? iso,
    [i18n.language],
  )
}

/** The clock time an entry happened at, in the reader's own locale. */
export function useTimeLabel() {
  const { i18n } = useTranslation()

  return useCallback(
    (iso: string) =>
      formatDate(iso, { hour: '2-digit', minute: '2-digit' }, i18n.language) ?? '',
    [i18n.language],
  )
}
