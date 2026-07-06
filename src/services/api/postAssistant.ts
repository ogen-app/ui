import type {
  AssistantModelContent,
  PostAssistantComplete,
  PostAssistantMessage,
} from '@/types/assistant'
import { apiJson } from './http'
import { streamSSE } from './sse'

const BASE = '/api/posts'

/**
 * A typed assistant streaming event, mapped from the raw SSE frames emitted by
 * `POST /api/posts/{id}/assistant`. `complete` is terminal and carries the
 * canonical result (already persisted server-side when `action` is `edited`).
 */
export type AssistantStreamEvent =
  | { type: 'explanation_delta'; delta: string }
  | { type: 'content_delta'; delta: string }
  | { type: 'tool_call'; name: string; input: unknown; ref: string }
  | { type: 'tool_result'; name: string; ref: string; ok: boolean }
  | { type: 'complete'; result: PostAssistantComplete }
  | { type: 'error'; message: string; code?: number }

/**
 * Runs one assistant turn for a post, invoking `onEvent` for each streamed
 * event. Resolves when the stream closes. Network/HTTP failures (incl. 503 when
 * the assistant is unavailable) reject; in-band failures arrive as an `error`
 * event. Pass `signal` to abort the turn.
 */
export function runPostAssistant(
  postId: string,
  instruction: string,
  onEvent: (event: AssistantStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  return streamSSE(
    `${BASE}/${postId}/assistant`,
    'Unable to reach the post assistant',
    { method: 'POST', body: { instruction }, signal },
    (frame) => {
      const event = mapFrame(frame.event, frame.data)
      if (event) onEvent(event)
    }
  )
}

/** Fetches the persisted conversation history for a post (most recent first 50). */
export function getPostMessages(postId: string): Promise<PostAssistantMessage[]> {
  return apiJson<PostAssistantMessage[]>(
    `${BASE}/${postId}/messages`,
    'Unable to fetch assistant history'
  )
}

/**
 * Parses a `model` message's `content` JSON into its structured shape. Returns
 * null if the stored content is not valid JSON (it should always be, but history
 * is treated defensively).
 */
export function parseAssistantModelContent(
  content: string
): AssistantModelContent | null {
  try {
    const parsed = JSON.parse(content) as Partial<AssistantModelContent>
    if (parsed.action !== 'edited' && parsed.action !== 'declined') return null
    return {
      action: parsed.action,
      explanation: parsed.explanation ?? '',
      saveVersion: parsed.saveVersion ?? false,
      versionNote: parsed.versionNote,
    }
  } catch {
    return null
  }
}

/** Maps a raw SSE frame to a typed event, or null for unknown/malformed frames. */
function mapFrame(event: string, data: string): AssistantStreamEvent | null {
  const json = safeParse(data)

  switch (event) {
    case 'explanation_delta':
      return { type: 'explanation_delta', delta: str(json, 'delta') }
    case 'content_delta':
      return { type: 'content_delta', delta: str(json, 'delta') }
    case 'tool_call':
      return {
        type: 'tool_call',
        name: str(json, 'name'),
        input: (json as Record<string, unknown> | null)?.input,
        ref: str(json, 'ref'),
      }
    case 'tool_result':
      return {
        type: 'tool_result',
        name: str(json, 'name'),
        ref: str(json, 'ref'),
        ok: Boolean((json as Record<string, unknown> | null)?.ok),
      }
    case 'complete':
      return { type: 'complete', result: toComplete(json) }
    case 'error':
      return {
        type: 'error',
        message: str(json, 'message') || 'The assistant failed to respond',
        code: num(json, 'code'),
      }
    default:
      return null
  }
}

function safeParse(data: string): unknown {
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

function str(json: unknown, key: string): string {
  const v = (json as Record<string, unknown> | null)?.[key]
  return typeof v === 'string' ? v : ''
}

function num(json: unknown, key: string): number | undefined {
  const v = (json as Record<string, unknown> | null)?.[key]
  return typeof v === 'number' ? v : undefined
}

function toComplete(json: unknown): PostAssistantComplete {
  const o = (json as Record<string, unknown> | null) ?? {}
  const action = o.action === 'edited' ? 'edited' : 'declined'
  return {
    action,
    explanation: typeof o.explanation === 'string' ? o.explanation : '',
    updatedContent: typeof o.updatedContent === 'string' ? o.updatedContent : '',
    saveVersion: Boolean(o.saveVersion),
    versionNote: typeof o.versionNote === 'string' ? o.versionNote : undefined,
  }
}
