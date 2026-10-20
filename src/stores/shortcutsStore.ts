import { create } from 'zustand'

/**
 * Whether the keyboard shortcuts sheet is open (CON-394). Its own tiny store
 * because two places open it — `?`, anywhere, and the account menu's row —
 * and neither is under the other.
 */
export const useShortcutsStore = create<{
  open: boolean
  setOpen: (open: boolean) => void
}>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
