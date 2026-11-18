import type { ReactNode } from 'react'
import { cn } from '@/lib'

/**
 * How much of a row a dashboard card asks for. Named shares, not column counts,
 * so a page says what it means and the grid decides how that lands at each
 * width.
 */
export type GridSpan = 'full' | 'wide' | 'half' | 'narrow'

/**
 * Each span at each width. Under 40rem of page there is one column; from 40rem
 * every share short of `full` is a half, so a wide + narrow row becomes two
 * halves before it stacks; from 60rem (`PageColumns`' switch too) the shares
 * are thirds of a six-track grid: `wide` ⅔, `half` ½, `narrow` ⅓.
 */
const SPAN: Record<GridSpan, string> = {
  full: '@min-[40rem]:col-span-2 @min-[60rem]:col-span-6',
  wide: '@min-[60rem]:col-span-4',
  half: '@min-[60rem]:col-span-3',
  narrow: '@min-[60rem]:col-span-2',
}

/**
 * A dashboard: cards in rows, in the order they are written. Each card asks
 * for a share of its row (`GridCell`'s `span`); a card that no longer fits
 * starts the next row, and the next row starts under the tallest card of the
 * one above. Reading order is source order at every width, so the stack on a
 * narrow page is decided once, here, by writing the cards in order of
 * importance — never by the grid.
 *
 * Cards in a row are one height by default (`rows="stretch"`), their content
 * at the top; `rows="start"` lets each keep its own and leaves the gap under
 * the shorter ones. Either way a dashboard card bounds what it shows — the
 * next few, the top few with "+2 like this" — and links to the whole list,
 * or one long card would stretch every card beside it.
 *
 * The widths are the page's own (a container query), not the window's,
 * because the right rail takes its width out of the page. Inside the grid the
 * content takes its cell's full width (`max-w-content` means 100% here, as in
 * `PageColumns`).
 *
 * No gutters: it sits in whatever already has them — the page's shell, or a
 * `PageColumns` column.
 */
export function PageGrid({
  children,
  rows = 'stretch',
}: {
  children: ReactNode
  rows?: 'stretch' | 'start'
}) {
  return (
    <div className="@container [--container-content:100%]">
      <div
        className={cn(
          'grid grid-cols-1 gap-4 @min-[40rem]:grid-cols-2 @min-[60rem]:grid-cols-6',
          rows === 'start' && 'items-start',
        )}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * One card's place in a `PageGrid`. The card fills it, height included, so a
 * stretched row reads as one row. A card that renders nothing leaves no hole:
 * an empty cell is not drawn at all.
 */
export function GridCell({
  span,
  children,
}: {
  span: GridSpan
  children: ReactNode
}) {
  return (
    <div
      className={cn('flex min-w-0 flex-col empty:hidden *:flex-1', SPAN[span])}
    >
      {children}
    </div>
  )
}
