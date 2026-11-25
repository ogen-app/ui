import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib'

const toggleTileVariants = cva(
  'relative flex min-w-0 shrink-0 cursor-pointer items-center justify-center rounded-md border ' +
    'text-control font-medium tabular-nums transition-colors outline-none ' +
    'focus-visible:inset-ring-[2px] focus-visible:inset-ring-ring ' +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    "[&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      size: {
        // One of a row that fills its width — the week's seven days.
        lg: 'h-16 rounded-lg px-2',
        // A mark alone — a platform's logo.
        square: 'size-10',
        // On a bar beside a picker, as tall as it.
        sm: 'h-7 gap-1.5 px-2.5 text-xs',
      },
      on: {
        true: 'border-transparent bg-tertiary text-foreground hover:bg-quaternary',
        // Out: outlined, greyed, and its words struck through, so "off" is
        // read in the thing itself rather than in a legend.
        false:
          'border-senary-foreground bg-transparent text-tertiary-foreground hover:border-tertiary-foreground [&_[data-tile-label]]:line-through',
      },
    },
    defaultVariants: { size: 'lg', on: false },
  },
)

/**
 * A thing that is in or out — a publishing day, a platform counted in the
 * numbers. Not a button that does something, and not one choice of several:
 * each tile switches on its own, and a row of them says which are in.
 *
 * In, it is filled; out, it is outlined and grey with its words struck
 * through. It is a `switch`, so it announces itself as on or off. Put the
 * words in `label` (struck when out) and anything else — a logo, a count —
 * in `children`.
 */
const ToggleTile = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ComponentProps<'button'>, 'onChange'> &
    Omit<VariantProps<typeof toggleTileVariants>, 'on'> & {
      on: boolean
      onToggle: () => void
      label?: React.ReactNode
    }
>(function ToggleTile(
  { className, size, on, onToggle, label, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      role="switch"
      aria-checked={on}
      data-slot="toggle-tile"
      data-state={on ? 'on' : 'off'}
      onClick={onToggle}
      className={cn(toggleTileVariants({ size, on }), className)}
      {...props}
    >
      {children}
      {label !== undefined && (
        <span data-tile-label className="truncate">
          {label}
        </span>
      )}
    </button>
  )
})

// eslint-disable-next-line react-refresh/only-export-components
export { ToggleTile, toggleTileVariants }
