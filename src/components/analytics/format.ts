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

/**
 * The window as it reads inside a card's title — `over last 28 days`, `today`.
 *
 * The period belongs to the heading rather than to the corner: "What happened"
 * and "over last 28 days" are one phrase, and a window sitting in the corner
 * reads as a control someone could change. Only a stretch takes *over* —
 * "What happened over today" is not a sentence, and a period picker hands us
 * both kinds of label.
 */
export function periodPhrase(period: Period): string {
  const label = period.label.toLowerCase()
  return /^last\b/i.test(period.label) ? `over ${label}` : label
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
  const good =
    direction === 'flat' ? true : (direction === 'up') === (better === 'up')
  return { fraction, direction, good }
}

export function formatDelta(d: Delta): string {
  if (d.direction === 'flat') return 'about the same'
  const pct = Math.abs(d.fraction) * 100
  const rendered =
    pct >= 100 ? `${(pct / 100 + 1).toFixed(1)}×` : `${Math.round(pct)}%`
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
  return summed.map((p) => ({
    date: p.date,
    value: Math.round(p.value * factor),
  }))
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
