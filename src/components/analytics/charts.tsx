import { cn } from '@/lib'
import { extent, type Direction } from './format'
import type { Point } from './types'

/**
 * The charts, hand-rolled in SVG.
 *
 * There is no charting library in this repo and these don't justify adding
 * one: every shape here is a polyline, a band or a grid of rectangles, and
 * rolling them keeps the colours on semantic tokens instead of a library's own
 * palette. They take pre-shaped data and draw it — no scales to configure, no
 * axes to theme, nothing to tree-shake.
 *
 * All of them scale by `viewBox` with `preserveAspectRatio="none"` on the
 * plotting layer, so a chart fills whatever box it is given.
 */

const PAD = 2

function path(points: Point[], min: number, max: number, w: number, h: number): string {
  if (points.length === 0) return ''
  const span = max - min
  const step = points.length === 1 ? 0 : w / (points.length - 1)
  return points
    .map((p, i) => {
      const x = i * step
      const y = h - PAD - ((p.value - min) / span) * (h - PAD * 2)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

/** A bare line, no axes, sized by its container. For inline use in a tile. */
export function Sparkline({
  points,
  direction = 'flat',
  className,
}: {
  points: Point[]
  /** Colours the line by whether the movement was good news. */
  direction?: Direction | 'neutral'
  className?: string
}) {
  const { min, max } = extent([points])
  const stroke =
    direction === 'up'
      ? 'stroke-positive'
      : direction === 'down'
        ? 'stroke-negative'
        : 'stroke-tertiary-foreground'

  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      className={cn('h-6 w-full overflow-visible', className)}
      aria-hidden
    >
      <path
        d={path(points, min, max, 100, 24)}
        fill="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        className={stroke}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * The temporal axis, drawn as **progress**: the running total from the start of
 * the window to today, the same stretch a window ago ghosted behind it, and the
 * range we expected to land in.
 *
 * Both series arrive already accumulated (see `accumulate`), which is what
 * makes the band drawable at all — the band is a period *total*, and against a
 * per-day line it is off by a factor of the number of days, so the line ends up
 * pressed flat along the bottom of an apparently empty box. Accumulated, the
 * two share a unit and the band becomes a cone: nothing is unusual on day one,
 * and the room to be unusual widens as the window fills.
 *
 * The band is still the load-bearing part. Two lines say *different*; a line
 * leaving its cone says *unusual*, and only the second is worth interrupting
 * someone for.
 */
export function TrendChart({
  series,
  previousSeries,
  band,
  bandShape = 'cone',
  target,
  axis,
  className,
}: {
  /** Cumulative for a flow measure; the daily level for a level measure. */
  series: Point[]
  previousSeries?: Point[]
  /** Where the window normally *ends up*, in the same unit as the series. */
  band?: { low: number; high: number }
  /**
   * How the expectation is drawn. A **cone** for a running total — nothing is
   * unusual on day one, and the room to be unusual widens as the window fills.
   * A **flat** band for a measure that stands at a level rather than
   * accumulating, where the range applies just as much on the first day as on
   * the last.
   */
  bandShape?: 'cone' | 'flat'
  /** A line the series is aiming at, e.g. a goal's target. */
  target?: number
  /** The two ends of the window, spelled out under the plot. */
  axis?: { left: string; right: string }
  className?: string
}) {
  const W = 640
  const H = 180
  const all = [series, previousSeries ?? []]
  // A running total starts from nothing, so the floor belongs on the scale. A
  // level does not: forcing 0 onto a follower count that moves between 13.5K
  // and 14.2K flattens the entire movement into the top two pixels.
  if (bandShape === 'cone') all.push([{ date: '', value: 0 }])
  if (band) {
    all.push([
      { date: '', value: band.low },
      { date: '', value: band.high },
    ])
  }
  // Headroom above the target, or a target the series hasn't reached sits flat
  // against the top edge and reads as a border rather than a line to clear.
  if (target !== undefined) all.push([{ date: '', value: target * 1.08 }])
  const { min, max } = extent(all)
  const span = max - min
  const y = (value: number) => H - PAD - ((value - min) / span) * (H - PAD * 2)

  return (
    <div className={cn('relative w-full', className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-44 w-full"
        role="img"
        aria-label="Running total across the selected period"
      >
        {band &&
          (bandShape === 'cone' ? (
            <path
              d={`M0,${y(0)} L${W},${y(band.high)} L${W},${y(band.low)} Z`}
              className="fill-quaternary"
              opacity={0.55}
            />
          ) : (
            <rect
              x={0}
              y={y(band.high)}
              width={W}
              height={Math.max(1, y(band.low) - y(band.high))}
              className="fill-quaternary"
              opacity={0.55}
            />
          ))}

        {target !== undefined && (
          <line
            x1={0}
            x2={W}
            y1={y(target)}
            y2={y(target)}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
            className="stroke-tertiary-foreground"
          />
        )}

        {previousSeries && previousSeries.length > 0 && (
          <path
            d={path(previousSeries, min, max, W, H)}
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="1 3"
            vectorEffect="non-scaling-stroke"
            className="stroke-quinary-foreground"
          />
        )}

        <path
          d={path(series, min, max, W, H)}
          fill="none"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          className="stroke-foreground"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      {axis && (
        <div className="flex justify-between text-xs text-tertiary-foreground">
          <span>{axis.left}</span>
          <span>{axis.right}</span>
        </div>
      )}
    </div>
  )
}

const STROKE_TONE: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'stroke-chart-1',
  2: 'stroke-chart-2',
  3: 'stroke-chart-3',
  4: 'stroke-chart-4',
  5: 'stroke-chart-5',
}

export const FILL_TONE: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'bg-chart-1',
  2: 'bg-chart-2',
  3: 'bg-chart-3',
  4: 'bg-chart-4',
  5: 'bg-chart-5',
}

/**
 * Several sleeves on one pair of axes.
 *
 * A stack of separate sparklines is the wrong shape for this: each one scales
 * to its own range, so a sleeve earning a tenth of another draws an identical
 * line, and the comparison the section exists for is the one thing the reader
 * cannot do. One shared scale is the whole point — carousels sitting above
 * video has to *look* like carousels sitting above video.
 */
export function MultiSeriesChart({
  series,
  className,
}: {
  series: { id: string; label: string; tone: 1 | 2 | 3 | 4 | 5; points: Point[] }[]
  className?: string
}) {
  const W = 640
  const H = 140
  const { min, max } = extent([...series.map((s) => s.points), [{ date: '', value: 0 }]])

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn('h-32 w-full', className)}
      role="img"
      aria-label={`Compared over the period: ${series.map((s) => s.label).join(', ')}`}
    >
      {series.map((s) => (
        <path
          key={s.id}
          d={path(s.points, min, max, W, H)}
          fill="none"
          strokeWidth={1.75}
          vectorEffect="non-scaling-stroke"
          className={STROKE_TONE[s.tone]}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

/** The 7×24 grid behind "when does our audience actually show up". */
export function Heatmap({
  grid,
  className,
}: {
  /** Seven rows, Monday first; 24 columns; each cell 0–1. */
  grid: number[][]
  className?: string
}) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex gap-1 pl-8">
        {Array.from({ length: 24 }, (_, h) => (
          <span
            key={h}
            className="min-w-0 flex-1 text-center text-[0.5rem] leading-3 text-tertiary-foreground"
          >
            {h % 6 === 0 ? h : ''}
          </span>
        ))}
      </div>
      {grid.map((row, d) => (
        <div key={days[d]} className="flex items-center gap-1">
          <span className="w-7 shrink-0 text-[0.625rem] text-secondary-foreground">
            {days[d]}
          </span>
          {row.map((cell, h) => (
            <div
              key={h}
              className="h-4 min-w-0 flex-1 rounded-[2px] bg-foreground"
              // Opacity rather than a colour ramp: one hue, so the eye reads
              // intensity instead of hunting for a legend.
              style={{ opacity: 0.06 + cell * 0.84 }}
              title={`${days[d]} ${h}:00`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * How a post's engagement accumulates after publishing. Read once, it tells
 * you a post's shelf life; read against a post's age it tells you whether the
 * numbers on screen are final or still moving.
 */
export function DecayCurve({
  points,
  markerHour,
  milestones = [],
  height = 'sm',
  className,
}: {
  points: { hour: number; share: number }[]
  /** Where this post currently sits on the curve. */
  markerHour?: number
  /** Shares worth calling out — 50/75/95%, drawn as guides down to the axis. */
  milestones?: { share: number; hour: number }[]
  height?: 'sm' | 'md'
  className?: string
}) {
  const W = 240
  const H = 64
  const maxHour = Math.max(...points.map((p) => p.hour), 1)
  const x = (hour: number) => (hour / maxHour) * W
  const y = (share: number) => H - PAD - share * (H - PAD * 2)
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.hour).toFixed(2)},${y(p.share).toFixed(2)}`)
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn('w-full', height === 'md' ? 'h-28' : 'h-16', className)}
      role="img"
      aria-label="Share of a post's eventual engagement earned by each hour since publishing"
    >
      <path
        d={`${d} L${W},${H} L0,${H} Z`}
        className="fill-quaternary"
        opacity={0.5}
      />

      {milestones.map((m) => (
        <g key={m.share} className="stroke-quinary-foreground">
          <line
            x1={0}
            x2={x(m.hour)}
            y1={y(m.share)}
            y2={y(m.share)}
            strokeWidth={1}
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={x(m.hour)}
            x2={x(m.hour)}
            y1={y(m.share)}
            y2={H}
            strokeWidth={1}
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}

      <path
        d={d}
        fill="none"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        className="stroke-foreground"
        strokeLinejoin="round"
      />

      {markerHour !== undefined && (
        <line
          x1={x(markerHour)}
          x2={x(markerHour)}
          y1={0}
          y2={H}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          className="stroke-accent"
        />
      )}
    </svg>
  )
}

/**
 * A proportional bar, for ranking things against each other.
 *
 * `neutral` when the rows have no line in a chart to match — a key colour that
 * keys nothing invites the reader to look for a legend that isn't there.
 */
export function RankBar({
  fraction,
  tone = 'neutral',
  className,
}: {
  /** 0–1, relative to the leader. */
  fraction: number
  tone?: 1 | 2 | 3 | 4 | 5 | 'neutral'
  className?: string
}) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-quaternary', className)}>
      <div
        className={cn(
          'h-full rounded-full',
          tone === 'neutral' ? 'bg-tertiary-foreground' : FILL_TONE[tone],
        )}
        style={{ width: `${Math.max(2, fraction * 100)}%` }}
      />
    </div>
  )
}

/**
 * A post against typical, drawn from the middle out.
 *
 * Two decisions, both because this bar is read as "how far off normal is this":
 *
 * **It diverges.** Typical sits at the centre line, ahead runs right, behind
 * runs left. A left-anchored bar would draw a post at 0.4× as a short bar and a
 * post at 1.1× as a slightly longer one, which is a picture of *size* — but the
 * question this section asks is *deviation*, and only a shared centre answers
 * it at a glance.
 *
 * **It is logarithmic.** Half as good and twice as good are the same size of
 * miss, and a linear scale draws 0.5× as a sliver next to a 2× that runs off
 * the end. `log2` clamped to ±2 puts 0.25× and 4× on the two edges, symmetric
 * about 1.
 */
export function PaceBar({
  pace,
  placement,
  className,
}: {
  /** 1 is exactly typical for this workspace at this post's age. */
  pace: number
  placement: 'ahead' | 'usual' | 'behind'
  className?: string
}) {
  const t = Math.max(-1, Math.min(1, Math.log2(Math.max(pace, 0.01)) / 2))
  const width = Math.max(1.5, Math.abs(t) * 50)
  const left = t < 0 ? 50 - width : 50

  return (
    <div className={cn('relative h-1.5 w-full rounded-full bg-quaternary', className)}>
      <div
        className={cn(
          'absolute inset-y-0 rounded-full',
          placement === 'ahead'
            ? 'bg-positive'
            : placement === 'behind'
              ? 'bg-negative'
              : 'bg-tertiary-foreground',
        )}
        style={{ left: `${left}%`, width: `${width}%` }}
      />
      {/* The centre line is what makes the bar readable, so it is drawn over
          the fill rather than under it. */}
      <span
        className="absolute inset-y-[-2px] left-1/2 w-px -translate-x-1/2 bg-quaternary-foreground"
        aria-hidden
      />
    </div>
  )
}

/** The key dot that ties a row in a list to its line in a chart. */
export function ToneDot({ tone = 1 }: { tone?: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <span
      className={cn('size-2 shrink-0 rounded-full', FILL_TONE[tone])}
      aria-hidden
    />
  )
}
