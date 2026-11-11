import { create } from 'zustand'

/**
 * The unscheduled drafts written from ideas in this tab (CON-470), so the
 * Not scheduled panel can put them on top and mark them: the toast that
 * announced them is gone in seconds, and a panel of strays doesn't say which
 * of them just arrived.
 *
 * Session state, and deliberately so — what counts as "just" ends with the
 * tab. Never persisted, and never a copy of the posts: the panel still lists
 * what the server says is unscheduled, and an id here whose post was since
 * dated or deleted marks nothing.
 */
type JustWrittenState = {
  ids: ReadonlySet<string>
  add: (ids: string[]) => void
}

export const useJustWrittenStore = create<JustWrittenState>((set) => ({
  ids: new Set(),
  add: (ids) =>
    set((state) =>
      ids.length ? { ids: new Set([...state.ids, ...ids]) } : {},
    ),
}))
