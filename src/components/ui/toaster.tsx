import {
  CheckCircleIcon,
  InfoIcon,
  WarningIcon,
  WarningCircleIcon,
  type Icon,
} from '@phosphor-icons/react'

import { cn } from '@/lib'
import { useToastStore, type ToastVariant } from '@/stores/toastStore'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast'

const VARIANT_ICON: Record<ToastVariant, Icon> = {
  default: InfoIcon,
  success: CheckCircleIcon,
  warning: WarningIcon,
  error: WarningCircleIcon,
}

const VARIANT_ICON_COLOR: Record<ToastVariant, string> = {
  default: 'text-tertiary-foreground',
  success: 'text-positive',
  warning: 'text-chart-5',
  error: 'text-destructive',
}

/**
 * Renders the toast stack from the toast store. Mount once near the app
 * root (see main.tsx); fire toasts imperatively via `toast` from
 * `@/stores/toastStore`.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map((t) => {
        const Icon = VARIANT_ICON[t.variant]
        return (
          <Toast
            key={t.id}
            variant={t.variant}
            open={t.open}
            duration={t.duration}
            onOpenChange={(open) => {
              // Radix reports close from the auto-dismiss timer, the close
              // button, or a swipe; funnel all three through the store so
              // the exit animation plays before removal.
              if (!open) dismiss(t.id)
            }}
          >
            <Icon
              weight="fill"
              className={cn('mt-0.5 size-4 shrink-0', VARIANT_ICON_COLOR[t.variant])}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <ToastTitle>{t.title}</ToastTitle>
              {t.description && <ToastDescription>{t.description}</ToastDescription>}
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
