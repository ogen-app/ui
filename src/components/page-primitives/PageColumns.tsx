import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useStickyColumns } from '@/hooks/useStickyColumns'
import { cn } from '@/lib'

/** Side by side is the row laid out as one (`@min-[60rem]:flex-row`). */
const sideBySide = (row: HTMLElement) =>
  getComputedStyle(row).flexDirection === 'row'

/**
 * A page body in two columns: the main one stretches, the second (`aside`)
 * keeps a preset width beside it. When the page is too narrow for both, the
 * second goes under the main one. Either way the content takes its column's
 * full width — inside these columns the column is the measure, so
 * `max-w-content` (a `capped` Card, the hub's cards) means 100% here.
 *
 * The switch follows the page's own width (a container query), not the
 * window's, because the right rail takes its width out of the page.
 *
 * Each column lays its children out as cards, 16px apart, so pass the cards
 * themselves (a fragment is fine) rather than a wrapper that spaces them:
 * with `masonry`, the main column flows them into as many columns as fit,
 * each card under the one above it, and only direct children can flow.
 *
 * `stickyAside` keeps the second column on screen while the main one is
 * read, 16px under the top of the scroll area — so it pairs with a
 * `PageHeader` that scrolls away (`scrollAway`); under a sticky one it would
 * slide beneath it. A second column taller than the screen is not cut off:
 * it scrolls with the page until its foot shows, and is held there
 * (`useStickyColumns`, the asset page's rule). Nothing scrolls inside it.
 * Stacked, it is an ordinary column.
 *
 * Carries the page's gutters, so it is the whole of what sits under the
 * `PageHeader`.
 */
export function PageColumns({
  children,
  aside,
  masonry = false,
  stickyAside = false,
}: {
  children: ReactNode
  /** The second column: a preset width beside the main one, or under it. */
  aside?: ReactNode
  /** Flow the main column's cards into as many columns as fit. */
  masonry?: boolean
  /** Keep the second column on screen while the main one scrolls. */
  stickyAside?: boolean
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const asideRef = useRef<HTMLDivElement>(null)
  useStickyColumns(rowRef, asideRef, mainRef, {
    enabled: stickyAside && Boolean(aside),
    sideBySide,
  })

  return (
    <div className="@container px-3 pb-10 pt-4 [--container-content:100%] lg:px-6">
      <div
        ref={rowRef}
        className="flex flex-col gap-4 @min-[60rem]:flex-row @min-[60rem]:items-start @min-[60rem]:gap-6"
      >
        <div
          ref={mainRef}
          className={cn(
            'w-full min-w-0 @min-[60rem]:flex-1',
            masonry
              ? 'columns-[22rem] gap-4 *:mb-4 *:break-inside-avoid'
              : 'flex flex-col gap-4',
          )}
        >
          {children}
        </div>
        {aside && (
          <div
            ref={asideRef}
            className={cn(
              'flex w-full flex-col gap-4 @min-[60rem]:w-[28rem] @min-[60rem]:shrink-0',
              stickyAside && '@min-[60rem]:sticky @min-[60rem]:top-4',
            )}
          >
            {aside}
          </div>
        )}
      </div>
    </div>
  )
}
