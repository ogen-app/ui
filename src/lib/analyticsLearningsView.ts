import type { TFunction } from 'i18next'
import { formatCount, formatHours } from '@/components/analytics/format'
import { checkedAt } from '@/lib/analyticsFreshness'
import { formatDate, formatNumber } from '@/lib/intl'
import { hasHistory } from '@/services/api/analytics'
import type {
  AnalyticsLearnings,
  HeatmapCell,
  LearningsHeatmap,
  LearningsLifespan,
  LearningsMetric,
  LearningsPattern,
  LearningsPatterns,
  LearningsSection,
} from '@/types/analytics'

/**
 * `GET /api/analytics/learnings` (CON-239) onto what the card draws.
 *
 * The third and last of the trilogy, and the only one that is **not** a period
 * view: a heatmap of the slots this workspace publishes into, the curve a post
 * follows after it goes out, and the structural patterns the server mined from
 * post metadata. None of it belongs to a date range — "your posts land on
 * Thursday evenings" is not a fact about the last 28 days — which is why the
 * card is marked `all-time` and the page's period picker visibly does not reach
 * it.
 *
 * Unlike the performers board, the design harness's model *is* close enough to
 * map (`components/analytics/StandingSections`, `PatternsSection`), and
 * `docs/analytics-contract.md` §2.2 already tabulated the differences. Four of
 * them cost real work rather than a rename:
 *
 * - **The grid is sparse and Sunday-first.** The wire sends one cell per slot
 *   that has a post, indexed `0 = Sunday` to match `/best-times`; the chart
 *   wants seven Monday-first rows of twenty-four. Both the grid and the
 *   re-basing happen here — and an unpublished slot stays `null` rather than
 *   becoming a zero, because "you have never posted then" and "you post then
 *   and it does nothing" are opposite findings that a shared scale would draw
 *   identically.
 * - **The hours are UTC.** The server buckets on a fixed display timezone
 *   (default UTC) and sends no offset, so every slot label says so. Shifting
 *   them into the reader's zone would need the offset that applied on each
 *   post's own date, which an aggregate over a year of posts cannot recover.
 * - **Three scalars, not a list of milestones.** `t50/t75/t95_hours` are
 *   assembled into the marks the curve draws.
 * - **There is no confidence enum**, and none is invented. The server enforces
 *   its own minimum support and withdraws a whole section below it, so every
 *   card that arrives is one the server was willing to stand behind; grading it
 *   again on this side would put a second, different threshold in front of the
 *   reader. Same rule as the performers board's `direction`.
 */

/**
 * What the mining can be pointed at. Anything else is a 400. What each is
 * called is `analytics.learned.metrics.<id>` — read with {@link metricLabel}.
 */
export const LEARNINGS_METRICS: LearningsMetric[] = ['reach', 'saves']

export const DEFAULT_LEARNINGS_METRIC: LearningsMetric = 'reach'

/**
 * Monday first, as the grid is drawn, in the app's language — `Intl` knows
 * every language's weekday names, so there is no table. The wire's index is
 * re-based into this by `dayRow`.
 */
function dayName(row: number, locale: string): string {
  return (
    formatDate(
      new Date(Date.UTC(2024, 0, 1 + row)),
      { weekday: 'long', timeZone: 'UTC' },
      locale,
    ) ?? ''
  )
}

/**
 * `0 = Sunday` on the wire (the `/best-times` convention) into a Monday-first
 * row index. Out-of-range days are dropped rather than wrapped onto a real one.
 */
function dayRow(dayOfWeek: number): number | null {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6)
    return null
  return (dayOfWeek + 6) % 7
}

/** `18:00`. */
function hourLabel(t: TFunction, hour: number): string {
  return t('analytics.units.hourOfDay', {
    hour: String(hour).padStart(2, '0'),
  })
}

export interface SlotView {
  /** 0–1 against the strongest slot — the shading. */
  score: number
  postCount: number
  /** `Thursday 18:00 UTC · 6 posts · 12.4K median reach`. */
  title: string
}

export interface HeatmapView {
  /** Seven Monday-first rows of 24. `null` is a slot never published into. */
  grid: (SlotView | null)[][]
  /** `Thursday 18:00 UTC`, or `null` when no slot stood out. */
  strongest: { label: string; postCount: number } | null
  measuredPosts: number
  /** `reach` / `saves`, echoed by the server. */
  metric: string
}

export interface LifespanView {
  settledPosts: number
  /** In `DecayCurve`'s vocabulary. Empty when the server sent no points. */
  curve: { hour: number; share: number }[]
  /** 50/75/95%, as guides on that curve. */
  milestones: { share: number; hour: number }[]
  /** `19h` — how long half of everything a post earns takes to arrive. */
  half: string
  /** `5d 4h` — the curve's right edge. */
  horizon: string
}

export interface PatternView {
  id: string
  headline: string
  detail: string
  /** `+60%` above the median, `−34%` across the trend window. */
  figure: string | null
  /** `18 posts`. */
  support: string
  /** The card's own metric, which the miner picks per segment. */
  metric: string
}

export interface LearningsView {
  /** `null` where the server said the section has too little history. */
  heatmap: HeatmapView | null
  lifespan: LifespanView | null
  patterns: { works: PatternView[]; fading: PatternView[] } | null
  /**
   * `since 1 Jan 2026`, or `null` for the default — which is all of it.
   *
   * Null rather than a phrase because the card already says "All time" in its
   * header; a qualifier repeating it in other words is the same fact twice.
   */
  historySince: string | null
  /** `90 days` — what the fading column compares against. */
  trendWindow: string
  measuredPosts: number
  settledPosts: number
  metric: LearningsMetric
  lastRefreshedAt?: string
}

/**
 * The sparse cells into the grid the chart draws.
 *
 * A cell the server did not send is a slot with no posts in it, and stays
 * `null` all the way to the chart so it can be drawn as absent rather than as
 * the bottom of the scale.
 */
function readGrid(
  t: TFunction,
  locale: string,
  cells: HeatmapCell[],
  metric: string,
): (SlotView | null)[][] {
  const grid: (SlotView | null)[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => null),
  )

  for (const cell of cells) {
    const row = dayRow(cell.day_of_week)
    if (row === null) continue
    if (!Number.isInteger(cell.hour) || cell.hour < 0 || cell.hour > 23)
      continue

    grid[row][cell.hour] = {
      score: cell.score,
      postCount: cell.post_count,
      title: t('analytics.learned.slotCell', {
        slot: slotLabel(t, locale, row, cell.hour),
        posts: t('analytics.units.posts', { count: cell.post_count }),
        value: formatCount(t, cell.median),
        metric,
      }),
    }
  }

  return grid
}

/**
 * `Thursday 18:00 UTC` — the slot as someone would say it out loud, with the
 * clock it is on.
 *
 * The zone is on the label rather than only in the note at the foot: the server
 * buckets on a fixed display timezone and sends no offset, and a workspace three
 * hours ahead reading "18:00" as its own evening would rearrange its week around
 * the wrong slot.
 */
function slotLabel(
  t: TFunction,
  locale: string,
  row: number,
  hour: number,
): string {
  return t('analytics.units.slotUtc', {
    day: dayName(row, locale),
    hour: hourLabel(t, hour),
  })
}

function readHeatmap(
  t: TFunction,
  locale: string,
  section: LearningsSection<LearningsHeatmap>,
): HeatmapView | null {
  if (!hasHistory(section)) return null

  const best = section.strongest
  const bestRow = best ? dayRow(best.day_of_week) : null

  return {
    grid: readGrid(t, locale, section.cells, section.metric),
    strongest:
      best && bestRow !== null
        ? {
            label: slotLabel(t, locale, bestRow, best.hour),
            postCount: best.post_count,
          }
        : null,
    measuredPosts: section.measured_posts,
    metric: section.metric,
  }
}

function readLifespan(
  t: TFunction,
  section: LearningsSection<LearningsLifespan>,
): LifespanView | null {
  if (!hasHistory(section)) return null

  return {
    settledPosts: section.settled_posts,
    curve: section.curve.map((point) => ({
      hour: point.age_hours,
      share: point.share_of_final,
    })),
    milestones: [
      { share: 0.5, hour: section.t50_hours },
      { share: 0.75, hour: section.t75_hours },
      { share: 0.95, hour: section.t95_hours },
    ],
    half: formatHours(t, section.t50_hours),
    horizon: formatHours(t, section.horizon_hours),
  }
}

/**
 * A card's headline figure.
 *
 * Signed percentages rather than the raw multiplier, so the two columns read in
 * one unit — `1.6×` beside `0.66×` makes the reader convert one of them. What
 * each is measured *against* differs (a `works` lift is against the workspace's
 * median, a `fading` trend is against the same segment's previous stretch), and
 * that referent is named once per column rather than repeated on every card.
 */
function figureOf(t: TFunction, pattern: LearningsPattern): string | null {
  const ratio = pattern.lift ?? pattern.trend
  if (ratio === undefined || !Number.isFinite(ratio)) return null
  const change = Math.round((ratio - 1) * 100)
  if (change === 0) return null
  const percent = t('analytics.units.percent', {
    value: formatNumber(Math.abs(change)),
  })
  return change > 0
    ? t('analytics.units.deltaUp', { value: percent })
    : t('analytics.units.deltaDown', { value: percent })
}

function readPattern(t: TFunction, pattern: LearningsPattern): PatternView {
  return {
    id: pattern.id,
    headline: pattern.headline,
    detail: pattern.detail,
    figure: figureOf(t, pattern),
    // No confidence grade beside it: the server already refused to emit
    // anything below its own minimum support, so a second threshold here would
    // second-guess a card it decided was worth sending.
    support: t('analytics.learned.patternSupport', { count: pattern.support }),
    // The miner picks whichever of reach/saves gives the strongest signal for
    // that segment, so a card's metric is not necessarily the one asked for.
    metric: pattern.metric,
  }
}

function readPatterns(
  t: TFunction,
  section: LearningsSection<LearningsPatterns>,
): { works: PatternView[]; fading: PatternView[] } | null {
  if (!hasHistory(section)) return null
  return {
    works: (section.works ?? []).map((p) => readPattern(t, p)),
    fading: (section.fading ?? []).map((p) => readPattern(t, p)),
  }
}

/**
 * How far back the lessons reach, when that is not simply "all of it".
 *
 * In the app's language, like every other date on the surface — the pin to
 * `en-GB` that used to sit here came out with the performers board's and with
 * `format.ts`'s axis, which were all pinned to agree with each other. They
 * still agree; all three now read the active locale.
 */
function historyPhrase(t: TFunction, since: string | null): string | null {
  if (!since) return null
  const formatted = formatDate(since, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return formatted ? t('analytics.learned.since', { date: formatted }) : null
}

export function buildLearningsView(
  t: TFunction,
  locale: string,
  learnings: AnalyticsLearnings,
): LearningsView {
  const { scope } = learnings

  return {
    heatmap: readHeatmap(t, locale, learnings.heatmap),
    lifespan: readLifespan(t, learnings.lifespan),
    patterns: readPatterns(t, learnings.patterns),
    historySince: historyPhrase(t, scope.since),
    trendWindow: t('analytics.learned.trendWindowDays', {
      count: scope.trend_window_days,
    }),
    measuredPosts: scope.measured_posts,
    settledPosts: scope.settled_posts,
    metric: scope.metric,
    lastRefreshedAt: checkedAt(learnings.updated_at),
  }
}

/** What the mined metric is called, for the picker. */
export function metricLabel(t: TFunction, metric: LearningsMetric): string {
  return t(`analytics.learned.metrics.${metric}` as const)
}
