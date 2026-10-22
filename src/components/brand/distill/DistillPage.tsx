import type { ReactNode } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PAGE_ACTION_BAR_INSET } from '@/components/page-primitives/PageActionBar'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { cn } from '@/lib'
import { BrandBackButton, BrandPage } from '../detail'

/**
 * The frame a brand read's pages sit in — the questions, the reading, the
 * review: a caret back to Foundation, a title, one column of cards.
 *
 * It is the hub's own frame (the header inside the scroller, sticky, the cards
 * dissolving under it; see `BrandDetail`) with the one thing a section screen
 * has no use for: a title. A read is not one of Foundation's sections — it is a
 * detour from the hub that comes back to it — so it says what it is reading
 * rather than leaving the first card to name the page.
 *
 * `bar` is the review's commit bar. It sits beside the scroller, not in it, so
 * it anchors to the content column (`PageActionBar`), and the column leaves it
 * room underneath.
 */
export function DistillPage({
  title,
  bar,
  children,
}: {
  title?: string
  bar?: ReactNode
  children: ReactNode
}) {
  return (
    <BrandPage>
      <div className="relative flex min-h-0 flex-1">
        <ScrollArea
          className="min-h-0 flex-1"
          type="scroll"
          scrollHideDelay={350}
        >
          <PageHeader back={<BrandBackButton />} title={title} fadeOnScroll />
          <div
            className={cn(
              'flex flex-col gap-3 px-3 lg:px-6',
              bar ? PAGE_ACTION_BAR_INSET : 'pb-10',
            )}
          >
            {children}
          </div>
        </ScrollArea>
        {bar}
      </div>
    </BrandPage>
  )
}
