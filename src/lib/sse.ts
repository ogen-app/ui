/**
 * Minimal Server-Sent Events reader for `fetch` response bodies.
 *
 * `EventSource` can't be used for the assistant: it is GET-only and can't send
 * a JSON body. This parses the same wire format off a streamed body — frames
 * separated by a blank line, each carrying `event:` and `data:` lines.
 *
 * Note the backend currently delivers every frame in one flush at the end of a
 * turn rather than progressively (measured: first byte at ~58s, whole stream
 * 1ms later). This reader handles both — callers see the same event sequence
 * either way, so the UI lights up incrementally the day the API flushes.
 */
export type SSEEvent = {
  event: string
  data: string
}

export async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const drain = () => {
    let split: number
    while ((split = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, split)
      buffer = buffer.slice(split + 2)
      let event = ''
      // A frame may carry several `data:` lines; the spec joins them with \n.
      const data: string[] = []
      for (const line of frame.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7)
        else if (line.startsWith('data: ')) data.push(line.slice(6))
        else if (line.startsWith(':')) continue // comment / keep-alive
      }
      if (event) onEvent({ event, data: data.join('\n') })
    }
  }

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    drain()
  }
  buffer += decoder.decode()
  drain()
}
