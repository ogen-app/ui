import type { TFunction } from 'i18next'
import { contentFormatLabel } from '@/lib/contentFormats'
import type { SeriesPlan } from '@/lib/seriesPlan'
import { counted, formatDate, formatNumber } from '@/lib/intl'
import {
  SERIES_WEEKDAYS,
  type ContentSeries,
  type SeriesRhythm,
  type SeriesSupply,
  type SeriesWeekday,
} from '@/types/series'

/**
 * Series' words, in one file (CON-264).
 *
 * **Every function here takes `t` as its first argument**, which is the rule
 * `components/analytics/format.ts` is the worked example for: a pure function
 * that produces words must not hold a frozen label, and taking `t` is what lets
 * the same helper be called from a component and from a card without either of
 * them reaching for a module-level constant that captured whichever language
 * loaded first.
 */

/**
 * How often a series runs, as a phrase — "2 a week", "Occasional".
 *
 * `null` is occasional and says so in words rather than as a blank: a row whose
 * rhythm cell is empty reads as an unanswered question, and this is an answer.
 */
export function rhythmLine(t: TFunction, rhythm: SeriesRhythm | null): string {
  if (!rhythm || rhythm.times <= 0) return t('series.rhythm.occasional')
  const every = rhythm.every && rhythm.every > 1 ? rhythm.every : 1
  // A day only comes with once a week (CON-496): "Every Tuesday", "Every 2
  // weeks on Tuesday".
  if (rhythm.weekday) {
    const day = weekdayName(rhythm.weekday)
    return every > 1
      ? t('series.rhythm.everyWeeksOn', { ...counted(every), day })
      : t('series.rhythm.everyDay', { day })
  }
  if (every > 1)
    return rhythm.per === 'week'
      ? t('series.rhythm.perWeeksEvery', {
          ...counted(rhythm.times),
          every: formatNumber(every),
        })
      : t('series.rhythm.perMonthsEvery', {
          ...counted(rhythm.times),
          every: formatNumber(every),
        })
  return rhythm.per === 'week'
    ? t('series.rhythm.perWeek', counted(rhythm.times))
    : t('series.rhythm.perMonth', counted(rhythm.times))
}

/**
 * A weekday's name in the active language — "Tuesday", "martes" — from `Intl`
 * rather than a table: 1 January 2024 was a Monday.
 */
export function weekdayName(weekday: SeriesWeekday): string {
  return (
    formatDate(Date.UTC(2024, 0, 1 + SERIES_WEEKDAYS.indexOf(weekday)), {
      weekday: 'long',
      timeZone: 'UTC',
    }) ?? weekday
  )
}

/** Whether it feeds itself or waits on an idea. See `SeriesSupply`. */
export function supplyLine(t: TFunction, supply: SeriesSupply): string {
  return supply === 'self'
    ? t('series.supply.selfLine')
    : t('series.supply.ideaLine')
}

/**
 * The line under a series' name on a library row: what shape it takes, how
 * often it runs, and what it has produced.
 *
 * Assembled from parts here rather than as one catalogue sentence with three
 * interpolations, because the parts are independently absent — a series with no
 * format and no rhythm should read as two facts missing, not as a sentence with
 * holes in it. Joined with the separator the facts table already uses, so two
 * meta lines in the same column are punctuated the same way.
 */
export function seriesMetaLine(
  t: TFunction,
  series: ContentSeries,
  { withFormat }: { withFormat: boolean },
): string {
  const parts: string[] = []
  if (withFormat && series.formatId) {
    parts.push(contentFormatLabel(t, series.formatId))
  }
  parts.push(rhythmLine(t, series.defaultRhythm))
  parts.push(
    t('series.usage', {
      drafts: series.usage.drafts,
      published: series.usage.published,
    }),
  )
  return parts.join(t('brand.facts.separator'))
}

/**
 * The campaign's plan in one sentence — the line Strategy prints and the only
 * place the mix is ever stated.
 *
 * Four answers rather than one with conditionals, because they are genuinely
 * different findings and only one of them is a shortfall:
 *
 * - **no goal** — the campaign has no post rate, so there is nothing to measure
 *   against. Not "0 open", which would read as a full schedule.
 * - **over** — the series claim more than the campaign plans. Reported, never
 *   prevented: a campaign may want more series output and then raise its rate,
 *   and refusing the rhythm would be the app deciding which of two numbers the
 *   user meant.
 * - **undated** — the rate is known and the window is not. The goal counts
 *   one period, and the series claim nothing: the plan places no series
 *   without dates (CON-496).
 * - **ok** — the ordinary case.
 */
export function planLine(t: TFunction, plan: SeriesPlan): string {
  if (plan.total === null) return t('series.plan.noGoal')
  if (plan.over > 0) {
    return t('series.plan.over', {
      total: plan.total,
      claimed: plan.claimed,
      over: plan.over,
    })
  }
  if (!plan.dated) {
    return t('series.plan.undated', { total: plan.total })
  }
  return t('series.plan.ok', {
    total: plan.total,
    claimed: plan.claimed,
    open: plan.open,
  })
}
