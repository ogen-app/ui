import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib'

const chipVariants = cva(
  'inline-flex items-center text-control leading-4 border font-medium px-4 py-[11px] rounded-lg',
  {
    variants: {
      variant: {
        default: 'bg-tertiary text-foreground border-transparent',
        muted:
          'bg-transparent text-tertiary-foreground border border-senary-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type ChipProps = React.ComponentProps<'span'> &
  VariantProps<typeof chipVariants>

const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(chipVariants({ variant, className }))}
      {...props}
    />
  ),
)
Chip.displayName = 'Chip'

const chipButtonVariants = cva(
  'inline-flex h-7 max-w-full shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 ' +
    'text-control tabular-nums transition-colors outline-none ' +
    'focus-visible:inset-ring-[2px] focus-visible:inset-ring-ring ' +
    "disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      state: {
        rest: 'border-quaternary text-secondary-foreground hover:border-tertiary-foreground hover:text-foreground',
        pressed: 'border-accent bg-accent/10 text-foreground',
        crossed:
          'border-dashed border-quaternary text-tertiary-foreground line-through hover:border-tertiary-foreground',
      },
    },
    defaultVariants: { state: 'rest' },
  },
)

/**
 * A chip you press: a suggestion to send, a pile to narrow to, a word or a
 * tag to keep or drop. 28px, round, one look in three states — at rest,
 * `pressed` (chosen, in the accent) and `crossed` (dashed and struck: the
 * same thing, visibly not going in). Says `aria-pressed` for the last two.
 *
 * A filter's clause is a pill (`FilterPills`), not this; a chip you only read
 * is `Chip`.
 */
const ChipButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    pressed?: boolean
    crossed?: boolean
  }
>(function ChipButton(
  { className, pressed, crossed, type = 'button', ...props },
  ref,
) {
  const state = crossed ? 'crossed' : pressed ? 'pressed' : 'rest'
  return (
    <button
      ref={ref}
      type={type}
      data-slot="chip-button"
      data-state={state}
      className={cn(chipButtonVariants({ state }), className)}
      {...props}
    />
  )
})

// eslint-disable-next-line react-refresh/only-export-components
export { Chip, chipVariants, ChipButton }
