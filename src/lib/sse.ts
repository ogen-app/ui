/**
 * The app's only Server-Sent Events reader.
 *
 * `EventSource` can't be used here: it is GET-only and can't carry a JSON body,
 * which three of the four AI flows need. So the same wire format is parsed off
 * a streamed `fetch` body — frames separated by a blank line, each a set of
 * `field: value` lines.
 *
 * This replaced two parsers that had drifted apart (CON-134): one trimmed
 * `data:` values and one didn't, one dropped frames with no `event:` line and
 * one dropped frames with no `data:` line. Both bugs were invisible against
 * today's backend and would not have stayed that way. Keep this the only
 * implementation.
 *
 * Deviations from the spec are deliberate and listed here:
 * - Only `\n` and `\r\n` line endings are handled. A lone `\r` is a classic-Mac
 *   ending no server emits.
 * - `retry:` is parsed but not acted on; reconnection backoff is the caller's
 *   (see `eventStreamStore`), because the hub has no replay to resume into.
 */

export type SSEFrame = {
  /** The `event:` field, or `message` when the frame omitted one, per spec. */
  event: string
  /** All `data:` lines joined with newlines. Empty string when there were none. */
  data: string
  /** The `id:` field. Present in the wire format, unused until replay exists. */
  id: string | null
  /** The `retry:` field in ms, when the server sent a valid one. */
  retry: number | null
}

// `g` so `lastIndex` can resume the scan mid-buffer; it is set before every
// `exec`, so nothing leaks between calls or parser instances.
const FRAME_BOUNDARY = /\r?\n\r?\n/g

/**
 * Incremental parser. Feed it decoded chunks in order; it calls `onFrame` for
 * each frame as it closes. Comment lines (`: ping`) carry no fields, so a
 * heartbeat frame is consumed and produces nothing.
 */
export function createSSEParser(
  onFrame: (frame: SSEFrame) => void,
): (chunk: string) => void {
  let buffer = ''

  return (chunk: string) => {
    // Everything before the seam was already scanned boundary-free, so resume
    // there instead of rescanning the buffer per chunk — an unclosed frame
    // would otherwise cost O(frame × chunks). Backed up 3 chars because a
    // boundary can straddle the seam (`\r\n\r` buffered, `\n` arriving).
    let from = Math.max(0, buffer.length - 3)
    buffer += chunk
    for (;;) {
      FRAME_BOUNDARY.lastIndex = from
      const match = FRAME_BOUNDARY.exec(buffer)
      if (!match) return
      const raw = buffer.slice(0, match.index)
      buffer = buffer.slice(match.index + match[0].length)
      from = 0

      let event: string | null = null
      let id: string | null = null
      let retry: number | null = null
      // A frame may carry several `data:` lines; the spec joins them with \n.
      const data: string[] = []

      for (const line of raw.split(/\r?\n/)) {
        // A leading colon is a comment. Checked before the field split so a
        // heartbeat can't be read as a field with an empty name.
        if (line.startsWith(':')) continue
        const colon = line.indexOf(':')
        const field = colon === -1 ? line : line.slice(0, colon)
        // Exactly one leading space is stripped from the value, so `data:  x`
        // legitimately means " x". Never trim — a text delta's own whitespace
        // is content.
        let value = colon === -1 ? '' : line.slice(colon + 1)
        if (value.startsWith(' ')) value = value.slice(1)

        switch (field) {
          case 'event':
            event = value
            break
          case 'data':
            data.push(value)
            break
          case 'id':
            id = value
            break
          case 'retry': {
            const ms = Number(value)
            if (Number.isFinite(ms) && ms >= 0) retry = ms
            break
          }
        }
      }

      // Fields but no `event:` means `message`, per spec. A frame with no
      // fields at all was a comment — nothing to dispatch.
      if (event === null && data.length === 0 && id === null && retry === null)
        continue
      onFrame({ event: event ?? 'message', data: data.join('\n'), id, retry })
    }
  }
}

/**
 * Reads a `fetch` response body to completion, dispatching frames as they land.
 *
 * `onActivity` fires once per decoded chunk, heartbeats included. It exists for
 * the connection watchdog: a TCP connection that dies without a FIN leaves this
 * read pending forever, so something has to notice the silence.
 */
export async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  onFrame: (frame: SSEFrame) => void,
  onActivity?: () => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const parse = createSSEParser(onFrame)

  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      onActivity?.()
      parse(decoder.decode(value, { stream: true }))
    }
    parse(decoder.decode())
  } finally {
    reader.cancel().catch(() => {})
  }
}
