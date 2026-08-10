import type { ComponentProps, ReactNode } from 'react'
import * as ToastPrimitives from '@radix-ui/react-toast'
import { cva, type VariantProps } from 'class-variance-authority'
import { CheckIcon, ExclamationMarkIcon, XIcon } from '@phosphor-icons/react'

import { cn } from '@/lib'
import { ZIndex } from '@/config/zIndex'
import type { ToastVariant } from '@/stores/toastStore'

const ToastProvider = ToastPrimitives.Provider

/**
 * Toasts stack as a deck rather than a column: all of them sit at the same
 * spot, top centre, and only the newest is fully visible. Each older one is
 * scaled down and slid up behind it by `PEEK_Y`, so its top edge stays showing
 * — the pile reads as depth instead of as a list to work through.
 *
 * How many are visible at once is `MAX_TOASTS` in the store, not a constant
 * here: the store drops the oldest record past that, which is what makes the
 * back card dissolve when a new one lands.
 */
const PEEK_Y = 10
const SCALE_STEP = 0.1

function ToastViewport({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitives.Viewport>) {
  return (
    <ToastPrimitives.Viewport
      data-slot="toast-viewport"
      className={cn(
        'pointer-events-none fixed left-1/2 top-0 w-full -translate-x-1/2 sm:max-w-md',
        className,
      )}
      style={{ zIndex: ZIndex.toast }}
      {...props}
    />
  )
}

const toastVariants = cva(
  // `absolute` on every card is what makes the deck: they overlap instead of
  // flowing. `origin-top` keeps a scaled-down card's top edge where it is, so
  // the only thing moving it up is PEEK_Y.
  'group pointer-events-auto absolute inset-x-4 top-6 flex items-center gap-3 origin-top ' +
    'border-l-[3px] bg-popover py-2.5 pl-3 pr-2 shadow-toast ' +
    // `toast-motion` (index.css) carries both the entrance and the exit. Both
    // are keyframe animations, not transitions — Radix's Presence unmounts on
    // `animationend` and ignores transitions entirely — and both deliberately
    // leave `transform` alone so they never fight the deck geometry below.
    'transition-transform duration-200 ease-out toast-motion',
  {
    variants: {
      variant: {
        info: 'border-l-foreground',
        success: 'border-l-positive',
        warning: 'border-l-warning',
        error: 'border-l-destructive',
      },
    },
    defaultVariants: { variant: 'info' },
  },
)

/**
 * @param depth 0 for the newest (front) toast, counting up toward the back.
 */
function Toast({
  className,
  variant,
  depth = 0,
  ...props
}: ComponentProps<typeof ToastPrimitives.Root> &
  VariantProps<typeof toastVariants> & { depth?: number }) {
  return (
    <ToastPrimitives.Root
      data-slot="toast"
      className={cn(toastVariants({ variant }), className)}
      style={{
        // Only the deck geometry lives here, and it transitions so a card
        // slides back as newer ones land. Entering and leaving are keyframe
        // animations on `translate`/`opacity`, which are separate properties
        // and so never fight this one.
        transform: `translateY(${-depth * PEEK_Y}px) scale(${1 - depth * SCALE_STEP})`,
        // Newest in front. Local to the viewport, which already carries
        // ZIndex.toast.
        zIndex: 100 - depth,
      }}
      {...props}
    />
  )
}

/**
 * The glyph badge: a filled square in the variant colour with the mark knocked
 * out white. `info` is black rather than `--info` blue — the design reads it as
 * "the app is telling you something", not as the in-flight status blue that
 * `docs/colors.md` reserves `--info` for.
 */
const VARIANT_BADGE: Record<ToastVariant, { glyph: ReactNode; className: string }> = {
  // A bare letter, not Phosphor's `InfoIcon` — that one is a circled i, which
  // inside the square badge reads as a circle in a box rather than as a mark.
  info: {
    glyph: <span className="text-[11px] font-bold leading-none">i</span>,
    className: 'bg-foreground',
  },
  success: { glyph: <CheckIcon weight="bold" className="size-3.5" />, className: 'bg-positive' },
  warning: {
    glyph: <ExclamationMarkIcon weight="bold" className="size-3.5" />,
    className: 'bg-warning',
  },
  error: { glyph: <XIcon weight="bold" className="size-3.5" />, className: 'bg-destructive' },
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const { glyph, className } = VARIANT_BADGE[variant]
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-xs text-primary',
        className,
      )}
    >
      {glyph}
    </span>
  )
}

function ToastTitle({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitives.Title>) {
  return (
    <ToastPrimitives.Title
      data-slot="toast-title"
      className={cn(
        'text-sm font-medium leading-snug text-popover-foreground',
        className,
      )}
      {...props}
    />
  )
}

function ToastDescription({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitives.Description>) {
  return (
    <ToastPrimitives.Description
      data-slot="toast-description"
      className={cn('text-xs leading-snug text-tertiary-foreground', className)}
      {...props}
    />
  )
}

function ToastClose({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitives.Close>) {
  return (
    <ToastPrimitives.Close
      data-slot="toast-close"
      aria-label="Dismiss"
      className={cn(
        'ml-auto shrink-0 rounded-sm p-1 text-tertiary-foreground transition-colors hover:text-foreground',
        className,
      )}
      {...props}
    >
      <XIcon className="size-4" />
    </ToastPrimitives.Close>
  )
}

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastIcon,
  ToastTitle,
  ToastDescription,
  ToastClose,
}
