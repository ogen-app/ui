import { readSSEStream } from '@/lib/sse'
import { apiUrl } from './base'
import { errorMessage } from './errors'
import type { AppEvent } from '@/types/events'

/**
 * Everything the session is allowed to hear. The endpoint requires `topics`
 * and answers 400 without it; the server already scopes what it sends to the
 * caller's tenant, so narrowing further here would only mean re-subscribing on
 * every navigation for no privacy gain.
 */
export const ALL_TOPICS = 'all'

export type AppEventHandlers = {
  /** Fires once the response headers land — the stream is live from here. */
  onOpen?: () => void
  onEvent: (event: AppEvent) => void
  /** Fires on any traffic, heartbeats included. Feeds the silence watchdog. */
  onActivity?: () => void
}

/**
 * Opens the broadcast stream and dispatches events until it ends or `signal`
 * aborts.
 *
 * Resolving is not success: the server closing the connection is a normal drop
 * and the caller must reconnect. It throws only when the stream could not be
 * opened at all.
 */
export async function streamAppEvents(
  topics: string,
  handlers: AppEventHandlers,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/events?topics=${encodeURIComponent(topics)}`), {
    credentials: 'include',
    headers: { Accept: 'text/event-stream' },
    signal,
  })

  if (!res.ok || !res.body) {
    throw new Error(await errorMessage(res, 'Unable to open the event stream'))
  }
  handlers.onOpen?.()

  await readSSEStream(
    res.body,
    (frame) => {
      const event = parseEnvelope(frame.data)
      // The envelope repeats the name in `type`, but the frame's `event:` is
      // the field the protocol guarantees, so it wins on disagreement.
      if (event) handlers.onEvent({ ...event, type: frame.event })
    },
    handlers.onActivity,
  )
}

/**
 * A malformed envelope is dropped rather than thrown: one bad frame must not
 * take down a connection that is otherwise delivering fine.
 */
function parseEnvelope(data: string): AppEvent | null {
  if (!data) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
  const record = parsed as Record<string, unknown>
  return {
    id: typeof record.id === 'string' ? record.id : '',
    topic: typeof record.topic === 'string' ? record.topic : '',
    type: typeof record.type === 'string' ? record.type : '',
    payload: isRecord(record.payload) ? record.payload : null,
    created_at: typeof record.created_at === 'string' ? record.created_at : '',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
