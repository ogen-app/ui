import { create } from 'zustand'

export type ToastVariant = 'default' | 'success' | 'error' | 'warning'

export type ToastRecord = {
  id: number
  variant: ToastVariant
  title: string
  description?: string
  duration: number
  // Radix controls the open state so the exit animation can play; a
  // dismissed toast stays mounted (open=false) until `remove` drops it.
  open: boolean
}

export type ToastOptions = {
  description?: string
  // Auto-dismiss delay in ms. Defaults per variant; errors linger longer
  // so the user can read which validation failed.
  duration?: number
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  default: 5_000,
  success: 5_000,
  warning: 6_000,
  error: 8_000,
}

// Keep a dismissed toast mounted this long so its closed animation can
// finish before it leaves the DOM. Matches the exit animation duration.
const REMOVE_DELAY_MS = 200

// How many toasts are visible at once; older ones are dropped past this
// so a burst can't bury the screen.
const MAX_TOASTS = 3

type ToastState = {
  toasts: ToastRecord[]
  push: (variant: ToastVariant, title: string, opts?: ToastOptions) => number
  // Begin dismissal: flip `open` false so Radix plays the exit animation,
  // then remove the record after the animation window.
  dismiss: (id: number) => void
  remove: (id: number) => void
}

// Module-level counter for stable, unique ids without depending on
// Date.now()/Math.random().
let counter = 0

const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (variant, title, opts) => {
    const id = ++counter
    const record: ToastRecord = {
      id,
      variant,
      title,
      description: opts?.description,
      duration: opts?.duration ?? DEFAULT_DURATION[variant],
      open: true,
    }
    set((s) => ({ toasts: [...s.toasts, record].slice(-MAX_TOASTS) }))
    return id
  },
  dismiss: (id) => {
    set((s) => ({
      toasts: s.toasts.map((t) => (t.id === id ? { ...t, open: false } : t)),
    }))
    setTimeout(() => get().remove(id), REMOVE_DELAY_MS)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// The <Toaster /> subscribes to this; imperative callers use `toast` below.
export { useToastStore }

function make(variant: ToastVariant) {
  return (title: string, opts?: ToastOptions) =>
    useToastStore.getState().push(variant, title, opts)
}

/**
 * Global, imperative toast API — callable from anywhere, including plain
 * functions and hooks outside the component tree. A single <Toaster /> must
 * be mounted (see main.tsx). Each call returns the toast id for `dismiss`.
 *
 *   toast.success('Post scheduled')
 *   toast.error('Unable to schedule', { description: reason })
 */
export const toast = {
  message: make('default'),
  success: make('success'),
  warning: make('warning'),
  error: make('error'),
  dismiss: (id: number) => useToastStore.getState().dismiss(id),
}
