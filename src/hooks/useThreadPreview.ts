import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { previewThread } from '@/services/api/posts'

/**
 * How long the body has to sit still before we ask the server what it splits
 * into.
 *
 * Shorter than the editor's own 600ms autosave, and deliberately so: the note
 * under the editor should settle *before* the save it is describing, or the
 * author watches the message count change after the post has already been
 * written. Both are debounces over the same keystrokes, but they are not the
 * same debounce — this one is cancelled by a body the cache already knows,
 * which is most of them.
 */
const SETTLE_MS = 350

export const threadPreviewKey = (platformId: string, content: string) =>
  ['posts', 'thread-preview', platformId, content] as const

/**
 * Where a body breaks into messages, according to the only thing that gets a
 * vote (CON-284 R2).
 *
 * R2 put the split on the server — `content` is the thread's canonical body and
 * `thread_segments` is the server's arithmetic over it — so a client that cut
 * the body itself would be drawing a thread nobody is going to publish. This
 * hook is how the composer reads the real answer, and it carries the publish
 * gate's verdict with it: the endpoint validates exactly as the gate will, so
 * `valid`/`errors` are the same 422 the author would meet at schedule time,
 * several minutes earlier.
 *
 * **Cached forever, per body.** The same body on the same platform always
 * splits the same way — the endpoint is a pure function with a database read in
 * front of it — so there is nothing to go stale, and a query key *is* the body.
 * That is what makes the cost bearable: a keystroke that lands back on a body
 * already asked about (undo, a retyped word, arrowing around) answers from
 * memory. `keepPreviousData` covers the rest, so the note ages rather than
 * blanking while the next answer is in flight.
 *
 * Passing `enabled: false` — an ordinary post, or the flag off — is what keeps
 * every other post type from ever touching the endpoint.
 */
export function useThreadPreview({
  content,
  platformId,
  enabled,
}: {
  content: string
  platformId: string
  enabled: boolean
}) {
  const settled = useSettled(content, SETTLE_MS)

  // Not `content.trim()`: an empty body has no thread in it, and asking would
  // spend a request to be told so.
  const ready = enabled && !!platformId && settled.trim().length > 0

  const query = useQuery({
    queryKey: threadPreviewKey(platformId, settled),
    queryFn: () => previewThread(settled, platformId),
    enabled: ready,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    // A preview is advice, not a save. Retrying a failed one would keep the
    // note stale for longer while the next keystroke is about to supersede it
    // anyway.
    retry: false,
  })

  return {
    preview: query.data,
    /**
     * True while the answer on screen is about an older body than the one in
     * the editor — including the gap before the debounce fires, which
     * `isFetching` alone does not cover. Readers use this to age the note
     * rather than to hide it.
     */
    stale: ready && (settled !== content || query.isFetching),
    error: query.error,
  }
}

/** `value`, but only after it has stopped changing for `ms`. */
function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])

  return settled
}
