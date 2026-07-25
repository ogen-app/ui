import type { ComponentProps } from 'react'
import * as ToastPrimitives from '@radix-ui/react-toast'
import { cva, type VariantProps } from 'class-variance-authority'
import { XIcon } from '@phosphor-icons/react'

import { cn } from '@/lib'
import { ZIndex } from '@/config/zIndex'

const ToastProvider = ToastPrimitives.Provider

function ToastViewport({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitives.Viewport>) {
  return (
    <ToastPrimitives.Viewport
      data-slot="toast-viewport"
      className={cn(
        'fixed bottom-0 right-0 flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-sm',
        className,
      )}
      style={{ zIndex: ZIndex.toast }}
      {...props}
    />
  )
}

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-md border bg-popover p-4 pr-9 shadow-md ' +
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out ' +
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full ' +
    'data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=move]:transition-none ' +
    'data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform] ' +
    'data-[swipe=end]:translate-x-(--radix-toast-swipe-end-x)',
  {
    variants: {
      variant: {
        default: 'border-border text-popover-foreground',
        success: 'border-positive/40 text-popover-foreground',
        warning: 'border-chart-5/50 text-popover-foreground',
        error: 'border-destructive/40 text-popover-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Toast({
  className,
  variant,
  ...props
}: ComponentProps<typeof ToastPrimitives.Root> &
  VariantProps<typeof toastVariants>) {
  return (
    <ToastPrimitives.Root
      data-slot="toast"
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
}

function ToastTitle({
  className,
  ...props
}: ComponentProps<typeof ToastPrimitives.Title>) {
  return (
    <ToastPrimitives.Title
      data-slot="toast-title"
      className={cn('text-sm font-medium leading-snug', className)}
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
        'absolute right-2 top-2 rounded-sm text-tertiary-foreground transition-colors hover:text-foreground',
        className,
      )}
      {...props}
    >
      <XIcon className="size-3.5" />
    </ToastPrimitives.Close>
  )
}

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
}
