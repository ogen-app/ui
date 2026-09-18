/**
 * The notification inbox (`/api/notifications`), CON-242.
 *
 * The third channel, and the only durable one. Toasts say *this just happened
 * while you watched*; `/api/events` says *your cache is stale* and forgets it
 * the moment you disconnect (`types/events.ts`); email says *act on this while
 * you're away*. A notification is a **recorded fact with a timestamp** — it
 * survives the tab, the laptop lid and the week off, which is the whole premise
 * of a feature for people who were not looking.
 *
 * So the table is the source of truth and SSE only makes an entry appear
 * *instantly*: a client that was offline catches up over REST, never over the
 * stream. See `docs/activity.md`.
 */

/**
 * Severity, and the only field that may drive an icon or a colour.
 *
 * Four values, closed and stable — where `type` is an open vocabulary the
 * server grows without telling us. Styling off `type` means a new producer
 * ships and its rows render as nothing in particular; styling off `level` means
 * they render as what they are.
 */
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error'

/**
 * One row of the inbox, as it arrives from both REST and the stream.
 *
 * `title` and `body` are **the server's English**. They are the fallback, not
 * the copy: everything this app shows comes from the catalogue, and a sentence
 * composed on the wire can never be translated or re-worded without a deploy on
 * both sides. `type` plus `data` is what the client renders from where it knows
 * the type — see `lib/notificationCopy.ts` — and the server's prose is what
 * stands in for a type this build has never heard of.
 */
export type AppNotification = {
  /** sqids. Stable, and what `PATCH`/`DELETE` address. */
  id: string
  /**
   * Monotonic cursor — the stream's `id:` line, the replay anchor, and the
   * bound on "mark all read". **Never a display field**, and never an ordering
   * key that survives a workspace switch: `seq` is per row, not per workspace.
   */
  seq: number
  level: NotificationLevel
  /** Machine key, open-ended: `post.publish_failed`, `asset.ready`, … */
  type: string
  /** Server-rendered English. See the note above — a fallback, not the copy. */
  title: string
  body: string
  /** The thing it is about, when it is about a thing: `post` | `asset` | `campaign` | `social_account`. */
  entity_type: string
  entity_id: string
  /**
   * The server's own deep link, and a hint at best: entity rows carry an
   * app-relative path while the connection ones carry an absolute URL. Route
   * off `entity_type` + `entity_id` instead — `lib/notificationRoute.ts` does.
   */
  action_url: string
  /** Type-specific structured extras. Data, never prose. */
  data: Record<string, unknown> | null
  /** ISO instant, or null. **Null is unread** — there is no separate flag. */
  read_at: string | null
  created_at: string
  /** When the server will reap it, if it ever will. Display data only. */
  expires_at: string | null
}
