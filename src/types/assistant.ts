// Domain types for the AI assistant. The transport-level SSE event union lives
// in `services/api/postAssistant.ts`; these are the persisted/contractual shapes
// shared across the assistant store, hooks, and UI.

export type AssistantAction =
  | 'edited'
  | 'declined'
  | 'cloned'
  | 'restored'
  | 'scheduled'

export const ASSISTANT_ACTIONS: readonly AssistantAction[] = [
  'edited',
  'declined',
  'cloned',
  'restored',
  'scheduled',
]

export function isAssistantAction(v: unknown): v is AssistantAction {
  return (ASSISTANT_ACTIONS as readonly unknown[]).includes(v)
}

/** Post created by the `clonePost` tool; populated server-side, not by the model. */
export type AssistantCloneResult = {
  newPostId: string
  platformId?: string
  postType?: string
  adapted: boolean
}

/** Outcome of the `restoreVersion` tool. */
export type AssistantRestoreResult = {
  restoredFromVersion: number
  newVersionNumber: number
  noOp: boolean
}

/** Outcome of the `schedulePost` tool. */
export type AssistantScheduleResult = {
  scheduledAt: string
  status: string
  autoPublish: boolean
  promoted: boolean
}

export type AssistantMessageRole = 'user' | 'model'

/**
 * A persisted conversation turn as returned by `GET /api/posts/{id}/messages`.
 * `content` is a raw string: for `user` messages it is the instruction text; for
 * `model` messages it is JSON-encoded `AssistantModelContent` (the content
 * snapshot is intentionally excluded by the backend to keep history small).
 */
export type PostAssistantMessage = {
  id: string
  post_id: string
  role: AssistantMessageRole
  content: string
  created_at: string
}

/** Parsed shape of a `model` message's `content` JSON. */
export type AssistantModelContent = {
  action: AssistantAction
  explanation: string
  saveVersion: boolean
  versionNote?: string
}

/** Payload of the terminal `complete` SSE event from the assistant flow. */
export type PostAssistantComplete = {
  action: AssistantAction
  explanation: string
  /** Full updated post content as Markdown; empty unless `action` is `edited` or `restored`. */
  updatedContent: string
  saveVersion: boolean
  versionNote?: string
  /** Populated server-side when the matching tool ran during this turn. */
  cloneResult?: AssistantCloneResult
  restoreResult?: AssistantRestoreResult
  scheduleResult?: AssistantScheduleResult
}

/**
 * A tool the model invoked during a turn, surfaced as activity in the chat. `ref`
 * correlates the `tool_call` with its later `tool_result`. `done`/`ok` are filled
 * in when the result arrives.
 */
export type AssistantToolActivity = {
  ref: string
  name: string
  done: boolean
  ok?: boolean
}

/**
 * A rendered chat turn owned by the assistant store. The store seeds these from
 * persisted history on first open and appends live turns as they stream; it is
 * the source of truth for the transcript (history is loaded once, not re-merged).
 */
export type ChatMessage =
  | { id: string; role: 'user'; text: string; createdAt: string }
  | {
      id: string
      role: 'model'
      /** Null while the turn is still streaming. */
      action: AssistantAction | null
      explanation: string
      tools: AssistantToolActivity[]
      /** True while the response is streaming. */
      pending: boolean
      /** Set when the turn failed (transport error or in-band `error` event). */
      error?: string
      /**
       * Operation outcomes, set from the mid-stream `*_complete` events and
       * confirmed by the terminal `complete`. Capturing them mid-stream keeps
       * the outcome visible even if the turn errors after the operation ran.
       */
      cloneResult?: AssistantCloneResult
      restoreResult?: AssistantRestoreResult
      scheduleResult?: AssistantScheduleResult
    }
