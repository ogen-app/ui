import type { ReactNode } from 'react'

/**
 * The scroll container a Brand tab lives in.
 *
 * Each tab owns its own scrolling rather than the layout owning one for all of
 * them, because they do not all scroll the same way: Templates has a fixed
 * platform rail beside a scrolling detail panel, and a single scroller at the
 * layout level would drag the rail off the top with it. Making that the tab's
 * business keeps the exception from becoming the layout's problem.
 */
export function BrandTabScroll({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="pt-4 pb-10">{children}</div>
    </div>
  )
}
