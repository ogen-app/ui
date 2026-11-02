import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'

import { cn } from '@/lib'
import { ZIndex } from '@/config/zIndex'

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverClose({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Close>) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />
}

/**
 * A pop-over in the app's pop-up surface — the one `DropdownMenuContent`
 * uses, plus a hairline border so the edge holds against a white rail where
 * the shadow alone fades out.
 *
 * Portalled, like the menu and the tooltip, so no ancestor's stacking context
 * can trap it: a transform anywhere above it would otherwise confine its
 * `z-index` to that ancestor and let later siblings paint over it (CON-443).
 */
function PopoverContent({
  className,
  sideOffset = 8,
  showArrow = true,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  showArrow?: boolean
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        sideOffset={sideOffset}
        style={{ zIndex: ZIndex.popover }}
        className={cn(
          'bg-popover text-popover-foreground rounded-sm border border-border p-4 shadow-lg outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          'max-w-[calc(100vw-32px)] origin-(--radix-popover-content-transform-origin)',
          className,
        )}
        {...props}
      >
        {children}
        {showArrow && (
          // A square turned 45° with the border on its two outer edges, half
          // tucked under the content so only the point shows — the content's
          // own border runs straight on into it.
          <PopoverPrimitive.Arrow asChild width={10} height={5}>
            <span className="block size-2.5 -translate-y-1/2 rotate-45 border-r border-b border-border bg-popover" />
          </PopoverPrimitive.Arrow>
        )}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverTrigger, PopoverClose, PopoverContent }
