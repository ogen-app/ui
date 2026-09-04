import { readSSEStream } from '@/lib/sse'
import { apiJson, apiVoid } from './http'
import { scopedFetch } from './base'
import { errorMessage } from './errors'
import { isRecord } from './json'
import type { AppNotification, NotificationLevel } from '@/types/notifications'

/**
 * The notification inbox (CON-242) — REST for the truth, SSE for the speed.
 *
 * Both halves answer in the *active workspace*: every call carries
 * `X-Workspace-Id` through `apiJson`/`scopedFetch`, and a row belongs to one
 * user in one workspace. Re-pinning the tab therefore invalidates everything
 * here, cursor included — see `stores/notificationStreamStore`.
 *
 * The contract this is written against is the backend's own hand-off comment on
 * CON-242; two of its shapes are worth keeping in view because they are the
 * ones that would fail silently:
 *
 * - the list is a **bare array**, not `{items: […]}`;
 * - a stream frame's `data:` is the **notification itself**, not the
 *   `{id, topic, type, payload}` envelope `/api/events` uses.
 */

const LIST_PATH = '/api/notifications'

export type NotificationListOptions = {
  /** `unread` filters to `read_at IS NULL`. Dismissed rows never come back either way. */
  status?: 'unread' | 'all'
  /** Server default 30, server max 100. */
  limit?: number
  /** Keyset page backwards: rows older than this `seq`. */
  before?: number
  /** Catch-up: rows newer than this `seq`. */
  since?: number
}

function listQuery(options: NotificationListOptions): string {
  const params = new URLSearchParams()
  if (options.status) params.set('status', options.status)
  if (options.limit !== undefined) params.set('limit', String(options.limit))
  if (options.before !== undefined) params.set('before', String(options.before))
  if (options.since !== undefined) params.set('since', String(options.since))
  const query = params.toString()
  return query ? `?${query}` : ''
}

/** The caller's non-dismissed notifications, newest first. */
export async function listNotifications(
  options: NotificationListOptions = {},
): Promise<AppNotification[]> {
  const rows = await apiJson<unknown>(
    `${LIST_PATH}${listQuery(options)}`,
    'Unable to load notifications',
  )
  // Defensive for the same reason the frame parser is: one unreadable row must
  // not empty the inbox, and a body that isn't an array at all is a contract
  // change we would rather show as "nothing yet" than crash the sidebar on.
  if (!Array.isArray(rows)) return []
  return rows
    .map(parseNotification)
    .filter((row): row is AppNotification => row !== null)
}

/** The badge. Unread *and* not dismissed, in the active workspace. */
export async function unreadNotificationCount(): Promise<number> {
  const body = await apiJson<{ count?: number }>(
    `${LIST_PATH}/unread-count`,
    'Unable to load the unread count',
  )
  return typeof body.count === 'number' ? body.count : 0
}

/** Mark one row read or unread. Idempotent; returns the row as it now stands. */
export async function setNotificationRead(
  id: string,
  read: boolean,
): Promise<AppNotification | null> {
  const body = await apiJson<unknown>(
    `${LIST_PATH}/${id}`,
    'Unable to update that notification',
    { method: 'PATCH', body: { read } },
  )
  return parseNotification(body)
}

/**
 * Mark everything read, up to what the reader has actually seen.
 *
 * `before` is not optional in practice: without it a notification that arrives
 * between the click and the request is marked read having never been on screen.
 * Pass the highest `seq` the reader was shown.
 */
export async function markAllNotificationsRead(
  before?: number,
): Promise<number> {
  const body = await apiJson<{ updated?: number }>(
    `${LIST_PATH}/mark-all-read`,
    'Unable to mark your notifications read',
    { method: 'POST', body: before === undefined ? {} : { before } },
  )
  return typeof body.updated === 'number' ? body.updated : 0
}

/**
 * Soft-delete: it leaves the list and the count for good.
 *
 * **Deliberately not called by any screen.** Dismiss, resolve and snooze are
 * task verbs, and putting them on a feed teaches people that clearing an entry
 * fixes something — which it never does. Activity ships with read and unread as
 * its only verbs, and what is owed is the module next door (CON-234,
 * `docs/activity.md`). Kept here because it is half of the contract CON-242
 * agreed, and its test is what stops that half going dark; the day a surface
 * genuinely wants it, this is what it calls.
 */
export function dismissNotification(id: string): Promise<void> {
  return apiVoid(`${LIST_PATH}/${id}`, 'Unable to dismiss that notification', {
    method: 'DELETE',
  })
}

export type NotificationStreamHandlers = {
  /** Fires once the response headers land — the stream is live from here. */
  onOpen?: () => void
  onNotification: (notification: AppNotification) => void
  /** Fires on any traffic, heartbeats included. Feeds the silence watchdog. */
  onActivity?: () => void
}

/**
 * Opens the durable stream and dispatches notifications until it ends or
 * `signal` aborts.
 *
 * Resolving is not success — the server closing the connection is a normal drop
 * and the caller must reconnect. It throws only when the stream could not be
 * opened at all.
 *
 * `lastEventId` is the replay cursor, sent as `Last-Event-ID`. With one, the
 * server replays every row above it (**capped at 200**) and then goes live;
 * without one the connection is live-only, on the assumption that history came
 * over REST. That cap is why a reconnect refetches page one as well as
 * replaying — see the store.
 *
 * `EventSource` is not an option here for the same reason as everywhere else in
 * this app: it cannot carry `X-Workspace-Id`, so its own reconnects would land
 * in whichever workspace the account defaults to.
 */
export async function streamNotifications(
  handlers: NotificationStreamHandlers,
  signal: AbortSignal,
  options: { lastEventId?: number } = {},
): Promise<void> {
  const headers: Record<string, string> = { Accept: 'text/event-stream' }
  if (options.lastEventId !== undefined) {
    headers['Last-Event-ID'] = String(options.lastEventId)
  }

  const res = await scopedFetch(`${LIST_PATH}/stream`, { headers, signal })

  if (!res.ok || !res.body) {
    throw new Error(
      await errorMessage(res, 'Unable to open the notification stream'),
    )
  }
  handlers.onOpen?.()

  await readSSEStream(
    res.body,
    (frame) => {
      // The stream carries one frame type. Anything else is a producer this
      // build predates, and dropping it beats guessing at its shape.
      if (frame.event !== 'notification') return
      const notification = parseFrame(frame.data)
      if (notification) handlers.onNotification(notification)
    },
    handlers.onActivity,
  )
}

const LEVELS: readonly NotificationLevel[] = [
  'info',
  'success',
  'warning',
  'error',
]

function parseFrame(data: string): AppNotification | null {
  if (!data) return null
  try {
    return parseNotification(JSON.parse(data))
  } catch {
    // A malformed frame is dropped rather than thrown: one bad row must not
    // take down a connection that is otherwise delivering fine.
    return null
  }
}

/**
 * Normalises one row, or rejects it.
 *
 * The two fields that must be right are `id` and `seq` — the first addresses
 * the row, the second is the replay cursor, and a row with a broken cursor
 * would either replay forever or skip everything after it. Everything else has
 * a defensible empty value.
 *
 * A `level` this build doesn't know falls back to `info`, which under-states
 * rather than over-states. It is not expected to happen: `level` is the closed
 * half of the vocabulary, and `type` is the half that grows.
 */
export function parseNotification(value: unknown): AppNotification | null {
  if (!isRecord(value)) return null
  const { id, seq } = value
  if (typeof id !== 'string' || !id) return null
  if (typeof seq !== 'number' || !Number.isFinite(seq)) return null

  const level = LEVELS.includes(value.level as NotificationLevel)
    ? (value.level as NotificationLevel)
    : 'info'

  return {
    id,
    seq,
    level,
    type: typeof value.type === 'string' ? value.type : '',
    title: typeof value.title === 'string' ? value.title : '',
    body: typeof value.body === 'string' ? value.body : '',
    entity_type: typeof value.entity_type === 'string' ? value.entity_type : '',
    entity_id: typeof value.entity_id === 'string' ? value.entity_id : '',
    action_url: typeof value.action_url === 'string' ? value.action_url : '',
    data: isRecord(value.data) ? value.data : null,
    read_at: typeof value.read_at === 'string' ? value.read_at : null,
    created_at: typeof value.created_at === 'string' ? value.created_at : '',
    expires_at: typeof value.expires_at === 'string' ? value.expires_at : null,
  }
}
