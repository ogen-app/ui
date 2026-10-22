import type { ReactNode } from 'react'
import { cn } from '@/lib'

/**
 * How wide the dog-ear is, in px. One number, because every edge of the fold —
 * the cut in the silhouette, the flap under it and the two hairlines that close
 * both — is derived from it. Two numbers is how a corner gets a seam.
 */
const FOLD = 20

/** The hairline, in px. The card has no CSS border; see `SampleCard`. */
const LINE = 1

/**
 * How far a 45° edge moves along an axis when the shape is inset by `LINE`.
 *
 * A vertical or horizontal edge inset by one pixel moves by one pixel. A
 * diagonal one does not: insetting it *perpendicularly* by `LINE` slides its
 * intercepts by `LINE / sin 45°`. Getting this wrong by the 0.414px difference
 * is exactly the seam this whole approach exists to remove, so it is a named
 * constant rather than a fudge factor spelled out at three call sites.
 */
const SKEW = LINE * Math.SQRT2

/** The corner-cut silhouette: a rectangle with its top-right corner taken off. */
const OUTER = `polygon(0 0, calc(100% - ${FOLD}px) 0, 100% ${FOLD}px, 100% 100%, 0 100%)`

/** The same silhouette, inset by `LINE` on all five edges. */
const INNER = `polygon(${LINE}px ${LINE}px, calc(100% - ${FOLD + SKEW - LINE}px) ${LINE}px, calc(100% - ${LINE}px) ${FOLD + SKEW - LINE}px, calc(100% - ${LINE}px) calc(100% - ${LINE}px), ${LINE}px calc(100% - ${LINE}px))`

/**
 * The turned-down corner itself, in a `FOLD`-square box pinned to the card's
 * top-right — the removed corner reflected back across the diagonal, which is
 * where a real fold puts it. Right angle at the inside, hypotenuse along the
 * crease.
 */
const FLAP = 'polygon(0 0, 100% 100%, 0 100%)'

/** `FLAP`, inset by `LINE`. */
const FLAP_INNER = `polygon(${LINE}px ${LINE + SKEW}px, ${FOLD - LINE - SKEW}px ${FOLD - LINE}px, ${LINE}px ${FOLD - LINE}px)`

/**
 * Three clamped lines, their padding and their border — what a sample card
 * comes to. Set on the add cell too, so a row of one is the same height as a
 * row of four and the grid never has a short cell in it.
 */
const SAMPLE_HEIGHT = 3 * 20 + 2 * 12 + 2

/**
 * A sample, or the space where one goes: a page with its top-right corner
 * turned down.
 *
 * ## It is folded, not cut
 *
 * The previous build clipped the corner off and ruled one hairline across the
 * gap. That is a *cut* corner — a page with a bite out of it — and it read as
 * one, because the thing that makes a dog-ear legible is the flap: the small
 * triangle of the reverse side lying on top of the page, which is the only part
 * of the drawing that says the paper went somewhere rather than being removed.
 * So the corner is back, reflected across the crease into the card, filled a
 * step darker than the card because you are looking at the back of the sheet.
 *
 * ## Why there is no `border` anywhere in here
 *
 * The seam was not a rounding error, it was the technique. A CSS border is
 * painted *inside* the box while `clip-path` cuts the box's *edge*, so along
 * the diagonal the clip ate the border and any line drawn to replace it met the
 * top and right borders a pixel off — visible as a step at both ends of the
 * diagonal, which is what the corner was reported for.
 *
 * The outline here is not drawn at all. It is the **difference between two
 * clipped shapes**: this element is filled with the line colour and clipped to
 * `OUTER`, a child is filled with the card colour and clipped to `INNER`, and
 * what shows between them is a hairline that follows all five edges. There is
 * no join to misalign because there are no two lines to join — the corner is a
 * single filled polygon. The flap is the same sandwich at `FOLD` scale.
 *
 * The cost is one extra element per card and the `SKEW` arithmetic; the return
 * is that the shape is correct by construction at any size, on any zoom, in any
 * colour it is ever hovered into.
 *
 * `blank` is the add-a-sample cell: the same card, not a dashed ghost of one.
 * Dashes said "placeholder" about a control that is not a placeholder — it is
 * the button you press — and put a third border style in a card that already
 * has two.
 */
export function SampleCard({
  blank,
  className,
  onClick,
  children,
}: {
  blank?: boolean
  className?: string
  /**
   * Absent draws the page and nothing to press — a sample shown rather than
   * edited, as the brand read's review shows the passages it quoted
   * (CON-400). Same paper, no hover.
   */
  onClick?: () => void
  children: ReactNode
}) {
  const Root = onClick ? 'button' : 'div'
  return (
    <Root
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{ clipPath: OUTER, minHeight: SAMPLE_HEIGHT }}
      className={cn(
        'group relative flex w-full flex-col rounded-md bg-quaternary text-left transition-colors',
        onClick && 'cursor-pointer hover:bg-foreground',
        // The default outline would be drawn outside the clip and vanish with
        // it, so focus goes inside, the same ring every button uses.
        'outline-none focus-visible:inset-ring-[2px] focus-visible:inset-ring-ring',
      )}
    >
      {/* The card's own face. Inset by the hairline on every edge, which is
          what leaves the hairline visible. */}
      <span
        aria-hidden
        style={{ clipPath: INNER }}
        className={cn(
          'absolute inset-0 rounded-md bg-primary transition-colors',
          onClick && 'group-hover:bg-secondary',
        )}
      />

      {/* The flap, over the face and under the text. Its hypotenuse is the
          crease and coincides with the silhouette's diagonal, so the two never
          need to agree about where the edge is — they are the same edge. */}
      <span
        aria-hidden
        style={{ width: FOLD, height: FOLD, clipPath: FLAP }}
        className={cn(
          'absolute right-0 top-0 bg-quaternary transition-colors',
          onClick && 'group-hover:bg-foreground',
        )}
      >
        <span
          aria-hidden
          style={{ clipPath: FLAP_INNER }}
          className={cn(
            'absolute inset-0 bg-secondary transition-colors',
            onClick && 'group-hover:bg-tertiary',
          )}
        />
      </span>

      {/* The right padding clears the fold: text running under a turned corner
          is the one way this shape can go wrong. */}
      <span
        className={cn(
          'relative flex min-w-0 flex-col py-3 pl-4 pr-7',
          blank && 'my-auto',
          className,
        )}
      >
        {children}
      </span>
    </Root>
  )
}
