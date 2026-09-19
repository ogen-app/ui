import type { TFunction } from 'i18next'
import { formatDate, formatNumber } from '@/lib/intl'
import {
  MEASURES,
  type MeasureId,
  type MeasureMeta,
  type Period,
  type Point,
  type PostInterval,
  type PostSeriesPoint,
} from './types'

/**
 * Formatting and delta arithmetic for the analytics surfaces. Pure, so the
 * rules that decide whether something counts as "unusual" can be argued with
 * in a test rather than read out of a component.
 *
 * **Everything that produces words takes `t`.** These are plain functions, not
 * components, so there is no render to rebuild a label on — a module-level
 * string here would freeze whichever language loaded first, which is the exact
 * trap `CLAUDE.md` names. Passing `t` in also keeps them testable: a test pins
 * a language by passing that language's `t`, rather than by reaching into
 * i18next.
 *
 * Numbers and dates go through `lib/intl`, which reads the *app's* language
 * rather than the browser's. This module used to pin `en-US` for thousands
 * separators and `en-GB` for the axis; both were the browser-locale bug with
 * the locale written out, and a Spanish workspace reading `12,400` as twelve
 * point four is the kind of wrong that never announces itself.
 */

/** `1,204` · `12.4K` · `3.1M`. Compact only once it stops being readable. */
export function formatCount(t: TFunction, value: number): string {
  const abs = Math.abs(value)
  if (abs < 10_000) return formatNumber(value)
  if (abs < 1_000_000)
    return t('analytics.units.thousand', { value: trim(value / 1_000) })
  return t('analytics.units.million', { value: trim(value / 1_000_000) })
}

function trim(value: number): string {
  // One decimal, but never a trailing `.0` — `12K` reads better than `12.0K`.
  // Rounded before formatting rather than after: `maximumFractionDigits` and a
  // locale that writes a comma for the point cannot be undone by a regex.
  const rounded = Math.round(value * 10) / 10
  return formatNumber(rounded, { maximumFractionDigits: 1 })
}

/**
 * `15 Jul`. Named days rather than "the period before" — see `NowView`.
 *
 * UTC, because these are bucket keys the server cut on UTC days: rendering
 * `2026-08-01` in a zone behind it would date the column to July.
 */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return formatDate(new Date(Date.UTC(y, m - 1, d)), {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

/**
 * The window as it reads inside a card's title — `over last 28 days`, `today`.
 *
 * The period belongs to the heading rather than to the corner: "What happened"
 * and "over last 28 days" are one phrase, and a window sitting in the corner
 * reads as a control someone could change. Only a stretch takes *over* —
 * "What happened over today" is not a sentence, and a period picker hands us
 * both kinds of label.
 *
 * `days` rather than the label's own text decides which of the two it is. The
 * label is already translated by whoever built the period, so matching `/^last/`
 * on it was a rule that only worked in English.
 */
export function periodPhrase(t: TFunction, period: Period): string {
  return period.days > 1
    ? t('analytics.units.over', { period: period.label })
    : period.label
}

/** `19h` · `3d 10h`. Hours stop being readable somewhere around two days. */
export function formatHours(t: TFunction, hours: number): string {
  const h = Math.round(hours)
  if (h < 48) return t('analytics.units.hours', { count: h })
  return t('analytics.units.daysHours', {
    days: Math.floor(h / 24),
    hours: h % 24,
  })
}

/** A rate held as a fraction, rendered as a percentage. */
export function formatPercent(t: TFunction, value: number): string {
  return t('analytics.units.percent', {
    value: formatNumber(value * 100, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
  })
}

export function formatMeasure(
  t: TFunction,
  measure: MeasureId,
  value: number,
): string {
  return MEASURES[measure].format === 'percent'
    ? formatPercent(t, value)
    : formatCount(t, value)
}

/**
 * Mon–Sun, abbreviated, in the app's language.
 *
 * No table: `Intl` already knows every language's weekday names, and a hard-coded
 * `['Mon', …]` is exactly the module-level label map that freezes whichever
 * language loaded first. The dates are arbitrary — 2024-01-01 was a Monday — and
 * pinned to UTC so a zone behind it doesn't shift the whole row by a day.
 */
export function shortWeekdays(locale?: string): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    formatDate(
      new Date(Date.UTC(2024, 0, 1 + i)),
      { weekday: 'short', timeZone: 'UTC' },
      locale,
    ),
  )
}

/**
 * What a measure is called, in the three places it is named.
 *
 * Read through here rather than off `MEASURES`, which carries no words — see
 * the note on {@link MeasureMeta}. `hint` comes back `undefined` rather than
 * empty so a call site can put it straight in a `title` without painting an
 * empty tooltip on the two measures whose labels already say where the number
 * comes from.
 */
export function measureCopy(
  t: TFunction,
  measure: MeasureId,
): { label: string; periodLabel: string; hint: string | undefined } {
  const hint = t(`analytics.measures.${measure}.hint` as const)
  return {
    label: t(`analytics.measures.${measure}.label` as const),
    periodLabel: t(`analytics.measures.${measure}.periodLabel` as const),
    hint: hint || undefined,
  }
}

export type Direction = 'up' | 'down' | 'flat'

export interface Delta {
  /** Signed fraction: `0.34` is a 34% rise. */
  fraction: number
  direction: Direction
  /** Whether the movement is good news, given the measure. */
  good: boolean
}

/**
 * Movement below this is noise dressed as a trend. Under it we say "about the
 * same" rather than draw an arrow — an arrow on a 0.4% wobble teaches people
 * to distrust every arrow on the page.
 */
const FLAT_BAND = 0.02

export function delta(
  measure: MeasureId,
  value: number,
  previous: number | null,
): Delta | null {
  if (previous === null || previous === 0) return null
  const fraction = (value - previous) / Math.abs(previous)
  const direction: Direction =
    Math.abs(fraction) < FLAT_BAND ? 'flat' : fraction > 0 ? 'up' : 'down'
  const better = MEASURES[measure].better
  const good =
    direction === 'flat' ? true : (direction === 'up') === (better === 'up')
  return { fraction, direction, good }
}

export function formatDelta(t: TFunction, d: Delta): string {
  if (d.direction === 'flat') return t('analytics.units.aboutTheSame')
  const pct = Math.abs(d.fraction) * 100
  // The multiplier form is for growth only. A count cannot fall by more than
  // 100%, so the only downward value that could reach this branch is a total
  // collapse — and "down 2.0×" is not what −100% means.
  const rendered =
    d.direction === 'up' && pct >= 100
      ? t('analytics.units.multiplier', {
          value: formatNumber(pct / 100 + 1, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          }),
        })
      : t('analytics.units.percent', { value: formatNumber(Math.round(pct)) })
  return d.direction === 'up'
    ? t('analytics.units.deltaUp', { value: rendered })
    : t('analytics.units.deltaDown', { value: rendered })
}

export type Verdict = 'above' | 'within' | 'below'

/**
 * The half of the temporal axis that a previous-period delta can't do: is this
 * merely different, or is it outside what this workspace normally does?
 */
export function verdict(
  value: number,
  expected: { low: number; high: number } | null,
): Verdict | null {
  if (!expected) return null
  if (value > expected.high) return 'above'
  if (value < expected.low) return 'below'
  return 'within'
}

/** Whether a verdict is good news, given which way the measure should go. */
export function verdictIsGood(measure: MeasureId, v: Verdict): boolean | null {
  if (v === 'within') return null
  const better = MEASURES[measure].better
  return (v === 'above') === (better === 'up')
}

/** The measure's own metadata, for callers that need the label or the hint. */
export function measureMeta(measure: MeasureId): MeasureMeta {
  return MEASURES[measure]
}

/**
 * Running total, ending exactly on `total`.
 *
 * Two jobs, both about the chart telling the same story as the numbers above
 * it. Accumulating puts the line in the same unit as the expectation band —
 * a period total — so the band no longer dwarfs the line and flattens it into
 * the floor of the box. Scaling to `total` guarantees the line's last point is
 * the headline figure, so nobody has to wonder whether the chart and the tile
 * are counting the same thing.
 */
export function accumulate(points: Point[], total: number): Point[] {
  let running = 0
  const summed = points.map((p) => {
    running += p.value
    return { date: p.date, value: running }
  })
  const end = summed[summed.length - 1]?.value ?? 0
  if (end === 0) return summed
  const factor = total / end
  return summed.map((p) => ({
    date: p.date,
    value: Math.round(p.value * factor),
  }))
}

/**
 * The points a measure is drawn from — wherever it is drawn.
 *
 * Both the tile's sparkline and the detail chart under it come through here,
 * because the two are one measure over one window and the only way they can
 * disagree about its shape is by holding a copy of this rule each. They did,
 * and they drifted: the tile drew per-day buckets under a label reading
 * "Cumulative reach" while the chart below drew the running total.
 *
 * A **flow** is accumulated into the period total it is labelled with. A
 * **level** is already the number on the day. **Columns** are drawn from the
 * raw buckets whatever their kind — the point of bars is the day-to-day
 * quantity, and a running total in bars is a staircase nobody reads.
 */
export function drawnSeries(
  meta: MeasureMeta,
  points: Point[],
  /** The headline figure the accumulated line has to land on. */
  total: number,
): Point[] {
  if (meta.chart === 'columns' || meta.kind !== 'flow') return points
  return accumulate(points, total)
}

/* ---------------------------------------------------------- post history -- */

/**
 * Hourly buckets summed into days.
 *
 * A partial last day keeps its real elapsed hour and its real timestamp rather
 * than being rounded up to the next midnight — the axis under a day chart is
 * dated, and a post that went out this morning must not get a column labelled
 * tomorrow.
 */
export function bucketSeries(
  points: PostSeriesPoint[],
  interval: PostInterval,
): PostSeriesPoint[] {
  if (interval === 'hour') return points
  const out: PostSeriesPoint[] = []
  let currentDay = 0
  for (const point of points) {
    const day = Math.max(1, Math.ceil(point.hour / 24))
    if (day === currentDay) {
      const last = out[out.length - 1]
      out[out.length - 1] = {
        at: point.at,
        hour: point.hour,
        value: last.value + point.value,
      }
    } else {
      out.push({ ...point })
      currentDay = day
    }
  }
  return out
}

/**
 * Buckets turned into the running total.
 *
 * Unlike {@link accumulate} there is nothing to scale to: a post's series is
 * the whole of its life, so the last point *is* the total and the figure in the
 * tile above. The campaign chart has to scale because its window is a slice of
 * a longer history.
 */
export function runningTotal(points: PostSeriesPoint[]): PostSeriesPoint[] {
  let running = 0
  return points.map((p) => {
    running += p.value
    return { at: p.at, hour: p.hour, value: running }
  })
}

/**
 * A rate, recomputed at whatever bucketing is on screen.
 *
 * The only honest way to draw an engagement rate over time: it cannot be summed
 * into a day or accumulated into a running total — that is the "cumulative
 * engagement rate" `MeasureMeta.kind` exists to forbid — so it is divided fresh
 * from two flows that *can* be. Feed it the accumulated pair and it is the rate
 * so far; feed it the raw buckets and it is the rate that hour.
 *
 * **A rate needs a denominator before it means anything.** One interaction on
 * one person reached is a 100% engagement rate, and in the long quiet tail of a
 * post there are dozens of them — enough to own the scale of the chart and press
 * every hour that mattered flat against the floor. Buckets under `floor` are
 * left out rather than divided, so a gap on a rate means *too quiet to say* as
 * well as *nothing happened*; the card states that where the chart is legended.
 *
 * A running total needs no floor and is passed none: its denominator is the
 * post's whole reach so far, and zeroing its opening point would draw a post
 * that started at 0% and jumped.
 */
export function ratioSeries(
  numerator: PostSeriesPoint[],
  denominator: PostSeriesPoint[],
  floor = 0,
): PostSeriesPoint[] {
  return numerator.map((n, i) => {
    const d = denominator[i]?.value ?? 0
    return {
      at: n.at,
      hour: n.hour,
      value: d >= floor && d > 0 ? n.value / d : 0,
    }
  })
}

/**
 * How much has to have arrived in a bucket before a rate drawn from it is worth
 * looking at: fifty people, or a fiftieth of the biggest bucket, whichever is
 * larger.
 *
 * Both halves are load-bearing. The absolute floor is what stops a post that
 * only ever reached six hundred people producing an hour of 1-in-1; the relative
 * one is what stops a post that reached two hundred thousand from treating an
 * hour of ninety as signal. Blunt on purpose, and the same species of number as
 * the sample gates — see `supports`.
 */
export function rateFloor(denominator: PostSeriesPoint[]): number {
  return Math.max(50, Math.max(...denominator.map((p) => p.value), 0) * 0.02)
}

/** Min and max of a set of series, so several can share one scale. */
export function extent(series: Point[][]): { min: number; max: number } {
  const values = series.flat().map((p) => p.value)
  if (values.length === 0) return { min: 0, max: 1 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  // A flat line still needs a band to sit in, or it divides by zero.
  return max === min ? { min: min - 1, max: max + 1 } : { min, max }
}

/**
 * Whether a sample can carry a claim. The thresholds are deliberately blunt
 * and deliberately here: every surface asks the same question, and a
 * best-time heatmap built from nine posts is confidently wrong.
 */
export function supports(
  sample: number,
  claim: 'rank' | 'pattern' | 'timing',
): boolean {
  if (claim === 'rank') return sample >= 5
  if (claim === 'pattern') return sample >= 15
  return sample >= 30
}
