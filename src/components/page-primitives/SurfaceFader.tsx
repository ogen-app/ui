import type { CSSProperties } from 'react'
import { cn } from '@/lib'

/**
 * A panel's edge: full-strength surface for a run, then a ramp to nothing —
 * colour *and* blur together, so a scrolling body dissolves as it passes under
 * rather than being clipped by a line.
 *
 * The blur is why this is a stack and not one div. `backdrop-filter` takes a
 * single radius; it cannot be interpolated along a gradient the way a colour
 * can, and masking one blurred layer only scales how much of it is composited —
 * at 30% you get 30% blurred wash and 70% untouched, sharp body. So the ramp is
 * `LAYERS` blurred panes, each fully on from the edge and fading out sooner than
 * the last: near the solid end they all overlap and compound, and one by one
 * they drop away until nothing is left at the far end. That is a blur that
 * genuinely tapers.
 *
 * The colour rides on top as a single masked pane, on the same curve.
 */
const LAYERS = 4

/**
 * Blur radii compose in quadrature, not by addition: `LAYERS` panes of radius r
 * stacked read as `r * sqrt(1 + ¼ + ¹⁄₁₆ + …)`. Divide the radius the caller
 * asked for by that, so the innermost edge lands on the number they wrote.
 */
const COMPOUNDING = Math.sqrt(
  Array.from({ length: LAYERS }, (_, i) => 1 / 4 ** i).reduce((a, b) => a + b, 0),
)

type SurfaceFaderProps = {
  /** The edge that stays solid. The ramp runs away from it. */
  edge: 'top' | 'bottom'
  /**
   * Where full strength ends, as a CSS length measured from `edge` — a px
   * number's worth of `'36px'`, or `'calc(100% - 32px)'` to mean "everything
   * except the ramp".
   */
  solid: string
  /** Depth of the ramp past `solid`, in px. Colour and blur both reach nothing here. */
  fade: number
  /**
   * Blur where the blur begins, tapering to none at the far end of the ramp.
   * Small on purpose: a wide radius up against the solid run drags the body's
   * contrast into the surface and the whole edge goes muddy.
   */
  blur?: number
  /**
   * How far down the ramp the blur starts, as a fraction of `fade`. The first
   * stretch is colour only — up there the surface is still nearly opaque, so
   * there is nothing showing through worth softening, and blurring it only
   * dirties the panel.
   *
   * Early rather than late, though, because it sets where the blur *ends* too:
   * the panes taper across whatever is left of the ramp, and a band pushed out
   * towards the far end leaves real blur on type that is nearly clear of the
   * surface. That reads as smeared rather than as fading — the blur wants to be
   * spent under the opaque part and gone by the time the body is legible.
   */
  blurStart?: number
  className?: string
  style?: CSSProperties
}

export function SurfaceFader({
  edge,
  solid,
  fade,
  blur = 5,
  blurStart = 0.3,
  className,
  style,
}: SurfaceFaderProps) {
  const direction = edge === 'top' ? 'to bottom' : 'to top'
  const at = (px: number) => (px === 0 ? solid : `calc(${solid} + ${px}px)`)
  const ramp = (from: string, to: string) =>
    `linear-gradient(${direction}, black ${from}, transparent ${to})`

  const blurFrom = fade * blurStart
  const band = (fade - blurFrom) / LAYERS

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-x-0', className)}
      style={style}
    >
      {Array.from({ length: LAYERS }, (_, i) => {
        // Each pane is on from the edge and gone by the end of its own band, so
        // the count of overlapping panes — and with it the blur — steps down
        // across the ramp. The widest radius is in every band; the narrowest in
        // the first only.
        const mask = ramp(at(blurFrom + band * i), at(blurFrom + band * (i + 1)))
        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${(blur / COMPOUNDING / 2 ** i).toFixed(2)}px)`,
              maskImage: mask,
            }}
          />
        )
      })}
      <div
        className="absolute inset-0 bg-primary"
        style={{ maskImage: ramp(at(0), at(fade)) }}
      />
    </div>
  )
}
