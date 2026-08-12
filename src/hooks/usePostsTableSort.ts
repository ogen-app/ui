import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { SortingState } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { getSetting, putSetting, userScopedKey } from '@/services/api/settings'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'

/**
 * Column ids the posts table may be ordered by.
 *
 * A stored order is only honoured if it names one of these. The list is the
 * validation, so a column that is renamed or dropped can't leave someone's
 * saved preference pointing at a column that no longer exists — they get the
 * default back instead of a table that silently ignores its own header.
 */
export const SORTABLE_POST_COLUMNS = [
  'title',
  'status',
  'platform',
  'scheduled_at',
  'relative_time',
] as const

/**
 * Schedule date, earliest first (CON-170).
 *
 * A content calendar is read forwards — what is going out next — so the
 * table's resting state should be the same order the calendar is in. Posts
 * with no date sort to the bottom rather than the top: "not scheduled yet" is
 * not "scheduled at the beginning of time". See `sortUndefined` on the column.
 */
export const DEFAULT_POSTS_SORT: SortingState = [{ id: 'scheduled_at', desc: false }]

/** Namespace of the settings key the order is stored under. */
const NAMESPACE = 'postsTable'

/** Cycling a header asc → desc → asc is one write, not three. */
const SAVE_DEBOUNCE_MS = 500

export const postsTableSortKey = (userId: string) =>
  ['settings', NAMESPACE, userId] as const

/**
 * Reads the stored blob back into a sorting state, falling back to the default
 * for anything malformed or unrecognised. A bad value must not take the list
 * down, and the next header click overwrites it anyway.
 */
export function parsePostsSort(raw: string | null): SortingState {
  if (!raw) return DEFAULT_POSTS_SORT
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_POSTS_SORT
    const sorting = parsed.filter(
      (entry): entry is { id: string; desc: boolean } =>
        !!entry &&
        typeof entry === 'object' &&
        typeof (entry as { id?: unknown }).id === 'string' &&
        typeof (entry as { desc?: unknown }).desc === 'boolean' &&
        (SORTABLE_POST_COLUMNS as readonly string[]).includes((entry as { id: string }).id),
    )
    // An empty result means the stored order named nothing this build has. The
    // default is a better answer than no order at all — an unsorted table looks
    // like whatever the API happened to return.
    return sorting.length > 0 ? sorting : DEFAULT_POSTS_SORT
  } catch {
    return DEFAULT_POSTS_SORT
  }
}

/**
 * The user's chosen order for the posts table, persisted server-side so it
 * follows them to another browser (CON-170).
 *
 * Account-wide, not per campaign: "I read this table newest-first" is a habit
 * about the table, not a fact about one campaign, and a per-campaign key would
 * make the same list arrive differently sorted depending on where you came
 * from. The key is `postsTable.<userId>` — the API has no user-scoped store,
 * so the identity lives in the key (see `services/api/settings.ts`).
 *
 * Changes paint from the Query cache immediately and the write is debounced
 * behind them, the same shape as `useCalendarSettings`.
 */
export function usePostsTableSort() {
  const { t } = useTranslation()
  const userId = useAuthStore((s) => s.user?.id ?? '')
  const qc = useQueryClient()
  // Stable per user, not per render: the key sits in `setSorting`'s deps, and
  // a fresh array each render would give the callback a fresh identity —
  // defeating the `memo` on PostsTable/VirtualTable it flows into.
  const queryKey = useMemo(() => postsTableSortKey(userId), [userId])
  const storageKey = userScopedKey(NAMESPACE, userId)

  // `isLoading`, not `isPending`: the latter never resolves on a disabled
  // query, and with no user there is nothing to fetch — the default order is
  // the answer, not a placeholder for one.
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => parsePostsSort(await getSetting(storageKey)),
    enabled: !!userId,
    // Nothing else writes this, so the cache is authoritative once loaded.
    staleTime: Infinity,
    // A missing key already resolves `null`, so a retry can only be masking a
    // real failure — and the whole table sits in skeleton while it does. The
    // default order is a fine answer; fail to it fast.
    retry: false,
  })
  const sorting = data ?? DEFAULT_POSTS_SORT

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<{ key: string; value: SortingState } | null>(null)

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const next = pending.current
    pending.current = null
    if (!next) return
    void putSetting(next.key, JSON.stringify(next.value)).catch(() => {
      toast.error(t('postsTable.sortSaveFailed'))
    })
  }, [t])

  // Leaving the page mid-debounce must not lose the change.
  useEffect(() => flush, [flush])

  const setSorting = useCallback(
    (next: SortingState) => {
      // A read still in flight must not land on top of this choice: cancel it,
      // or its (older) answer overwrites the cache while the debounced PUT
      // writes the newer one — table and server disagreeing until next reload.
      void qc.cancelQueries({ queryKey })
      qc.setQueryData(queryKey, next)
      if (!userId) return
      pending.current = { key: storageKey, value: next }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS)
    },
    [qc, queryKey, storageKey, userId, flush],
  )

  return {
    sorting,
    setSorting,
    /**
     * True until the stored order has been read. The table must wait rather
     * than draw itself in the default order and re-sort under the user a
     * moment later — rows jumping after paint reads as a bug, and on a long
     * list you lose whatever you were looking at.
     */
    isPending: isLoading,
  }
}
