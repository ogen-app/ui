/**
 * Lets code outside a form force a debounced autosave to land *now*.
 *
 * The assistant edits posts and campaigns server-side. If the user typed a
 * moment before sending an instruction, their debounce would otherwise fire
 * after the assistant's write and silently overwrite it with pre-edit content.
 * The assistant store flushes through here before starting a turn.
 *
 * Keyed by post or campaign id. A campaign can have several editors registered
 * at once (brief, settings, content usage), so a key holds a set and every
 * flusher runs.
 */
const flushers = new Map<string, Set<() => Promise<void>>>()

/** Registers a flush for a key; returns an unregister for cleanup. */
export function registerPendingSave(key: string, flush: () => Promise<void>): () => void {
  const set = flushers.get(key) ?? new Set<() => Promise<void>>()
  set.add(flush)
  flushers.set(key, set)
  return () => {
    const current = flushers.get(key)
    if (!current) return
    current.delete(flush)
    if (current.size === 0) flushers.delete(key)
  }
}

/** Resolves once every pending save for `key` has been written (or if none). */
export async function flushPendingSave(key: string): Promise<void> {
  const set = flushers.get(key)
  if (!set) return
  // A failed flush must not block the turn — the assistant's write is the more
  // recent intent either way.
  await Promise.allSettled([...set].map((flush) => flush()))
}
