import type { ReactNode } from 'react'
import { cn } from '@/lib'

/**
 * A page body in two columns: the main one stretches, the second (`aside`)
 * keeps a preset width beside it. When the page is too narrow for both, the
 * second goes under the main one. Either way the content takes its column's
 * full width — inside these columns the column is the measure, so
 * `max-w-content` (`SettingsCard`, the hub's cards) means 100% here.
 *
 * The switch follows the page's own width (a container query), not the
 * window's, because the right rail takes its width out of the page.
 *
 * Each column lays its children out as cards, 16px apart, so pass the cards
 * themselves (a fragment is fine) rather than a wrapper that spaces them:
 * with `masonry`, the main column flows them into as many columns as fit,
 * each card under the one above it, and only direct children can flow.
 *
 * Carries the page's gutters, so it is the whole of what sits under the
 * `PageHeader`.
 */
export function PageColumns({
  children,
  aside,
  masonry = false,
}: {
  children: ReactNode
  /** The second column: a preset width beside the main one, or under it. */
  aside?: ReactNode
  /** Flow the main column's cards into as many columns as fit. */
  masonry?: boolean
}) {
  return (
    <div className="@container px-3 pb-10 pt-4 [--container-content:100%] lg:px-6">
      <div className="flex flex-col gap-4 @min-[60rem]:flex-row @min-[60rem]:items-start @min-[60rem]:gap-6">
        <div
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
          <div className="flex w-full flex-col gap-4 @min-[60rem]:w-[28rem] @min-[60rem]:shrink-0">
            {aside}
          </div>
        )}
      </div>
    </div>
  )
}
