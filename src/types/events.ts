/**
 * The broadcast event stream (`GET /api/events`), CON-134.
 *
 * Everything else the UI streams is request-scoped: you POST, and the stream
 * ends when your work does. This is the only channel that carries things the
 * tab did not itself start — a teammate's edit, a background analytics job, a
 * social account going dead.
 *
 * Its delivery guarantee is *at-most-once*. The server keeps no event log and
 * ignores `Last-Event-ID`, and it deliberately drops subscribers it can't keep
 * up with. So an event is a hint that something changed, never the change
 * itself: the recovery path is refetch, not replay.
 */

/** The JSON envelope carried in each frame's `data:`. */
export type AppEvent = {
  /** Minted per event. The zernio publishers currently send an empty string. */
  id: string
  /** Routing key — see `parseTopic`. */
  topic: string
  /** Repeats the frame's `event:` field. */
  type: string
  payload: Record<string, unknown> | null
  created_at: string
}

/**
 * A topic split into the thing it is about.
 *
 * The wire grammar is `kind:id` with `entity:` prefixing the per-record ones
 * (`src/eventhub/topic.go`). `unknown` is not an error — the backend can add a
 * topic before this app knows what to do with it, and the stream must keep
 * running when it does.
 */
export type EventSubject =
  | { kind: 'post'; id: string }
  | { kind: 'campaign'; id: string }
  | { kind: 'asset'; id: string }
  | { kind: 'zernioAccount'; id: string }
  | { kind: 'zernioSync' }
  | { kind: 'unknown'; topic: string }

/** How the live connection to `/api/events` is currently doing. */
export type EventStreamStatus =
  /** Nothing mounted wants the stream (logged out, or before the app renders). */
  | 'idle'
  /** First attempt of this session — no data has been missed yet. */
  | 'connecting'
  /** Receiving. */
  | 'open'
  /** Dropped and retrying. Data is being missed for as long as this lasts. */
  | 'reconnecting'
