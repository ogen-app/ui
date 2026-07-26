import { apiUrl } from './base'
import { apiJson } from './http'
import { errorMessage } from './errors'
import { readSSEStream } from '@/lib/sse'
import type { AssistantAction } from '@/types/assistant'

/**
 * A persisted conversation row. The assistant's own turns store the flow's
 * structured result as a JSON *string* in `content` — see `parseModelContent`.
 */
export type AssistantHistoryMessage = {
  id: string
  post_id: string
  role: 'user' | 'model'
  content: string
  created_at: string
}

export type PostVersion = {
  id: string
  post_id: string
  version_number: number
  content: string
  note: string
  creator: 'user' | 'assistant'
  created_at: string
}

/** The structured result the flow returns, both at `complete` and in history. */
export type AssistantResult = {
  explanation: string
  updatedContent?: string
  action: AssistantAction
  saveVersion: boolean
  versionNote?: string
}

export type AssistantStreamEvent =
  | { type: 'explanation_delta'; delta: string }
  // Each delta is the whole document so far, not a patch — concatenating the
  // deltas reproduces the full updated content (verified against the API).
  | { type: 'content_delta'; delta: string }
  | { type: 'tool_call'; name: string; ref?: string; input?: Record<string, unknown> }
  | { type: 'tool_result'; ref?: string }
  | { type: 'complete'; result: AssistantResult }
  | { type: 'error'; message: string }
  /** Namespaced sub-flow progress, annotating the running tool step. */
  | { type: 'progress'; step: string }

export function listPostMessages(postId: string): Promise<AssistantHistoryMessage[]> {
  return apiJson<AssistantHistoryMessage[] | null>(
    `/api/posts/${postId}/messages`,
    'Unable to load the conversation',
    // A post with no history answers `null`, not `[]`.
  ).then((rows) => rows ?? [])
}

export function listPostVersions(postId: string): Promise<PostVersion[]> {
  return apiJson<PostVersion[] | null>(
    `/api/posts/${postId}/versions`,
    'Unable to load versions',
  ).then((rows) => rows ?? [])
}

export function createPostVersion(postId: string, note: string): Promise<PostVersion> {
  return apiJson<PostVersion>(`/api/posts/${postId}/versions`, 'Unable to save a version', {
    method: 'POST',
    body: { note },
  })
}

/**
 * Parses an assistant history row's `content`. Older or malformed rows fall
 * back to being shown as plain explanation text rather than failing the load.
 */
export function parseModelContent(content: string): AssistantResult {
  try {
    const parsed = JSON.parse(content) as Partial<AssistantResult>
    if (parsed && typeof parsed.explanation === 'string') {
      return {
        explanation: parsed.explanation,
        action: parsed.action === 'edited' ? 'edited' : 'declined',
        saveVersion: parsed.saveVersion === true,
        versionNote: parsed.versionNote,
      }
    }
  } catch {
    // not JSON — treat the row as prose
  }
  return { explanation: content, action: 'declined', saveVersion: false }
}

/**
 * Runs one assistant turn and dispatches its SSE events.
 *
 * The server applies the edit to the post itself — `updatedContent` is what it
 * *saved*, not a patch for the client to persist. Never write it back; refetch
 * the post instead.
 *
 * Resolves when the stream ends. Aborting via `signal` rejects with the
 * standard `AbortError`.
 */
export async function streamPostAssistant(
  postId: string,
  instruction: string,
  onEvent: (event: AssistantStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/posts/${postId}/assistant`), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ instruction }),
    signal,
  })

  if (!res.ok || !res.body) {
    throw new Error(await errorMessage(res, 'The assistant could not be reached'))
  }

  await readSSEStream(res.body, ({ event, data }) => {
    const parsed = safeParse(data)
    switch (event) {
      case 'explanation_delta':
        if (typeof parsed.delta === 'string') {
          onEvent({ type: 'explanation_delta', delta: parsed.delta })
        }
        break
      case 'content_delta':
        if (typeof parsed.delta === 'string') {
          onEvent({ type: 'content_delta', delta: parsed.delta })
        }
        break
      case 'tool_call':
        onEvent({
          type: 'tool_call',
          name: typeof parsed.name === 'string' ? parsed.name : 'tool',
          ref: typeof parsed.ref === 'string' ? parsed.ref : undefined,
          input: isRecord(parsed.input) ? parsed.input : undefined,
        })
        break
      case 'tool_result':
        onEvent({
          type: 'tool_result',
          ref: typeof parsed.ref === 'string' ? parsed.ref : undefined,
        })
        break
      case 'complete':
        onEvent({
          type: 'complete',
          result: {
            explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '',
            updatedContent:
              typeof parsed.updatedContent === 'string' ? parsed.updatedContent : undefined,
            action: parsed.action === 'edited' ? 'edited' : 'declined',
            saveVersion: parsed.saveVersion === true,
            versionNote: typeof parsed.versionNote === 'string' ? parsed.versionNote : undefined,
          },
        })
        break
      case 'error':
        onEvent({
          type: 'error',
          message: typeof parsed.message === 'string' ? parsed.message : 'The assistant failed',
        })
        break
      default:
        // Sub-flow events are namespaced per flow and carry a `step` key.
        if (typeof parsed.step === 'string') {
          onEvent({ type: 'progress', step: parsed.step })
        }
        break
    }
  })
}

function safeParse(data: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(data)
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
