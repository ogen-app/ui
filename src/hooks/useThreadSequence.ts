import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getSetting, putSetting } from '@/services/api/settings'
import {
  contentFromItems,
  itemsFromContent,
  parseThreadItems,
  reconcileItems,
  type ThreadItem,
} from '@/lib/threadSequence'
import { toast } from '@/stores/toastStore'
import type { PostAttachment } from '@/types/attachments'

/** Namespace of the settings key a sequence is stored under. */
const NAMESPACE = 'thread-sequence'

/** How long to coalesce keystrokes before writing. A burst of typing is one PUT. */
const SAVE_DEBOUNCE_MS = 700

const EMPTY: ThreadItem[] = []

export const threadSequenceKey = (postId: string) =>
  ['settings', NAMESPACE, postId] as const

type Options = {
  /**
   * False for every post that is not a sequence — which, while the flag is
   * off, is every post. Nothing is fetched, nothing is written, and the post
   * behaves exactly as it did before this hook existed.
   */
  enabled: boolean
  /** The post's body, read once to seed a post with no stored sequence. */
  content: string
  /** The post's attachments, so ids for deleted files stop being trusted. */
  attachments: Pick<PostAttachment, 'id'>[]
  /**
   * Writes the rejoined items back onto the post's `content`. Called from the
   * flush rather than from every keystroke, so a burst of typing is one
   * settings PUT and one post PUT, and there is no window where a slow request
   * lands after a later one and leaves the post describing words the user has
   * moved on from.
   */
  onCommitContent: (next: string) => void
}

/**
 * The posts that make up a thread sequence, and the only place they are
 * edited (CON-196).
 *
 * **This lives in the tenant key/value store because the post has nowhere to
 * put it.** A post carries one `content` column; a sequence is an ordered list
 * of bodies each with its own media, and there is no field on the model — nor
 * a `platformSpecificData` in the submit request — to hold one. So the shape
 * sits under `thread-sequence.<postId>` in the same store the campaign's
 * account targets use while waiting for their column, with all the same
 * limits: the row is workspace-wide, every change rewrites the whole list, and
 * two people editing the same post in the same second means the later write
 * wins. See the `thread-sequence` flag for what the back end has to add.
 *
 * The post's own `content` stays the platform-facing summary and is written
 * alongside every change, which is deliberate on two counts. It is what Zernio
 * does with the field anyway when `threadItems` is present — "used only for
 * display and search purposes, it is NOT published" — and it means the
 * calendar, the posts table, search and the assistant keep reading the post's
 * words from the field they already read, rather than finding it empty.
 */
export function useThreadSequence(postId: string, options: Options) {
  const { enabled, content, attachments, onCommitContent } = options
  const qc = useQueryClient()
  const queryKey = threadSequenceKey(postId)
  const storageKey = `${NAMESPACE}.${postId}`

  // Held in a ref rather than in the query key: the seed is only consulted
  // when nothing is stored, and keying on it would refetch on every keystroke
  // once the body is written back.
  const seed = useRef(content)
  seed.current = content

  // `isLoading`, not `isPending`: a disabled query stays pending forever, and
  // a post that is not a sequence has nothing to wait for.
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () =>
      parseThreadItems(await getSetting(storageKey)) ??
      itemsFromContent(seed.current),
    enabled: enabled && !!postId,
    // Nothing else writes this key, so the cache is authoritative once loaded.
    staleTime: Infinity,
  })

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<{ key: string; value: ThreadItem[] } | null>(null)

  // Held in a ref so `flush` can stay identity-stable: it is the unmount
  // cleanup below, and a callback that changes with the post would flush the
  // debounce every time the post is refetched. `t` is here for the same
  // reason — it is a new function on every language change.
  const commit = useRef(onCommitContent)
  commit.current = onCommitContent
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
    commit.current(contentFromItems(next.value))
  }, [])

  // Leaving the post mid-debounce must not lose what was typed.
  useEffect(() => flush, [flush])

  /**
   * What the editor renders: the stored list with references to attachments
   * that are no longer on the post taken out. Derived rather than written back
   * — deleting a file is an attachment mutation that knows nothing about the
   * sequence, so a stale id is the normal state, and the next real edit
   * persists the cleaned list on its own.
   */
  const itemsValue = useMemo(
    () => (data ? reconcileItems(data, attachments) : EMPTY),
    [data, attachments],
  )

  const setItems = useCallback(
    (next: ThreadItem[]) => {
      if (!enabled || !postId) return
      qc.setQueryData(queryKey, next)
      pending.current = { key: storageKey, value: next }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS)
    },
    [qc, queryKey, storageKey, postId, enabled, flush],
  )

  /** Applies a change to the reconciled list — what every editor action calls. */
  const update = useCallback(
    (fn: (items: ThreadItem[]) => ThreadItem[]) => {
      setItems(fn(itemsValue))
    },
    [setItems, itemsValue],
  )

  return {
    items: itemsValue,
    loading: enabled && isLoading,
    setItems,
    update,
  }
}
