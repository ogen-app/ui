import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getSetting, putSetting } from '@/services/api/settings'
import {
  assignAttachment,
  parseAssignment,
  reconcileAssignment,
  type ThreadAssignment,
} from '@/lib/threadSequence'
import { toast } from '@/stores/toastStore'
import type { PostAttachment } from '@/types/attachments'

/** Namespace of the settings key an assignment is stored under. */
const NAMESPACE = 'thread-sequence'

/** How long to coalesce changes before writing. */
const SAVE_DEBOUNCE_MS = 700

const EMPTY: ThreadAssignment = {}

export const threadSequenceKey = (postId: string) =>
  ['settings', NAMESPACE, postId] as const

type Options = {
  /**
   * False for every post that is not a thread — which, while the flag is off,
   * is every post. Nothing is fetched, nothing is written, and the post
   * behaves exactly as it did before this hook existed.
   */
  enabled: boolean
  /** The post's attachments, so entries for deleted files stop being trusted. */
  attachments: Pick<PostAttachment, 'id'>[]
}

/**
 * Which post of a thread carries which file (CON-196).
 *
 * **This is all a thread stores.** The words live in the post's `content` and
 * the chain is derived from it (`lib/threadSequence`), so there is nothing to
 * keep in step and no second copy to go stale. The one thing a Markdown body
 * cannot express is that the third image belongs on the fourth post — so that
 * map, and nothing else, sits under `thread-sequence.<postId>` in the tenant
 * key/value store, the same stand-in `campaign-accounts` uses while waiting
 * for its column, with the same limits: workspace-wide, whole-value writes,
 * last write wins.
 *
 * Losing it is survivable by design. An attachment with no entry rides the
 * first post, which is exactly where the X card put every file before this
 * feature existed.
 */
export function useThreadSequence(postId: string, options: Options) {
  const { enabled, attachments } = options
  const qc = useQueryClient()
  const queryKey = threadSequenceKey(postId)
  const storageKey = `${NAMESPACE}.${postId}`

  // `isLoading`, not `isPending`: a disabled query stays pending forever, and
  // a post that is not a thread has nothing to wait for.
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => parseAssignment(await getSetting(storageKey)),
    enabled: enabled && !!postId,
    // Nothing else writes this key, so the cache is authoritative once loaded.
    staleTime: Infinity,
  })

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<{ key: string; value: ThreadAssignment } | null>(null)

  // Held in a ref so `flush` can stay identity-stable: it is the unmount
  // cleanup below, and a callback that changes with the language would flush
  // the debounce on every switch.
  const { t } = useTranslation()
  const translate = useRef(t)
  translate.current = t

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const next = pending.current
    pending.current = null
    if (!next) return
    void putSetting(next.key, JSON.stringify(next.value)).catch(() => {
      toast.error(translate.current('posts.sequence.saveFailed'))
    })
  }, [])

  // Leaving the post mid-debounce must not lose the choice.
  useEffect(() => flush, [flush])

  /**
   * What the plan reads: the stored map with entries for files that are no
   * longer on the post taken out. Derived rather than written back — deleting
   * a file is an attachment mutation that knows nothing about the thread, so a
   * stale entry is the normal state, and the next real change persists the
   * cleaned map on its own.
   */
  const assignment = useMemo(
    () => (data ? reconcileAssignment(data, attachments) : EMPTY),
    [data, attachments],
  )

  const write = useCallback(
    (next: ThreadAssignment) => {
      if (!enabled || !postId) return
      qc.setQueryData(queryKey, next)
      pending.current = { key: storageKey, value: next }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS)
    },
    [qc, queryKey, storageKey, postId, enabled, flush],
  )

  /** Moves one file onto a post of the chain — the media card's one action. */
  const assign = useCallback(
    (attachmentId: string, index: number) => {
      write(assignAttachment(assignment, attachmentId, index))
    },
    [write, assignment],
  )

  return {
    assignment,
    loading: enabled && isLoading,
    assign,
  }
}
