import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib'

const Tabs = TabsPrimitive.Root

const tabsListVariants = cva(
  'inline-flex items-center justify-center text-tertiary-foreground font-display select-none',
  {
    variants: {
      variant: {
        default: 'rounded-lg bg-transparent p-1',
        underline: 'bg-transparent gap-0',
        underlineSecondary: 'bg-transparent gap-1',
        switcher: 'bg-primary p-[2px] gap-[2px]',
        // Segmented control: 40px track, 4px inset, one tone darker than the
        // canvas so the active 32px segment reads as a raised button.
        segmented: 'h-10 rounded-md bg-quaternary p-1 gap-1',
      },
      size: {
        default: 'h-9',
        sm: 'h-7',
        lg: 'h-8 lg:h-10',
        /** Height comes from the variant (see `segmented`). */
        excluded: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant, size }), className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-[11px] lg:text-[13px] font-medium ring-inset transition-all focus-visible:outline-none aria-invalid:ring-destructive/20 disabled:pointer-events-none disabled:opacity-50 cursor-pointer hover:text-foreground',
  {
    variants: {
      variant: {
        default:
          'rounded-md px-3 py-1 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:bg-active',
        underline:
          'rounded-t-md font-sans tracking-[.03em] border-b-3 pt-[3px] border-transparent px-2 lg:px-4 h-full ' +
          'data-[state=active]:border-primary-foreground data-[state=active]:text-foreground data-[state=active]:bg-quaternary',
        underlineSecondary:
          'rounded-t-md font-sans tracking-[.03em] border-b-3 pt-[3px] border-transparent px-2 lg:px-4 h-full ' +
          'data-[state=active]:border-primary-foreground data-[state=active]:text-foreground',
        switcher:
          'rounded-none font-mono text-xs px-4 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ',
        // Each segment mirrors the default Button: 32px tall, same radius and
        // type; the active one takes the button's white-on-black surface.
        segmented:
          'h-8 rounded-md px-4 text-[13px]/4 text-secondary-foreground ' +
          'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
      },
      size: {
        default: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> &
    VariantProps<typeof tabsTriggerVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant, size }), className)}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-2 ring-offset-background ring-inset focus-visible:outline-none', className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
export type { VariantProps }
