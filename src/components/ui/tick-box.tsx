import * as React from 'react'

import { cn } from '@/lib'
import { Checkbox, type CheckboxProps } from './checkbox'

/**
 * The tick that selects an object for the assistant to read (CON-472/486):
 * a calendar card's corner box, a Foundation entry's, a fact row's.
 *
 * Lighter than the table's `Checkbox` at rest — 12px on a 1px border, since it
 * sits on the object rather than in a column of its own — and a size up once
 * ticked, 14px with an 11px tick, so a ticked object reads from across the
 * grid. It fades in as the Ideas row's tick does; where it is hidden until
 * hover is the caller's to say.
 */
const TickBox = React.forwardRef<
  React.ComponentRef<typeof Checkbox>,
  CheckboxProps
>(({ className, iconClassName, ...props }, ref) => (
  <Checkbox
    ref={ref}
    className={cn(
      'size-3 border border-quaternary-foreground',
      'data-[state=checked]:size-3.5 data-[state=indeterminate]:size-3.5',
      'transition-opacity duration-200 ease-out motion-reduce:transition-none',
      className,
    )}
    iconClassName={cn('size-[11px]', iconClassName)}
    {...props}
  />
))
TickBox.displayName = 'TickBox'

export { TickBox }
