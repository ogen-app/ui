import { useToastStore } from '@/stores/toastStore'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastIcon,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast'

/**
 * Renders the toast stack from the toast store. Mount once near the app
 * root (see main.tsx); fire toasts imperatively via `toast` from
 * `@/stores/toastStore`.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <ToastProvider swipeDirection="up">
      {toasts.map((t, i) => (
        <Toast
          key={t.id}
          variant={t.variant}
          // The store keeps oldest-first, so the last record is the newest and
          // belongs at the front of the deck.
          depth={toasts.length - 1 - i}
          open={t.open}
          duration={t.duration}
          onOpenChange={(open) => {
            // Radix reports close from the auto-dismiss timer, the close
            // button, or a swipe; funnel all three through the store so
            // the exit animation plays before removal.
            if (!open) dismiss(t.id)
          }}
        >
          <ToastIcon variant={t.variant} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <ToastTitle>{t.title}</ToastTitle>
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
