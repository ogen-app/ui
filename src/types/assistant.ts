// Domain types for the AI assistant. The transport-level SSE event union lives
// in `services/api/postAssistant.ts`; these are the persisted/contractual shapes
// shared across the assistant store, hooks, and UI.

export type AssistantAction = 'edited' | 'declined'

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
  /** Full updated post content as Markdown; empty when `action` is `declined`. */
  updatedContent: string
  saveVersion: boolean
  versionNote?: string
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
    }
