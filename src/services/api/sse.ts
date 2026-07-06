import { errorMessage, fetchOrThrowUnavailable } from './errors'

/** A single decoded Server-Sent Events frame. */
export type SSEFrame = {
  /** The `event:` field; defaults to `'message'` when the frame omits it. */
  event: string
  /** The concatenated `data:` field(s) as a raw string (usually JSON). */
  data: string
}

type StreamSSEOptions = {
  method?: string
  /** Serialized as a JSON body; also sets the `Content-Type` header. */
  body?: unknown
  signal?: AbortSignal
}

/**
 * Opens a credentialed Server-Sent Events stream and invokes `onFrame` for each
 * complete frame as it arrives. Unlike the browser `EventSource`, this works
 * over `POST` with a JSON body, which the assistant endpoints require.
 *
 * Resolves once the server closes the stream. Throws the backend's error message
 * on a non-OK response (e.g. 503 when the assistant is unavailable), or a
 * `ServerUnavailableError` if the request never reached the server. Aborting via
 * `signal` rejects with the abort reason / `AbortError`.
 */
export async function streamSSE(
  path: string,
  fallbackError: string,
  options: StreamSSEOptions,
  onFrame: (frame: SSEFrame) => void
): Promise<void> {
  const init: RequestInit = {
    method: options.method ?? 'POST',
    credentials: 'include',
    signal: options.signal,
  }
  if (options.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(options.body)
  }

  const res = await fetchOrThrowUnavailable(path, init)
  if (!res.ok) throw new Error(await errorMessage(res, fallbackError))
  if (!res.body) throw new Error(fallbackError)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      // Normalize CRLF so frame/line splitting is uniform across servers.
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

      let sep: number
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        const frame = parseFrame(raw)
        if (frame) onFrame(frame)
      }
    }
    // Flush any trailing frame the server didn't terminate with a blank line.
    const tail = parseFrame(buffer)
    if (tail) onFrame(tail)
  } finally {
    reader.releaseLock()
  }
}

/** Parses one raw SSE frame block into `{ event, data }`, or null if empty. */
function parseFrame(raw: string): SSEFrame | null {
  let event = 'message'
  const data: string[] = []

  for (const line of raw.split('\n')) {
    if (line === '' || line.startsWith(':')) continue // blank or comment
    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    // A single leading space after the colon is part of the SSE format, not data.
    let value = colon === -1 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)

    if (field === 'event') event = value
    else if (field === 'data') data.push(value)
  }

  if (data.length === 0 && event === 'message') return null
  return { event, data: data.join('\n') }
}
