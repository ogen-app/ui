import { readSSEStream } from '@/lib/sse'
import { scopedFetch } from './base'
import { errorMessage } from './errors'
import { isRecord } from './json'
import type { AppEvent } from '@/types/events'

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
  handlers: AppEventHandlers,
  signal: AbortSignal,
): Promise<void> {
  // `topics=all` is everything the session is allowed to hear. The endpoint
  // requires the parameter and answers 400 without it; the server already
  // scopes what it sends to the caller's tenant, so narrowing here would only
  // mean re-subscribing on every navigation for no privacy gain.
  const res = await scopedFetch('/api/events?topics=all', {
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
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    return null
  const record = parsed as Record<string, unknown>
  return {
    id: typeof record.id === 'string' ? record.id : '',
    topic: typeof record.topic === 'string' ? record.topic : '',
    type: typeof record.type === 'string' ? record.type : '',
    payload: isRecord(record.payload) ? record.payload : null,
    created_at: typeof record.created_at === 'string' ? record.created_at : '',
  }
}
