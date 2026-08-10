import { Children, Fragment, type ReactNode } from 'react'
import { WarningCircleIcon } from '@phosphor-icons/react'
import { ZIndex } from '@/config/zIndex'
import { cn } from '@/lib'

/**
 * The bottom padding a page must leave under its last card so the bar never
 * covers it: 48px of bar, 16px of gap below it, 16px of breath above.
 */
export const PAGE_ACTION_BAR_INSET = 'pb-20'

/**
 * The floating commit bar — the actions that advance *this* object through its
 * lifecycle, on their own surface at the bottom of the content column.
 *
 * The rule it implements: the top of a screen is about the object (where you
 * are, and which view of it you are looking at), the bottom is about the work
 * (what you can do to it, and the assistant). It replaces the pile of status
 * buttons that used to share the top-right corner with the view toggles and
 * the save indicator, where a control pressed twenty times an hour sat 8px
 * from one that schedules a post.
 *
 * Only **editor** screens get a bar. A post, an asset and a campaign brief are
 * documents you are inside, with something to commit; a list is a place you
 * browse, and creating a row is not a commit — ADD CAMPAIGN stays top-right.
 *
 * ## Placement
 *
 * Renders absolutely, so the caller must give it a positioned ancestor, and
 * that ancestor must be the **content column** rather than the page's scroll
 * container:
 *
 * - Inside the scroller, the bar would scroll away with the content.
 * - Fixed to the viewport, it would stay put when the right rail opens and
 *   drift off the column it acts on.
 *
 * `h-12` is not decoration: it is the assistant trigger's height, and the two
 * share `bottom-4`, so the whole bottom edge of the app sits on one line. The
 * trigger is inset 16px from the right against the content gutter's 24px —
 * half a step outside it, because it is the one control on screen that belongs
 * to the app rather than to the page.
 *
 * Pass actions as siblings or an array, not wrapped in a fragment: the bar
 * rules between them, and a fragment arrives as a single child.
 */
export function PageActionBar({
  blocker,
  children,
  className,
}: {
  /**
   * Why the primary action can't run yet, said in place. The bar is the only
   * affordance with room for this — a header button could only refuse.
   */
  blocker?: ReactNode
  children: ReactNode
  className?: string
}) {
  const items = Children.toArray(children)
  if (items.length === 0) return null

  return (
    <div
      // `pointer-events-none` on the full-width track so it never eats a click
      // meant for the page underneath; the bar itself takes them back.
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-4 flex justify-center',
        className,
      )}
      style={{ zIndex: ZIndex.pageActionBar }}
    >
      <div className="pointer-events-auto flex h-12 items-center gap-2 bg-primary px-4 shadow-lg">
        {blocker && (
          <>
            <span className="flex items-center gap-1.5 px-1 text-xs text-tertiary-foreground">
              <WarningCircleIcon className="size-4 shrink-0" />
              {blocker}
            </span>
            <PageActionBarDivider />
          </>
        )}
        {items.map((child, index) => (
          <Fragment key={index}>
            {index > 0 && <PageActionBarDivider />}
            {child}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

/** The bar's own rule between two controls. */
function PageActionBarDivider() {
  return <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
}
