import type { QueryClient } from '@tanstack/react-query'
import type { AppNotification } from '@/types/notifications'

/**
 * The cached inbox, and the rules for changing it (CON-242).
 *
 * Lives in `lib/` rather than beside `useNotifications` because the live stream
 * has to write the same cache the hook reads, and the stream sits *underneath*
 * that hook's imports — the same cycle `queryKeys.ts` and `postCache.ts` exist
 * to break.
 *
 * Two things are held: one page of rows and the unread count. The count is a
 * separate query rather than a length, because it counts the whole inbox and
 * the page is only the newest slice of it — a badge derived from what is on
 * screen would say "3" to someone with thirty unread.
 *
 * Which is also why the count is *adjusted* here rather than refetched on every
 * change. A stream that delivers a burst would otherwise cost one request per
 * frame, and every one of them would race the others. The adjustments are exact
 * — a row is unread or it isn't — and the server's own answer lands over them
 * on the next refetch anyway.
 */

/** Everything the inbox holds, for invalidating the lot on a workspace switch. */
export const NOTIFICATIONS_KEY = ['notifications'] as const

/** The newest page of rows. */
export const NOTIFICATION_LIST_KEY = ['notifications', 'list'] as const

/** The badge: unread and not dismissed, across the whole inbox. */
export const NOTIFICATION_UNREAD_KEY = ['notifications', 'unread'] as const

/**
 * How many rows the feed asks for.
 *
 * The server's own maximum. A page rather than infinite scroll because the feed
 * has a second source of history behind it — the daily reports, computed from
 * the campaign summaries — so scrolling past the newest hundred *events* does
 * not land on nothing. The screen says when it is showing a full page, which is
 * the honest half of that trade.
 */
export const NOTIFICATION_PAGE_SIZE = 100

/** Newest first, which is both the server's order and the feed's. */
function bySeqDesc(a: AppNotification, b: AppNotification): number {
  return b.seq - a.seq
}

/**
 * Put a row into a page, replacing whatever was there under the same id.
 *
 * Deduped by `id` rather than by `seq`: they agree today, and `id` is the one
 * the writes address. A replay after a reconnect re-sends rows the client
 * already has, so this runs on nearly every catch-up.
 */
export function mergeNotification(
  rows: AppNotification[],
  row: AppNotification,
): AppNotification[] {
  const without = rows.filter((existing) => existing.id !== row.id)
  return [...without, row].sort(bySeqDesc)
}

/** Whether a page already holds this row — i.e. whether it is news. */
export function holdsNotification(
  rows: AppNotification[],
  id: string,
): boolean {
  return rows.some((row) => row.id === id)
}

/** The replay cursor: the highest `seq` this client has been shown. */
export function highestSeq(rows: AppNotification[]): number | null {
  let highest: number | null = null
  for (const row of rows) {
    if (highest === null || row.seq > highest) highest = row.seq
  }
  return highest
}

/** Reads the cached page, or an empty one. */
export function cachedNotifications(qc: QueryClient): AppNotification[] {
  return qc.getQueryData<AppNotification[]>(NOTIFICATION_LIST_KEY) ?? []
}

/** Nudges the badge, never below zero. A no-op when it has never been read. */
export function adjustUnread(qc: QueryClient, delta: number): void {
  const current = qc.getQueryData<number>(NOTIFICATION_UNREAD_KEY)
  if (typeof current !== 'number') return
  qc.setQueryData(NOTIFICATION_UNREAD_KEY, Math.max(0, current + delta))
}

/**
 * A row arriving live.
 *
 * Returns whether it was news — the caller uses it to decide whether anything
 * needs saying out loud. A replayed row is not news: it is a row the reader has
 * already been shown, arriving a second time because the connection dropped.
 */
export function landLiveNotification(
  qc: QueryClient,
  row: AppNotification,
): boolean {
  const rows = cachedNotifications(qc)
  const isNew = !holdsNotification(rows, row.id)
  qc.setQueryData(NOTIFICATION_LIST_KEY, mergeNotification(rows, row))
  if (isNew && !row.read_at) adjustUnread(qc, 1)
  return isNew
}

/**
 * A row the user just changed, as the server now holds it.
 *
 * The badge moves only when the read state actually crossed — clicking "read"
 * twice must not spend two off the count.
 */
export function landChangedNotification(
  qc: QueryClient,
  row: AppNotification,
): void {
  const rows = cachedNotifications(qc)
  const before = rows.find((existing) => existing.id === row.id)
  qc.setQueryData(NOTIFICATION_LIST_KEY, mergeNotification(rows, row))
  if (!before) return
  const wasUnread = !before.read_at
  const isUnread = !row.read_at
  if (wasUnread !== isUnread) adjustUnread(qc, isUnread ? 1 : -1)
}

/** A dismissed row: gone from the page and from the count, for good. */
export function dropNotification(qc: QueryClient, id: string): void {
  const rows = cachedNotifications(qc)
  const dropped = rows.find((row) => row.id === id)
  qc.setQueryData(
    NOTIFICATION_LIST_KEY,
    rows.filter((row) => row.id !== id),
  )
  if (dropped && !dropped.read_at) adjustUnread(qc, -1)
}

/**
 * Everything up to `before` is read now.
 *
 * Bounded rather than blanket, because the request is: a row that arrived
 * between the click and the response was never on screen, and marking it read
 * would hide it for good.
 */
export function markCachedRead(
  qc: QueryClient,
  before: number | null,
  at: string,
): void {
  const rows = cachedNotifications(qc)
  let cleared = 0
  const next = rows.map((row) => {
    if (row.read_at) return row
    if (before !== null && row.seq > before) return row
    cleared += 1
    return { ...row, read_at: at }
  })
  qc.setQueryData(NOTIFICATION_LIST_KEY, next)
  // The count spans more than this page, so the local adjustment is a floor on
  // the truth rather than the truth. The refetch that follows the write settles
  // it; this only stops the badge sitting there stale in the meantime.
  if (cleared) adjustUnread(qc, -cleared)
}
