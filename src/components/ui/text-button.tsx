import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib'

/**
 * An action written as words in a line of text — Retry, Save as…, Select all
 * 46, Read the whole, Clear all — rather than drawn as a button. It takes the
 * line's size, so it sits in a 12px caption or a 14px sentence alike, and has
 * no box, height or padding of its own, and is inline, so it wraps with the
 * sentence it ends. With an icon beside the words, add
 * `inline-flex items-center gap-1`; to truncate, add `truncate`.
 *
 * One look, in three tones:
 * - `accent` (the default) — the action the line offers: teal, medium,
 *   underlined on hover.
 * - `quiet` — the way out of something (Dismiss, Clear all, Cancel, Revert,
 *   "3 more"): the line's grey, darkening on hover.
 * - `destructive` — removes something: the danger colour, as `accent` is drawn.
 *
 * A link in running prose (a help article's) is a link, not this; something
 * you press that looks like a button is `Button`; a row, a card or a tile you
 * press stays a plain `<button>` with its own layout.
 */
const textButtonVariants = cva(
  'cursor-pointer text-left outline-none ' +
    'underline-offset-2 hover:underline focus-visible:underline ' +
    'disabled:cursor-default disabled:no-underline disabled:opacity-50 ' +
    "[&_svg:not([class*='size-'])]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        accent: 'font-medium text-accent',
        quiet:
          'text-secondary-foreground hover:text-foreground focus-visible:text-foreground',
        destructive: 'font-medium text-destructive',
      },
    },
    defaultVariants: { tone: 'accent' },
  },
)

const TextButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & VariantProps<typeof textButtonVariants>
>(function TextButton({ className, tone, type = 'button', ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      data-slot="text-button"
      className={cn(textButtonVariants({ tone }), className)}
      {...props}
    />
  )
})

// eslint-disable-next-line react-refresh/only-export-components
export { TextButton, textButtonVariants }
