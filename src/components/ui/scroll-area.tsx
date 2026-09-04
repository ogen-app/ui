import * as React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'

import { cn } from '@/lib'
import { ZIndex } from '@/config/zIndex'

/**
 * A scroller with a styled bar, and a Root that cannot be scrolled at all.
 *
 * `overflow: hidden` stops the *user* scrolling a box. It does not stop the
 * *browser*: a hidden box is still a scroll container, so it still has a scroll
 * offset, and anything calling `focus()` or `scrollIntoView()` deep inside it
 * makes the browser scroll every scrollable ancestor to reveal the target —
 * this Root included. Radix's viewport, one level down, is the box meant to
 * move; when the Root moves too the whole scroller slides up out of its own
 * frame and stays there. What that looks like is a screen cut off part-way down
 * a card with dead space under it, and no wheel gesture puts it back, because
 * the box now holding the offset is the one that refuses to scroll. It is also
 * unfixable from a `scroll` handler: Chrome fires no scroll event for a
 * programmatic offset on a hidden box, so nothing gets a chance to undo it.
 *
 * `overflow: clip` is the primitive that was actually wanted. It clips without
 * creating a scroll container at all, so the Root has no offset to be given
 * one — the browser skips it when it goes looking for something to scroll, and
 * lands on the viewport, which is the box that should have moved in the first
 * place.
 *
 * Callers should still pass `preventScroll` when they move focus for their own
 * reasons — see `modal.tsx`, the trigger this was found through — but that is
 * now politeness rather than the only thing standing between the app and a
 * broken screen.
 */
const ScrollArea = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn('relative overflow-clip', className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner style={{ zIndex: ZIndex.scrollBar }} />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'flex touch-none select-none transition-colors',
      orientation === 'vertical' &&
        'h-full w-2 border-l border-l-transparent p-px',
      orientation === 'horizontal' &&
        'h-2 flex-col border-t border-t-transparent p-px',
      className,
    )}
    style={{ zIndex: ZIndex.scrollBar }}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
