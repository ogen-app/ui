/**
 * Lets code outside the editor force a debounced autosave to land *now*.
 *
 * The assistant edits a post server-side. If the user typed a moment before
 * sending an instruction, their 600ms debounce would otherwise fire after the
 * assistant's write and silently overwrite it with pre-edit content. The
 * assistant store flushes through here before starting a turn.
 */
const flushers = new Map<string, () => Promise<void>>()

/** Registers the flush for a key; returns an unregister for cleanup. */
export function registerPendingSave(key: string, flush: () => Promise<void>): () => void {
  flushers.set(key, flush)
  return () => {
    if (flushers.get(key) === flush) flushers.delete(key)
  }
}

/** Resolves once any pending save for `key` has been written (or if none). */
export async function flushPendingSave(key: string): Promise<void> {
  await flushers.get(key)?.()
}
