'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon } from '@phosphor-icons/react'

import { cn } from '@/lib'

export interface CheckboxProps extends React.ComponentPropsWithoutRef<
  typeof CheckboxPrimitive.Root
> {
  checkedClassName?: string
  iconClassName?: string
}

const Checkbox = React.forwardRef<React.ComponentRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, checkedClassName, iconClassName, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer bg-transparent size-3 shrink-0 rounded-none border-[1.5px] border-quaternary cursor-pointer',
        'data-[state=checked]:border-primary-foreground data-[state=checked]:text-primary-foreground',
        'data-[state=checked]:bg-foreground border-tertiary-foreground data-[state=checked]:border-foreground',
        checkedClassName,
        'focus-visible:outline-none focus-visible:border-2 focus-visible:border-primary-foreground',
        'disabled:cursor-default disabled:bg-ring/20',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn('flex items-center justify-center w-full h-full text-primary')}
      >
        {/* `bold`, never `fill`: Phosphor draws Check's fill variant as a solid
            square with the tick knocked out of it, which inside an already
            filled box reads as a white chip rather than a checkmark. Bold is
            the heaviest stroke it has. 10px overspills the 9px the border
            leaves, which is what we want — checked, box and border are one
            colour, so the tick gets the whole 12px square. */}
        <CheckIcon
          weight="bold"
          className={cn('size-2.5 text-current', iconClassName)}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
)
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
