import { MEASURES, type MeasureId, type MeasureMeta, type Point } from './types'

/**
 * Formatting and delta arithmetic for the analytics surfaces. Pure, so the
 * rules that decide whether something counts as "unusual" can be argued with
 * in a test rather than read out of a component.
 */

/** `1,204` · `12.4K` · `3.1M`. Compact only once it stops being readable. */
export function formatCount(value: number): string {
  const abs = Math.abs(value)
  if (abs < 10_000) return value.toLocaleString('en-US')
  if (abs < 1_000_000) return `${trim(value / 1_000)}K`
  return `${trim(value / 1_000_000)}M`
}

function trim(value: number): string {
  // One decimal, but never a trailing `.0` — `12K` reads better than `12.0K`.
  return value.toFixed(1).replace(/\.0$/, '')
}

/** `15 Jul`. Named days rather than "the period before" — see `NowView`. */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

/** `19h` · `3d 10h`. Hours stop being readable somewhere around two days. */
export function formatHours(hours: number): string {
  const h = Math.round(hours)
  if (h < 48) return `${h}h`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

/** A rate held as a fraction, rendered as a percentage. */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function formatMeasure(measure: MeasureId, value: number): string {
  return MEASURES[measure].format === 'percent'
    ? formatPercent(value)
    : formatCount(value)
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
  const good = direction === 'flat' ? true : (direction === 'up') === (better === 'up')
  return { fraction, direction, good }
}

export function formatDelta(d: Delta): string {
  if (d.direction === 'flat') return 'about the same'
  const pct = Math.abs(d.fraction) * 100
  const rendered = pct >= 100 ? `${(pct / 100 + 1).toFixed(1)}×` : `${Math.round(pct)}%`
  return `${d.direction === 'up' ? '+' : '−'}${rendered}`
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

export function verdictLabel(measure: MeasureId, v: Verdict): string {
  const noun = MEASURES[measure].label.toLowerCase()
  if (v === 'within') return `Normal for your ${noun}`
  return v === 'above' ? 'Above your usual range' : 'Below your usual range'
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
  return summed.map((p) => ({ date: p.date, value: Math.round(p.value * factor) }))
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
export function supports(sample: number, claim: 'rank' | 'pattern' | 'timing'): boolean {
  if (claim === 'rank') return sample >= 5
  if (claim === 'pattern') return sample >= 15
  return sample >= 30
}
