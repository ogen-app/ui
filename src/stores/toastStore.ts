import { create } from 'zustand'

/**
 * The four toast severities. These are the design's INFO / SUCCESS / DANGER /
 * ERROR rows; `warning` keeps its name rather than becoming `danger` because
 * that is what callers mean by it — "off but not broken" (`docs/colors.md`),
 * e.g. "only 4 files fit on this post type". It renders in the DANGER orange.
 */
export type ToastVariant = 'info' | 'success' | 'error' | 'warning'

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
  info: 5_000,
  success: 5_000,
  warning: 6_000,
  error: 8_000,
}

// Keep a dismissed toast mounted this long so its closed animation can finish
// before it leaves the DOM. Must stay ahead of the 200ms fade in `toast.tsx` —
// dropping the record is what unmounts the element, so if this fires first the
// card vanishes mid-fade.
const REMOVE_DELAY_MS = 260

// How deep the visible deck goes. Two means one card in front and one peeking
// behind it; a third arrival dissolves the oldest. Raising this shows more of
// the pile — `toast.tsx` derives its scale/offset from the depth, so nothing
// else needs changing.
const MAX_TOASTS = 2

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
    set((s) => ({ toasts: [...s.toasts, record] }))
    // Push the deck past its depth and the card at the back leaves the normal
    // way — dismissed, so it fades. Slicing it out of the array here instead
    // would unmount it on the spot and it would pop out of existence.
    const live = get().toasts.filter((t) => t.open)
    for (const stale of live.slice(0, -MAX_TOASTS)) get().dismiss(stale.id)
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
  info: make('info'),
  success: make('success'),
  warning: make('warning'),
  error: make('error'),
  dismiss: (id: number) => useToastStore.getState().dismiss(id),
}
