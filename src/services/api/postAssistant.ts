import type {
  AssistantCloneResult,
  AssistantModelContent,
  AssistantRestoreResult,
  AssistantScheduleResult,
  PostAssistantComplete,
  PostAssistantMessage,
} from '@/types/assistant'
import { isAssistantAction } from '@/types/assistant'
import { apiJson } from './http'
import { streamSSE } from './sse'

const BASE = '/api/posts'

/**
 * A typed assistant streaming event, mapped from the raw SSE frames emitted by
 * `POST /api/posts/{id}/assistant`. `complete` is terminal and carries the
 * canonical result (already persisted server-side for `edited` / `cloned` /
 * `restored` / `scheduled`). The `*_started` / `*_complete` pairs stream
 * operation progress while the matching tool runs.
 */
export type AssistantStreamEvent =
  | { type: 'explanation_delta'; delta: string }
  | { type: 'content_delta'; delta: string }
  | { type: 'tool_call'; name: string; input: unknown; ref: string }
  | { type: 'tool_result'; name: string; ref: string; ok: boolean }
  | { type: 'clone_started'; targetPlatform?: string }
  | { type: 'clone_complete'; result: AssistantCloneResult }
  | { type: 'restore_started'; targetVersion: number }
  | { type: 'restore_complete'; result: AssistantRestoreResult }
  | { type: 'schedule_started'; scheduledAt: string; autoPublish: boolean }
  | { type: 'schedule_complete'; result: AssistantScheduleResult }
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
  // The backend serializes an empty history as null (Go nil slice).
  return apiJson<PostAssistantMessage[] | null>(
    `${BASE}/${postId}/messages`,
    'Unable to fetch assistant history'
  ).then((messages) => messages ?? [])
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
    if (!isAssistantAction(parsed.action)) return null
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
    case 'clone_started':
      return { type: 'clone_started', targetPlatform: str(json, 'targetPlatform') || undefined }
    case 'clone_complete':
      return { type: 'clone_complete', result: toCloneResult(json) }
    case 'restore_started':
      return { type: 'restore_started', targetVersion: num(json, 'targetVersion') ?? 0 }
    case 'restore_complete':
      return { type: 'restore_complete', result: toRestoreResult(json) }
    case 'schedule_started':
      return {
        type: 'schedule_started',
        scheduledAt: str(json, 'scheduledAt'),
        autoPublish: bool(json, 'autoPublish'),
      }
    case 'schedule_complete':
      return { type: 'schedule_complete', result: toScheduleResult(json) }
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

function bool(json: unknown, key: string): boolean {
  return Boolean((json as Record<string, unknown> | null)?.[key])
}

function toCloneResult(json: unknown): AssistantCloneResult {
  return {
    newPostId: str(json, 'newPostId'),
    platformId: str(json, 'platformId') || undefined,
    postType: str(json, 'postType') || undefined,
    adapted: bool(json, 'adapted'),
  }
}

function toRestoreResult(json: unknown): AssistantRestoreResult {
  return {
    restoredFromVersion: num(json, 'restoredFromVersion') ?? 0,
    newVersionNumber: num(json, 'newVersionNumber') ?? 0,
    noOp: bool(json, 'noOp'),
  }
}

function toScheduleResult(json: unknown): AssistantScheduleResult {
  return {
    scheduledAt: str(json, 'scheduledAt'),
    status: str(json, 'status'),
    autoPublish: bool(json, 'autoPublish'),
    promoted: bool(json, 'promoted'),
  }
}

function toComplete(json: unknown): PostAssistantComplete {
  const o = (json as Record<string, unknown> | null) ?? {}
  return {
    action: isAssistantAction(o.action) ? o.action : 'declined',
    explanation: typeof o.explanation === 'string' ? o.explanation : '',
    updatedContent: typeof o.updatedContent === 'string' ? o.updatedContent : '',
    saveVersion: Boolean(o.saveVersion),
    versionNote: typeof o.versionNote === 'string' ? o.versionNote : undefined,
    cloneResult: o.cloneResult ? toCloneResult(o.cloneResult) : undefined,
    restoreResult: o.restoreResult ? toRestoreResult(o.restoreResult) : undefined,
    scheduleResult: o.scheduleResult ? toScheduleResult(o.scheduleResult) : undefined,
  }
}
