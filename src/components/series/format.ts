import type { TFunction } from 'i18next'
import { contentFormatLabel } from '@/lib/contentFormats'
import type { SeriesPlan } from '@/lib/seriesPlan'
import type { ContentSeries, SeriesRhythm, SeriesSupply } from './types'

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
  return rhythm.per === 'week'
    ? t('series.rhythm.perWeek', { count: rhythm.times })
    : t('series.rhythm.perMonth', { count: rhythm.times })
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
 * - **undated** — the rate is known and the window is not, so the arithmetic
 *   counts one period. Says so, rather than presenting one period's worth as a
 *   campaign total.
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
    return t('series.plan.undated', {
      total: plan.total,
      claimed: plan.claimed,
    })
  }
  return t('series.plan.ok', {
    total: plan.total,
    claimed: plan.claimed,
    open: plan.open,
  })
}
