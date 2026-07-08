import { create } from 'zustand'

/**
 * Per-post counter bumped whenever something other than the editor replaces a
 * post's content — an assistant edit/restore, a versions-panel restore, or any
 * future foreign mutation. The post route keys its editor on this revision so
 * BlockNote (which only reads `initialContent` on mount) remounts and re-reads
 * the fresh content.
 *
 * Callers must refresh the post query cache BEFORE bumping, otherwise the
 * remounted editor re-reads the stale pre-mutation content.
 */
type PostContentRevisionState = {
  revisions: Record<string, number>
  bump: (postId: string) => void
}

const useStore = create<PostContentRevisionState>()((set) => ({
  revisions: {},
  bump: (postId) =>
    set((s) => ({
      revisions: { ...s.revisions, [postId]: (s.revisions[postId] ?? 0) + 1 },
    })),
}))

/** Editor remount signal for a post (0 until something replaces its content). */
export function usePostContentRevision(postId: string): number {
  return useStore((s) => s.revisions[postId] ?? 0)
}

export function markPostContentReplaced(postId: string): void {
  useStore.getState().bump(postId)
}
