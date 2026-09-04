import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { localPoint } from '@visx/event'
import { scaleLinear } from '@visx/scale'
import { cn } from '@/lib'
import type { Point } from './types'

/**
 * The frame the full-card charts are drawn in: real pixels, one scale, one
 * pointer.
 *
 * **Why measured rather than stretched.** The hand-rolled charts drew into a
 * fixed `640×180` box with `preserveAspectRatio="none"` and let the browser
 * stretch it to whatever width the card had. That is a genuinely good trick for
 * a static picture — no measurement, no resize handling — and it is why the
 * sparklines still use it. It breaks down the moment anything on the plot has to
 * be round or has to be found by a pointer: a circle in a stretched viewBox is
 * an ellipse whose eccentricity depends on the card's width, and every mouse
 * coordinate has to be mapped back through the stretch before it means anything.
 * Both of those are the tooltip, which is the whole reason this exists.
 *
 * **What the axis stays.** The dated labels and the publication rail are still
 * HTML positioned in percentages, outside this SVG. They were already
 * width-independent, they wrap and truncate the way text should, and pulling
 * them into the plot would trade working type for SVG `<text>` that cannot.
 *
 * Scales come from `@visx/scale` and pointer coordinates from `@visx/event`.
 * The shapes stay ours — the expectation cone, the publication rail and the
 * heatmaps are not shapes a chart library has an opinion about.
 */

/** The plot's own height. The dated row and the rail sit under it. */
export const PLOT_HEIGHT = 176

/**
 * Breathing room at the top and bottom of the plot, in pixels.
 *
 * A line that touches the ceiling reads as clipped, and one that touches the
 * floor reads as zero when the scale does not start there.
 */
const PAD = 4

/**
 * How a chart places a day.
 *
 * A line puts its points *on* the edges, so day `i` sits at `i / (n - 1)`.
 * Columns own a slot, so day `i` sits at its middle. The same distinction the
 * publication rail draws — and the rail and the plot have to agree, or a mark
 * drifts half a day away from the bend it explains.
 */
export type PlotAlign = 'point' | 'slot'

export interface PlotGeometry {
  width: number
  height: number
  /** Value → y, in pixels from the top. */
  y: (value: number) => number
  /** Index → x, in pixels from the left, per {@link PlotAlign}. */
  x: (index: number) => number
  /** The slot a single day owns. Meaningful for columns. */
  slot: number
  /** Which point the pointer is nearest, or `null` when it has left. */
  active: number | null
}

/** The geometry a plot's x axis is laid out on. */
export interface PlotAxis {
  align: PlotAlign
  /** How many points are on the axis. */
  count: number
  width: number
}

/** Index → x, in pixels from the left. */
export function plotX(
  index: number,
  { align, count, width }: PlotAxis,
): number {
  const slot = width / Math.max(count, 1)
  if (align === 'slot') return (index + 0.5) * slot
  // A single point has no span to sit along, and `i / (n - 1)` would divide by
  // zero. The middle is the only place it can honestly go.
  if (count < 2) return width / 2
  return (index / (count - 1)) * width
}

/**
 * x → the index the pointer is nearest, clamped to the ends.
 *
 * The exact inverse of {@link plotX}, and it has to stay that way: the two
 * alignments differ by half a day, so a shared rule would put the hover card on
 * one day while the focus dot sat on another at one end of the chart.
 */
export function plotIndex(
  px: number,
  { align, count, width }: PlotAxis,
): number {
  if (count < 1) return 0
  const slot = width / Math.max(count, 1)
  const raw = align === 'slot' ? px / slot - 0.5 : (px / width) * (count - 1)
  return Math.max(0, Math.min(count - 1, Math.round(raw)))
}

export function buildScale(
  series: Point[][],
  height: number,
  { floor = false, headroom = 1 }: { floor?: boolean; headroom?: number } = {},
) {
  const values = series.flat().map((p) => p.value)
  // A running total starts from nothing, so the floor belongs on the scale. A
  // level does not: forcing 0 onto a follower count that moves between 13.5K
  // and 14.2K flattens the whole movement into the top two pixels.
  if (floor) values.push(0)
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 1
  // A flat line still needs a band to sit in, or the scale divides by zero.
  const [lo, hi] = max === min ? [min - 1, max + 1] : [min, max * headroom]

  return scaleLinear<number>({
    domain: [lo, hi],
    range: [height - PAD, PAD],
  })
}

/**
 * The chart frame: measures itself, maps the pointer to a day, and hands both
 * to whatever draws the ink.
 *
 * `tooltip` is asked for content per index and may answer `null` — a day with
 * nothing to say gets no card rather than an empty one.
 */
export function Plot({
  count,
  align,
  height = PLOT_HEIGHT,
  label,
  scale,
  tooltip,
  children,
  className,
}: {
  /** How many points are on the x axis. */
  count: number
  align: PlotAlign
  height?: number
  /** What a screen reader is told the plot is. */
  label: string
  /** Built by {@link buildScale} against this height. */
  scale: (value: number) => number
  tooltip?: (index: number) => ReactNode
  children: (geometry: PlotGeometry) => ReactNode
  className?: string
}) {
  const [ref, width] = useMeasuredWidth<HTMLDivElement>()

  return (
    // The height is declared, not left to the content: the plot is absent for
    // the first paint, and a card that grows one under the reader a frame later
    // reads as the page changing its mind.
    <div
      ref={ref}
      className={cn('relative w-full', className)}
      style={{ height }}
    >
      {width >= 2 && (
        <PlotBody
          width={width}
          height={height}
          count={count}
          align={align}
          label={label}
          scale={scale}
          tooltip={tooltip}
        >
          {children}
        </PlotBody>
      )}
    </div>
  )
}

/**
 * The element's width, measured on mount and kept up to date.
 *
 * Ours rather than `@visx/responsive`'s `ParentSize`, which measures from a div
 * it positions absolutely and updates only from a `ResizeObserver`. Two things
 * went wrong with that here: the absolute div is out of flow, so a container
 * sized by its children collapsed to nothing — and a plot mounted *after* the
 * first paint, which is every plot drawn by switching the selected measure,
 * never received an observation at all and stayed blank for good.
 *
 * The synchronous first read in a layout effect is the part that matters: it
 * lands before paint, so the chart is drawn the frame its card is, and it does
 * not depend on an element whose size never changes being reported anyway.
 */
function useMeasuredWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return

    setWidth(node.getBoundingClientRect().width)

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}

function PlotBody({
  width,
  height,
  count,
  align,
  label,
  scale,
  tooltip,
  children,
}: {
  width: number
  height: number
  count: number
  align: PlotAlign
  label: string
  scale: (value: number) => number
  tooltip?: (index: number) => ReactNode
  children: (geometry: PlotGeometry) => ReactNode
}) {
  const [active, setActive] = useState<number | null>(null)

  const slot = width / Math.max(count, 1)
  const axis = useMemo(() => ({ align, count, width }), [align, count, width])
  const x = useCallback((index: number) => plotX(index, axis), [axis])
  const nearest = useCallback((px: number) => plotIndex(px, axis), [axis])

  const geometry = useMemo(
    () => ({ width, height, y: scale, x, slot, active }),
    [width, height, scale, x, slot, active],
  )

  const card = active !== null && tooltip ? tooltip(active) : null

  return (
    <>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        className="block touch-none"
        onPointerMove={(event) => {
          const local = localPoint(event)
          if (local) setActive(nearest(local.x))
        }}
        onPointerLeave={() => setActive(null)}
      >
        {children(geometry)}

        {/*
          The crosshair, over the ink. Drawn here rather than by each chart
          because it is the pointer's own feedback and has to look identical
          whatever is underneath it — and because a chart that drew its own
          would have to be told where the pointer is twice.

          Lines only. A column already owns its slot and marks itself by filling
          darker, so a rule down its middle is a second answer to a question the
          bar has answered — and above the bar it reads as a stray gridline.
        */}
        {align === 'point' && active !== null && card && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={0}
            y2={height}
            strokeWidth={1}
            className="stroke-tertiary-foreground"
            opacity={0.4}
          />
        )}
      </svg>

      {card && active !== null && (
        <PlotTooltip x={x(active)} width={width}>
          {card}
        </PlotTooltip>
      )}
    </>
  )
}

/**
 * The hover card, in HTML above the plot.
 *
 * Follows the x of the day it describes and never the pointer's y: the value
 * being read is on a vertical line, and a card that also moved up and down
 * would wander over the very ink it is explaining. It flips at the edges so the
 * last day of a window is as readable as the first — the last day is the one
 * people actually look at.
 *
 * `pointer-events-none` throughout: the card must never become the thing the
 * pointer is over, or moving toward it makes it flee.
 */
function PlotTooltip({
  x,
  width,
  children,
}: {
  x: number
  width: number
  children: ReactNode
}) {
  const side = x > width * 0.66 ? 'right' : 'left'

  return (
    <div
      className="pointer-events-none absolute top-1 z-10 max-w-[16rem] rounded-md border border-border bg-background px-2.5 py-1.5 text-xs shadow-sm"
      style={
        side === 'right'
          ? { right: Math.max(0, width - x) + 8 }
          : { left: x + 8 }
      }
    >
      {children}
    </div>
  )
}

/**
 * The dot that marks the day being read.
 *
 * A circle, and round, which is the thing the stretched viewBox could not do.
 */
export function PlotFocus({
  x,
  y,
  className,
}: {
  x: number
  y: number
  className?: string
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r={3.5}
      className={cn('fill-background stroke-foreground', className)}
      strokeWidth={2}
    />
  )
}
