import { cn } from '@/lib'
import { extent, formatDay, formatHours, type Direction } from './format'
import type { Point, Publication } from './types'

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

function path(
  points: Point[],
  min: number,
  max: number,
  w: number,
  h: number,
): string {
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
 * A `Sparkline` for a measure that is drawn as columns.
 *
 * The tile has to preview the chart it opens. A line inside the engagement-rate
 * tile above a column chart is the same quantity drawn two ways on one card,
 * and the reader has to work out that they are the same thing before they can
 * read either.
 */
export function Sparkbars({
  points,
  direction = 'flat',
  className,
}: {
  points: Point[]
  direction?: Direction | 'neutral'
  className?: string
}) {
  const W = 100
  const H = 24
  const { max } = extent([points, [{ date: '', value: 0 }]])
  const top = max * 1.06 || 1
  const slot = W / Math.max(points.length, 1)
  const barWidth = Math.max(0.5, slot * 0.62)
  const fill =
    direction === 'up'
      ? 'fill-positive'
      : direction === 'down'
        ? 'fill-negative'
        : 'fill-tertiary-foreground'

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      // Held back to roughly the ink of the sparklines beside it. Twenty-eight
      // filled bars carry far more colour than a 1.5px stroke, so at full
      // strength the one tile drawn as columns shouts across a row where every
      // tile is meant to be equally readable.
      opacity={0.55}
      className={cn('h-6 w-full', className)}
      aria-hidden
    >
      {points.map((point, i) => {
        const height = Math.max(0.5, (point.value / top) * H)
        return (
          <rect
            key={point.date || i}
            x={i * slot + (slot - barWidth) / 2}
            y={H - height}
            width={barWidth}
            height={height}
            className={fill}
          />
        )
      })}
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
  endLabel,
  tickCount,
  publications,
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
  /**
   * What the last tick is called. The rest are dates read off the series —
   * "Today" is the one label a date can't carry, because a screenshot of it
   * taken next week would still say today.
   */
  endLabel?: string
  /** Roughly how many date ticks to draw. 0 turns the row off entirely. */
  tickCount?: number
  /** When posts went out. Drawn between the plot and the dates. */
  publications?: Publication[]
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
  const ticks = dateTicks(series, tickCount, endLabel)

  return (
    <div className={cn('relative w-full', className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-44 w-full"
        role="img"
        aria-label="Running total across the selected period"
      >
        {/*
          Drawn first, so the band, the target and the line all pass over them.
          A gridline that competes with the data is worse than no gridline —
          these exist only so a bend in the line can be given a date without
          counting pixels from the left edge.
        */}
        {ticks.slice(1, -1).map((tick) => (
          <line
            key={tick.index}
            x1={tick.fraction * W}
            x2={tick.fraction * W}
            y1={0}
            y2={H}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            className="stroke-quaternary"
          />
        ))}

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

      <PublicationRail
        series={series}
        publications={publications}
        align="point"
      />
      <TickRow ticks={ticks} />
    </div>
  )
}

/**
 * A day at a time, each column standing on its own.
 *
 * For a quantity that is re-derived every day rather than carried forward: an
 * engagement rate on Tuesday and one on Wednesday are two separate answers to
 * the same question, and a line between them draws a continuity that isn't
 * there. Columns also make the gaps visible — a day with nothing published has
 * no rate, and a line would happily bridge straight over it.
 *
 * The baseline is zero and not negotiable. A column is read by its area, so a
 * cropped axis exaggerates every difference on the chart; that is what the
 * usual-range band is for instead.
 */
export function ColumnChart({
  series,
  band,
  endLabel,
  tickCount,
  publications,
  className,
}: {
  /** The level on each day, not a running total. */
  series: Point[]
  /** Where this measure normally sits, day to day. */
  band?: { low: number; high: number }
  endLabel?: string
  tickCount?: number
  /** When posts went out. Drawn between the plot and the dates. */
  publications?: Publication[]
  className?: string
}) {
  const W = 640
  const H = 180
  const all: Point[][] = [series, [{ date: '', value: 0 }]]
  if (band) {
    all.push([
      { date: '', value: band.low },
      { date: '', value: band.high },
    ])
  }
  const { max } = extent(all)
  // Headroom, so the tallest column doesn't end flush against the top edge and
  // read as clipped.
  const top = max * 1.06
  const y = (value: number) => H - PAD - (value / top) * (H - PAD * 2)
  const slot = W / Math.max(series.length, 1)
  // Capped as well as proportional. A two-day window with no cap draws two
  // slabs a third of the chart wide, which reads as a diagram of something
  // rather than as two days of a rate.
  const barWidth = Math.max(1, Math.min(slot * 0.68, 40))
  // Labels sit over the middle of their column, not over the edge of the slot
  // it stands in — a column *is* a day, where a point on a line only marks one.
  const ticks = dateTicks(series, tickCount, endLabel).map((tick) => ({
    ...tick,
    fraction: (tick.index + 0.5) / series.length,
  }))

  return (
    <div className={cn('relative w-full', className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-44 w-full"
        role="img"
        aria-label="Each day of the selected period"
      >
        {band && (
          <rect
            x={0}
            y={y(band.high)}
            width={W}
            height={Math.max(1, y(band.low) - y(band.high))}
            className="fill-quaternary"
            opacity={0.55}
          />
        )}

        {series.map((point, i) => {
          const height = Math.max(0, y(0) - y(point.value))
          return (
            <rect
              key={point.date || i}
              x={i * slot + (slot - barWidth) / 2}
              y={y(point.value)}
              width={barWidth}
              height={height}
              // Beige, not ink. Twenty-eight columns at full contrast make the
              // chart the loudest thing on the card, when what it is there to
              // support is the figure above it — and the band edges have to
              // stay readable *over* the bars.
              className="fill-quaternary-foreground"
            />
          )
        })}

        {/*
          The edges of the band, drawn over the columns. The filled band behind
          them is hidden wherever a column stands in front of it, which is
          everywhere that matters — and "is today's rate inside the range" is
          the entire question this chart is asked.
        */}
        {band &&
          [band.low, band.high].map((value) => (
            <line
              key={value}
              x1={0}
              x2={W}
              y1={y(value)}
              y2={y(value)}
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
              className="stroke-quinary-foreground"
            />
          ))}
      </svg>

      <PublicationRail
        series={series}
        publications={publications}
        align="slot"
      />
      <TickRow ticks={ticks} />
    </div>
  )
}

/**
 * The chart's frame with nothing in it.
 *
 * Holds the space a chart will occupy so the card keeps its shape while the
 * platforms are still reporting — the alternative is a card that grows a chart
 * under the reader an hour later, which reads as the page having changed its
 * mind. Dashed and empty rather than an axis with a flat line across it: a line
 * along the floor is a picture of *nothing happened*, and what is true is
 * *nothing has come back yet*.
 */
export function EmptyChart({
  label = 'Data will appear here',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex h-44 w-full items-center justify-center rounded-md border border-dashed border-quinary',
        className,
      )}
    >
      <span className="text-xs text-tertiary-foreground">{label}</span>
    </div>
  )
}

/**
 * The publications the rail will actually draw, given the window a chart covers.
 *
 * Exported because the legend has to be decided on the same set: a key reading
 * "a post went out" above a chart whose window contains none is a small lie, and
 * it is told exactly when the reader has narrowed the period to look closely.
 *
 * Outside the window is dropped rather than clamped to an edge — a mark on the
 * first day that means "some time before this" is a wrong answer wearing a
 * precise one's clothes.
 */
export function publicationsWithin(
  series: Point[],
  publications?: Publication[],
): Publication[] {
  if (!publications || series.length < 2) return []
  const dates = new Set(series.map((point) => point.date))
  return publications.filter((publication) => dates.has(publication.date))
}

/**
 * When posts went out, on the same timeline the chart above was drawn on.
 *
 * The chart says *something moved on the 6th*. Only this says *because two posts
 * went out on the 5th* — and without it every bend is equally likely to be a
 * post, a re-share, or a platform recounting yesterday. It is the x-axis
 * annotated rather than a second picture, which is why it sits inside the chart
 * between the plot and the dates instead of being a card of its own: a mark here
 * means nothing except against the line it is under.
 *
 * **One mark per post, not per day.** A day that published three posts and a day
 * that published one are the difference between a burst and a routine, and
 * flattening them into one identical mark would hide the thing most likely to
 * explain the bend. They spread across the day's own slot, so three marks
 * clustered still read as one day.
 *
 * **No colour and no height.** A mark is a fact — this went out — and every
 * status mark on these surfaces is a claim. Sizing the marks by what the posts
 * earned would turn the rail into a second chart competing with the one above
 * it, drawn on a scale nothing declares.
 */
export function PublicationRail({
  series,
  publications,
  align,
  className,
}: {
  /** The series the chart above was drawn from — the rail borrows its dates. */
  series: Point[]
  publications?: Publication[]
  /**
   * How the chart above places a day. A line puts its points *on* the edges,
   * so day `i` sits at `i / (n - 1)`; columns own a slot, so day `i` sits at its
   * middle. A rail that used one rule for both would drift half a day out at one
   * end of the chart, which is exactly the kind of quiet wrongness that makes
   * someone attribute a bend to the wrong post.
   */
  align: 'point' | 'slot'
  className?: string
}) {
  if (!publications || publications.length === 0 || series.length < 2)
    return null

  const index = new Map(series.map((point, i) => [point.date, i]))
  const days = new Map<number, Publication[]>()
  for (const publication of publications) {
    const i = index.get(publication.date)
    if (i === undefined) continue
    days.set(i, [...(days.get(i) ?? []), publication])
  }
  if (days.size === 0) return null

  const slot = 100 / series.length
  const total = [...days.values()].reduce((sum, posts) => sum + posts.length, 0)

  return (
    <div
      className={cn('relative h-3', className)}
      role="img"
      aria-label={`${total} ${total === 1 ? 'post' : 'posts'} published in this period`}
    >
      {[...days.entries()].map(([i, posts]) => {
        const centre =
          align === 'slot' ? (i + 0.5) * slot : (i / (series.length - 1)) * 100
        return posts.map((publication, k) => {
          // Spread around the day's centre, so a day with three posts reads as a
          // cluster on that day rather than as three days.
          const offset =
            (k - (posts.length - 1) / 2) * Math.min(slot * 0.5, 1.4)
          return (
            <span
              key={publication.id}
              title={
                publication.account
                  ? `${publication.title} — ${publication.account}`
                  : publication.title
              }
              className="absolute top-0 h-2.5 w-[1.5px] bg-tertiary-foreground"
              style={{
                left: `${Math.max(0, Math.min(100, centre + offset))}%`,
              }}
            />
          )
        })
      })}
    </div>
  )
}

/** The dated labels under a chart. Shared, so both charts date the same way. */
function TickRow({
  ticks,
}: {
  ticks: { index: number; fraction: number; label: string }[]
}) {
  if (ticks.length === 0) return null
  return (
    <div className="relative h-4">
      {ticks.map((tick) => (
        <span
          key={tick.index}
          className="absolute top-0 whitespace-nowrap text-xs text-tertiary-foreground"
          // Anchored by position rather than by being first or last: a label
          // that sits on the edge would hang off the chart, and one that sits
          // a quarter in — which is where the last column of a two-day window
          // is — has to stay over the thing it names.
          style={
            tick.fraction <= 0.02
              ? { left: 0 }
              : tick.fraction >= 0.98
                ? { right: 0 }
                : {
                    left: `${tick.fraction * 100}%`,
                    transform: 'translateX(-50%)',
                  }
          }
        >
          {tick.label}
        </span>
      ))}
    </div>
  )
}

/**
 * Evenly spaced ticks, labelled with the dates they actually fall on.
 *
 * Named days rather than "the period before" or a bare index — the same rule
 * the comparison header follows. Someone will screenshot this into a client
 * deck, and a chart whose x-axis reads "start" to "today" is undateable the
 * moment it leaves the screen.
 */
function dateTicks(
  series: Point[],
  count = 5,
  endLabel?: string,
): { index: number; fraction: number; label: string }[] {
  if (count < 2 || series.length < 2) return []
  const n = Math.min(count, series.length)
  const step = (series.length - 1) / (n - 1)
  return Array.from({ length: n }, (_, i) => {
    const index = Math.round(i * step)
    const point = series[index]
    return {
      index,
      fraction: index / (series.length - 1),
      label: i === n - 1 && endLabel ? endLabel : formatDay(point.date),
    }
  })
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
  series: {
    id: string
    label: string
    tone: 1 | 2 | 3 | 4 | 5
    points: Point[]
  }[]
  className?: string
}) {
  const W = 640
  const H = 140
  const { min, max } = extent([
    ...series.map((s) => s.points),
    [{ date: '', value: 0 }],
  ])

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
 * One measure on one post, over the time since it was published.
 *
 * Two shapes for one series, because the two questions are different. A
 * **cumulative** line answers *what has it earned* and ends on the figure in
 * the tile above it — the correspondence is the point, so it is drawn filled
 * from the floor, which a running total can honestly do. **Interval** columns
 * answer *when did it earn it*: each bucket stands on its own, a quiet hour is
 * a gap rather than a dip in a line, and a line joining hour 3 to hour 4 would
 * claim a continuity between two separately-counted quantities.
 *
 * The x-axis is elapsed time, not dates. A post's history is read against its
 * own publication — "most of it landed in the first three hours" — and the
 * absolute date is already in the card's header. Day buckets are the exception
 * and get real dates, because by then the reader is thinking in days of the week.
 *
 * No expectation band, unlike the campaign's chart. A per-post band would need
 * the shape of every other post at every hour, which is a second thing to
 * build; the tiles above already carry the comparison.
 *
 * Nothing is written inside the plot, including the scale. A running total
 * peaks in the top-right corner by construction, which is exactly where a
 * corner label goes — so the one number the chart could usefully carry would
 * sit on top of the line it describes. The card puts it under the plot instead,
 * and only for the readings whose scale isn't already the figure above.
 */
export function PostSeriesChart({
  points,
  mode,
  interval,
  showTicks = true,
  className,
}: {
  /** Already bucketed to `interval`, and already accumulated when cumulative. */
  points: { hour: number; at: string; value: number }[]
  mode: 'cumulative' | 'interval'
  interval: 'hour' | 'day'
  /** Off for every chart in a stack but the last — they share one x-axis. */
  showTicks?: boolean
  className?: string
}) {
  const W = 640
  const H = 90
  // Headroom, or the peak ends flush against the top edge and reads as clipped.
  const top = Math.max(...points.map((p) => p.value), 0) * 1.08 || 1
  const y = (value: number) => H - PAD - (value / top) * (H - PAD * 2)
  // A column *is* a bucket, where a point on a line only marks one — so a
  // column chart's labels sit over the middle of the slot their bucket stands
  // in, and a line's sit on the point itself.
  const ticks = elapsedTicks(points, interval).map((tick) =>
    mode === 'interval'
      ? { ...tick, fraction: (tick.index + 0.5) / points.length }
      : tick,
  )

  return (
    <div className={cn('relative w-full', className)}>
      {/*
        Twice the height it started at. `preserveAspectRatio="none"` means this
        is a pure vertical stretch of the same viewBox — no re-projection, no
        change to what is drawn — and it buys the one thing these charts were
        short of: a second wave, an overnight lull and a flattening tail are
        separations of a few pixels at 64px and legible at 128.
      */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-32 w-full"
        role="img"
        aria-label={
          mode === 'cumulative'
            ? 'Running total since the post was published'
            : `What the post earned in each ${interval} since it was published`
        }
      >
        {/*
          Only under the line. A column chart's gridlines land in the middle of
          the columns they are meant to date and draw a stripe up through them;
          the columns are their own structure, and the labels underneath are
          enough to find a date by.
        */}
        {mode === 'cumulative' &&
          ticks
            .slice(1, -1)
            .map((tick) => (
              <line
                key={tick.index}
                x1={tick.fraction * W}
                x2={tick.fraction * W}
                y1={0}
                y2={H}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                className="stroke-quaternary"
              />
            ))}

        {mode === 'cumulative' ? (
          <CumulativePath points={points} y={y} w={W} h={H} />
        ) : (
          <IntervalColumns points={points} y={y} w={W} h={H} />
        )}
      </svg>

      {showTicks && <TickRow ticks={ticks} />}
    </div>
  )
}

function CumulativePath({
  points,
  y,
  w,
  h,
}: {
  points: { value: number }[]
  y: (value: number) => number
  w: number
  h: number
}) {
  const step = points.length === 1 ? 0 : w / (points.length - 1)
  const d = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${y(p.value).toFixed(2)}`,
    )
    .join(' ')
  return (
    <>
      <path
        d={`${d} L${w},${h} L0,${h} Z`}
        className="fill-quaternary"
        opacity={0.5}
      />
      <path
        d={d}
        fill="none"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        className="stroke-foreground"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </>
  )
}

function IntervalColumns({
  points,
  y,
  w,
  h,
}: {
  points: { hour: number; value: number }[]
  y: (value: number) => number
  w: number
  h: number
}) {
  const slot = w / Math.max(points.length, 1)
  // A three-week-old post has five hundred hourly buckets. At that width the
  // gap between columns is what disappears, not the columns — so the bar takes
  // the whole slot once it gets thin enough for a gap to be a lie about how
  // many there are.
  const barWidth = slot > 2 ? Math.max(1, Math.min(slot * 0.7, 18)) : slot
  return (
    <>
      {points.map((point, i) => {
        const height = Math.max(
          point.value > 0 ? 0.75 : 0,
          y(0) - y(point.value),
        )
        return (
          <rect
            key={point.hour}
            x={i * slot + (slot - barWidth) / 2}
            y={h - PAD - height}
            width={barWidth}
            height={height}
            className="fill-quaternary-foreground"
          />
        )
      })}
    </>
  )
}

/**
 * Ticks along a post's own timeline. `+3h` while the buckets are hours, real
 * dates once they are days — the switch is the point at which the reader stops
 * thinking "since I posted it" and starts thinking "last Tuesday".
 */
function elapsedTicks(
  points: { hour: number; at: string }[],
  interval: 'hour' | 'day',
  count = 5,
): { index: number; fraction: number; label: string }[] {
  // One bucket still gets dated. It only happens per day, on a post younger than
  // a day, and an undated column is the one case where the axis says less than
  // the header — `fraction` is fixed up by the caller, which knows a column is
  // labelled at its middle and a line at its point.
  if (points.length === 1) {
    const [point] = points
    return [
      {
        index: 0,
        fraction: 0,
        label:
          interval === 'day'
            ? formatDay(point.at.slice(0, 10))
            : `+${formatHours(point.hour)}`,
      },
    ]
  }
  const n = Math.min(count, points.length)
  const step = (points.length - 1) / (n - 1)
  return Array.from({ length: n }, (_, i) => {
    const index = Math.round(i * step)
    const point = points[index]
    return {
      index,
      fraction: index / (points.length - 1),
      label:
        interval === 'day'
          ? formatDay(point.at.slice(0, 10))
          : `+${formatHours(point.hour)}`,
    }
  })
}

/**
 * How a post's engagement accumulates after publishing. Read once, it tells
 * you a post's shelf life; read against a post's age it tells you whether the
 * numbers on screen are final or still moving.
 */
export function DecayCurve({
  points,
  milestones = [],
  height = 'sm',
  className,
}: {
  points: { hour: number; share: number }[]
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
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${x(p.hour).toFixed(2)},${y(p.share).toFixed(2)}`,
    )
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
    <div
      className={cn('h-1.5 w-full overflow-hidden bg-quaternary', className)}
    >
      <div
        className={cn(
          'h-full',
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
  title,
}: {
  /** 1 is exactly typical for this workspace at this post's age. */
  pace: number
  placement: 'ahead' | 'usual' | 'behind'
  className?: string
  /** The multiple in words, for the reader who wants the number off the bar. */
  title?: string
}) {
  const t = Math.max(-1, Math.min(1, Math.log2(Math.max(pace, 0.01)) / 2))
  const width = Math.max(1.5, Math.abs(t) * 50)
  const left = t < 0 ? 50 - width : 50

  return (
    <div
      title={title}
      className={cn('relative h-1.5 w-full bg-quaternary', className)}
    >
      <div
        className={cn(
          'absolute inset-y-0',
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
