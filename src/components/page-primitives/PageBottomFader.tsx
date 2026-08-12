import { cn } from '@/lib'

/**
 * The header's fade-out gradient, mirrored along the bottom edge of a content
 * column — content dissolves into the page as it scrolls off, instead of being
 * cut in half by the viewport under the action bar.
 *
 * Same 80px and the same `from-42%` as `PageHeader`, because the two are the
 * top and bottom of one frame: matching them is the whole point, so change
 * them together or not at all.
 *
 * ## Placement
 *
 * Absolute, and — like `PageActionBar` — it belongs to the **content column**,
 * not the scroll container: inside the scroller it would scroll away with the
 * post, and it has to span the column so it recedes when the right rail opens.
 * Render it as a sibling of the scroll area, after it.
 *
 * Deliberately carries no z-index. Painting order alone puts it where it has to
 * be: after the scroll area in the DOM, so it covers the content; below the
 * scrollbar's `ZIndex.scrollBar` and the bar's `ZIndex.pageActionBar`, so
 * neither of those dissolves along with the document. Give it a layer and it
 * would have to beat both of them back.
 *
 * Invisible when there is nothing to fade: the gradient runs from the page
 * background to transparent, so over an empty column it is background on
 * background.
 */
export function PageBottomFader({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 h-20',
        'bg-gradient-to-t from-background from-42% to-transparent',
        className,
      )}
    />
  )
}
