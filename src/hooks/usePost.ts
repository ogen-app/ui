import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelPost,
  getPost,
  postToPayload,
  schedulePost,
  updatePost,
  verifyExternalPost,
  type CancelTarget,
} from '@/services/api/posts'
import { registerPendingSave } from '@/lib/pendingSaves'
import { cachedPostFromList, landSavedPost } from '@/lib/postCache'
import type { Post, PostStatus } from '@/types/posts'

const SAVE_DEBOUNCE_MS = 600

// How often to refetch a `scheduled` post. While scheduled, the backend
// changes the status on its own (publisher auto-publish, or a cancel job
// landing an unschedule), so we poll to surface those without a reload.
const SCHEDULED_POLL_MS = 5_000

/**
 * The editor's copy of a post, and only the editor's.
 *
 * The calendar and the list read the same post from a different namespace
 * (`campaignPostsKey`), and neither key invalidates the other. So every write
 * in this hook lands twice: `setQueryData` here, `landSavedPost` there. Skip
 * the second and the post keeps its old title everywhere outside the editor
 * for the next 30 seconds — the `staleTime` — which is longer than it takes to
 * rename a post and press Back.
 */
export const postKey = (id: string) => ['post', id] as const

export type TransitionStatusResult =
  // `notice` is informational feedback about a successful action the user
  // should still be told about — e.g. the server routed a schedule request
  // somewhere other than where the button implied.
  { ok: true; post: Post; notice?: string } | { ok: false; error: string }

/**
 * Outcome of handing the server a manually-published post's URL. `not_found`
 * is deliberately its own case rather than an error: the platform having no
 * post at that URL is the expected result of a typo, and the dialog answers
 * it with a retry instead of a failure.
 */
export type VerifyExternalResult =
  | { ok: true; post: Post }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'error'; error: string }

type UsePostResult = {
  doc: Post | undefined
  changeDoc: (fn: (p: Post) => void) => void
  transitionStatus: (next: PostStatus) => Promise<TransitionStatusResult>
  // Completes a manual publish by verifying the URL the user published at
  // (POST /api/posts/:id/verify-external). The server owns the transition
  // here — it marks the post published only if the URL really resolves to
  // one — so unlike transitionStatus there is no optimistic flip.
  verifyExternal: (url: string) => Promise<VerifyExternalResult>
  // Schedules a ready_for_publish post via POST /api/posts/:id/schedule
  // (NOT a status PUT — that path skips the server's date validation).
  // The returned post carries the allowlist-routed status: `scheduled`
  // or `scheduled_for_manual_publishing`.
  schedule: () => Promise<TransitionStatusResult>
  // Requests cancellation of a Scheduled post via the cancel endpoint. The
  // status doesn't change synchronously — the poll above picks up the flip
  // once the worker confirms. Kept separate from transitionStatus so a
  // user-cancel is never executed as a plain status PUT (which would leave
  // the Zernio job running).
  cancelScheduled: (target: CancelTarget) => Promise<TransitionStatusResult>
  // True from the moment a cancellation is requested until the post
  // actually leaves `scheduled` (worker confirmed, or it published in the
  // race). Drives the "Unscheduling…" indicator and disables actions so a
  // second cancel job isn't enqueued while the first is in flight.
  cancelling: boolean
  // True while an autosave is pending (debounce running or PUT in flight).
  // Drives the sync-status indicator in the post header.
  saving: boolean
  loading: boolean
  error: Error | undefined
}

export function usePost(postId: string): UsePostResult {
  const qc = useQueryClient()
  // Opening a post the campaign list already holds costs no round trip and,
  // more visibly, no loading state: the route unmounts the whole editor while
  // `isLoading` is true, which takes the right sidebar's panel scope with it —
  // so an uncached post used to slide the rail shut and open again on arrival,
  // while a cached one didn't. Only consulted when `['post', id]` is empty;
  // Query ignores `initialData` for a key it already has.
  const seed = useMemo(() => cachedPostFromList(qc, postId), [qc, postId])
  const query = useQuery({
    queryKey: postKey(postId),
    queryFn: () => getPost(postId),
    enabled: !!postId,
    initialData: seed?.post,
    // The list's age, not this moment's — a seed older than the 30s staleTime
    // refetches straight away instead of passing for fresh.
    initialDataUpdatedAt: seed?.updatedAt,
    refetchInterval: (q) =>
      q.state.data?.status === 'scheduled' ? SCHEDULED_POLL_MS : false,
  })

  const [cancelling, setCancelling] = useState(false)
  const [saving, setSaving] = useState(false)
  const pendingRef = useRef<Post | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const genRef = useRef(0)
  // The post the editor is on *now*, readable from a flush that outlived a
  // post switch — `postId` in that closure is the post the flush was armed
  // for, which is exactly the comparison `flush` needs to make.
  const postIdRef = useRef(postId)
  postIdRef.current = postId
  /**
   * The status a transition has asked the server for, while the answer is in
   * flight. An edit made during that window clones the cache, which still
   * carries the *old* status — and its later flush would PUT the transition
   * away again. Stamping the requested status onto the clone keeps the
   * autosave and the transition agreeing; if the server refuses the move, the
   * catch's invalidate restores the truth either way.
   */
  const transitionRef = useRef<PostStatus | null>(null)

  /**
   * The autosave PUT, and the only call in this hook that goes through a
   * mutation.
   *
   * It has to, because it is the one write with nobody to report it: the
   * deliberate actions below all hand a `{ ok: false, error }` back to a
   * caller that raises its own toast, while an autosave has no caller — it
   * fires off a debounce. Its failure path invalidates, which pulls the
   * server's copy back over what the user typed, so without a toast the
   * editor silently discards their words (CON-164 §2, the `useUpdatePost`
   * pathology in a hook that isn't one).
   *
   * Routing the others through here too would make them toast twice.
   *
   * Only `mutateAsync` is used; the mutation's own state is ignored, since
   * `saving` below tracks the debounce as well as the request.
   */
  const { mutateAsync: saveDoc } = useMutation({
    meta: { errorTitle: 'Unable to save your changes' },
    // The id travels with the doc, not in the closure: `mutateAsync` resolves
    // `mutationFn` from the *latest* render's options, so after an arrow-key
    // post switch a flush of post A's pending edit would otherwise PUT it to
    // post B — overwriting B wholesale with A's content (CON-195 review).
    mutationFn: ({ id, next }: { id: string; next: Post }) =>
      updatePost(id, postToPayload(next)),
  })

  const flush = useCallback(async () => {
    const next = pendingRef.current
    if (!next) return
    timerRef.current = null
    pendingRef.current = null
    const genAtFlush = genRef.current
    try {
      // `postId` here is the closure's — the post this flush was armed for.
      const saved = await saveDoc({ id: postId, next })
      if (genRef.current === genAtFlush) {
        qc.setQueryData(postKey(postId), saved)
        // The same row, in the list the calendar reads. Gen-guarded with the
        // write above so two overlapping flushes can't land out of order —
        // the newer one follows within a debounce either way.
        landSavedPost(qc, saved)
      } else if (postId !== postIdRef.current) {
        // The gen counter moved because the editor switched posts and typing
        // resumed — a *different* post's words, so the ordering concern above
        // doesn't apply, and no later flush for this post is coming. The row
        // is keyed by its own id, so land it; only the editor-key write is
        // skipped (that cache already holds this optimistic copy).
        landSavedPost(qc, saved)
      }
    } catch {
      // Toasted by the mutation-cache default under the `errorTitle` above.
      // The invalidate is what makes that toast necessary: it replaces the
      // user's unsaved edit with the server's copy.
      qc.invalidateQueries({ queryKey: postKey(postId) })
    } finally {
      // A new edit may have queued another debounce while the PUT was in
      // flight — only report "saved" when nothing is left to persist.
      if (pendingRef.current === null && timerRef.current === null) {
        setSaving(false)
      }
    }
  }, [postId, qc, saveDoc])

  const changeDoc = useCallback(
    (fn: (p: Post) => void) => {
      const base = pendingRef.current ?? qc.getQueryData<Post>(postKey(postId))
      if (!base) return
      const next = structuredClone(base)
      fn(next)
      if (transitionRef.current) next.status = transitionRef.current
      pendingRef.current = next
      genRef.current += 1
      setSaving(true)
      qc.setQueryData(postKey(postId), next)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        void flush()
      }, SAVE_DEBOUNCE_MS)
    },
    [postId, qc, flush],
  )

  // Cancel the debounce and write immediately. Exposed to the assistant store
  // (which edits this post server-side) so a queued PUT can't land afterwards
  // and overwrite the assistant's edit with pre-edit content.
  const flushNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    await flush()
  }, [flush])

  useEffect(() => registerPendingSave(postId, flushNow), [postId, flushNow])

  // Status transitions skip the autosave debounce: they're committed
  // user actions, the server enforces a transition graph, and we want
  // to surface failures (invalid edge, missing platform) immediately.
  // We merge any pending autosave changes into the same PUT so a
  // half-typed title isn't lost when the user clicks "Schedule".
  //
  // The new status is sent but never written to the cache ahead of the
  // response — the badge is what the *server* says the post is. A status is
  // not a field like a title, where showing the typed value early is simply
  // showing what the user did: it is a claim about what the system will now
  // do to the post, and the server can refuse (invalid edge, missing
  // platform, a publisher that won't take it). Every other action here —
  // `schedule`, `cancelScheduled`, `verifyExternal` — already waits for that
  // answer; this one no longer pretends. The caller's `pending` flag is what
  // covers the wait, not a badge that might have to be taken back.
  const transitionStatus = useCallback(
    async (next: PostStatus): Promise<TransitionStatusResult> => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      const base = pendingRef.current ?? qc.getQueryData<Post>(postKey(postId))
      if (!base) return { ok: false, error: 'Post not loaded' }
      pendingRef.current = null
      setSaving(false)
      // The payload, not a cache entry: `base` already carries the user's
      // typed edits (changeDoc writes them through), so the editor keeps
      // showing their words while only the status waits.
      const requested = structuredClone(base)
      requested.status = next
      genRef.current += 1
      const genAtStart = genRef.current
      transitionRef.current = next
      try {
        const saved = await updatePost(postId, postToPayload(requested))
        // Gen-guarded like `flush`: an edit made during the round-trip has
        // already written its clone (carrying the requested status, via
        // `transitionRef`) into the cache, and the server's copy must not
        // stomp the user's newer words.
        if (genRef.current === genAtStart) {
          qc.setQueryData(postKey(postId), saved)
        }
        // Unguarded, unlike the cache write: the gen counter is about whose
        // *words* are newer, and a status is not something the user can have
        // typed past. The list must show the status the server just confirmed.
        landSavedPost(qc, saved)
        return { ok: true, post: saved }
      } catch (err) {
        // The server refused the move, so any edit stamped with the requested
        // status while the answer was in flight must stop asking for it — its
        // flush would otherwise re-send the refused transition as a plain
        // status PUT (and, for `scheduled`, dodge the schedule endpoint's
        // date validation).
        // The cast undoes control-flow narrowing: TS still sees the `= null`
        // above and can't know `changeDoc` may have refilled the ref during
        // the await.
        const pendingEdit = pendingRef.current as Post | null
        if (pendingEdit && pendingEdit.status === next) {
          pendingEdit.status = base.status
        }
        qc.invalidateQueries({ queryKey: postKey(postId) })
        const message =
          err instanceof Error ? err.message : 'Unable to update post'
        return { ok: false, error: message }
      } finally {
        transitionRef.current = null
      }
    },
    [postId, qc],
  )

  // Scheduling goes through the dedicated endpoint so the server validates
  // the date (required, in the future) and routes auto- vs manual-publish
  // via the allowlist. No optimistic status flip: the routed status is the
  // server's decision, so we wait for the response. Pending autosave edits
  // are persisted first — the schedule must capture what the user sees,
  // and the schedule endpoint's body carries only the date.
  const schedule = useCallback(async (): Promise<TransitionStatusResult> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const pending = pendingRef.current
    pendingRef.current = null
    setSaving(false)
    const base = pending ?? qc.getQueryData<Post>(postKey(postId))
    if (!base) return { ok: false, error: 'Post not loaded' }
    if (!base.scheduled_at)
      return { ok: false, error: 'Set a publish date first' }
    genRef.current += 1
    try {
      if (pending) {
        await updatePost(postId, postToPayload(pending))
      }
      const result = await schedulePost(postId, base.scheduled_at)
      qc.setQueryData(postKey(postId), result.post)
      landSavedPost(qc, result.post)
      // The user clicked "Schedule" expecting auto-publish, but the
      // allowlist routed the post to manual publishing. The badge flips
      // silently, so attach a notice explaining what happened.
      if (result.post.status === 'scheduled_for_manual_publishing') {
        return {
          ok: true,
          post: result.post,
          notice:
            "This platform isn't set up for auto-publishing, so you'll need " +
            'to publish it yourself when the reminder comes up.',
        }
      }
      return { ok: true, post: result.post }
    } catch (err) {
      qc.invalidateQueries({ queryKey: postKey(postId) })
      const message =
        err instanceof Error ? err.message : 'Unable to schedule post'
      return { ok: false, error: message }
    }
  }, [postId, qc])

  // Cancellation is asynchronous on the server: it enqueues a Zernio
  // cancel job and the post stays `scheduled` until the worker confirms,
  // then transitions to `target`. We don't optimistically flip the status
  // — the scheduled poll lands the real change. We do drop any pending
  // autosave so a debounced PUT can't race the cancel.
  const cancelScheduled = useCallback(
    async (target: CancelTarget): Promise<TransitionStatusResult> => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      pendingRef.current = null
      setSaving(false)
      genRef.current += 1
      setCancelling(true)
      try {
        await cancelPost(postId, target)
        const fresh = await getPost(postId)
        qc.setQueryData(postKey(postId), fresh)
        landSavedPost(qc, fresh)
        // Stay `cancelling`: fresh is still `scheduled` and the worker
        // hasn't landed the transition yet. The effect below clears it
        // once the status actually changes.
        return { ok: true, post: fresh }
      } catch (err) {
        setCancelling(false)
        const message =
          err instanceof Error ? err.message : 'Unable to unschedule post'
        return { ok: false, error: message }
      }
    },
    [postId, qc],
  )

  // Completing a manual publish: the user published by hand and hands us the
  // URL, the server matches it through Zernio and only then marks the post
  // published. No optimistic flip — "did this actually go out?" is precisely
  // the question being asked, so showing `published` before the answer
  // arrives would assert what we're checking.
  const verifyExternal = useCallback(
    async (url: string): Promise<VerifyExternalResult> => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      const pending = pendingRef.current
      pendingRef.current = null
      setSaving(false)
      genRef.current += 1
      try {
        // Persist queued edits first. Verification moves the status
        // server-side, so a debounced PUT landing afterwards would carry the
        // pre-publish status in its payload and quietly undo the publish.
        if (pending) {
          await updatePost(postId, postToPayload(pending))
        }
        const result = await verifyExternalPost(postId, { url })
        if (!result.found) return { ok: false, reason: 'not_found' }
        // The response carries only the publisher linkage, so the status,
        // published_at and publisher the server just wrote come from a
        // refetch rather than being reconstructed here.
        const fresh = await getPost(postId)
        qc.setQueryData(postKey(postId), fresh)
        landSavedPost(qc, fresh)
        return { ok: true, post: fresh }
      } catch (err) {
        qc.invalidateQueries({ queryKey: postKey(postId) })
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to verify the published post'
        return { ok: false, reason: 'error', error: message }
      }
    },
    [postId, qc],
  )

  // This hook survives a post switch (arrow-key navigation swaps the route
  // param without unmounting `PostPage`), so per-post state has to be walked
  // back by hand. Left alone, post A's `cancelling` would hold post B's bar
  // in "busy" forever — B being `scheduled` too means the clearing effect
  // below never fires — and A's `saving` would show over B. The pending-edit
  // refs need no reset here: the flush-on-change cleanup at the bottom
  // drains them to A before this runs.
  useEffect(() => {
    setCancelling(false)
    setSaving(false)
  }, [postId])

  // Clear the unscheduling indicator once the post leaves `scheduled` —
  // either the cancel job landed the target status, or it published in the
  // race. Until then the poll keeps the badge on `scheduled`.
  const status = query.data?.status
  useEffect(() => {
    if (cancelling && status !== undefined && status !== 'scheduled') {
      setCancelling(false)
    }
  }, [cancelling, status])

  // Worker-driven flips arrive through the poll, not through any write in
  // this hook — the one path "land every post write" would otherwise miss.
  // Keyed on the two fields a worker can change, so an unschedule the user
  // watched complete doesn't leave the calendar showing `scheduled` for the
  // list's staleTime. Every hook-side write already lands itself; landing
  // again on those changes is an idempotent re-patch of the same row.
  const polled = query.data
  const scheduledAt = polled?.scheduled_at
  useEffect(() => {
    if (polled) landSavedPost(qc, polled)
  }, [qc, status, scheduledAt]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
        void flush()
      }
    }
  }, [flush])

  return {
    doc: query.data,
    changeDoc,
    transitionStatus,
    verifyExternal,
    schedule,
    cancelScheduled,
    cancelling,
    saving,
    loading: query.isLoading,
    error: query.error ?? undefined,
  }
}
