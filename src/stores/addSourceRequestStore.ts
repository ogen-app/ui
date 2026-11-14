import { create } from 'zustand'

/**
 * The assistant's last `open_add_source` (CON-484): which Assets page it
 * opened, and the rail row that can take it back. The page says so in a
 * banner, with BACK, for as long as the user is there and hasn't added
 * anything — the request it opened for waits until a file is read.
 *
 * Session state, never persisted: it is about this visit to the page.
 */
export type AddSourceRequest = {
  /** The campaign whose Assets it opened; `null` for the workspace's. */
  campaignId: string | null
  threadId: string
  turnId: string
  /** The action's place among the turn's, which is what UNDO takes. */
  index: number
}

type AddSourceRequestState = {
  request: AddSourceRequest | null
  mark: (request: AddSourceRequest) => void
  clear: () => void
}

export const useAddSourceRequestStore = create<AddSourceRequestState>(
  (set) => ({
    request: null,
    mark: (request) => set({ request }),
    clear: () => set((s) => (s.request ? { request: null } : {})),
  }),
)
