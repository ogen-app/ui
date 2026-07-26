/** What an assistant thread is attached to. One thread per subject. */
export type ThreadSubject =
  | { kind: 'post'; postId: string; campaignId: string }
  // Campaign threads (CON-112) aren't wired yet — the panel is already
  // generic over the subject so they slot in without reshaping the store.
  | { kind: 'campaign'; campaignId: string }

/** What the assistant did with the instruction. */
export type AssistantAction = 'edited' | 'declined'

export type ThreadStatus = 'idle' | 'running' | 'error'

/**
 * One entry in the thinking timeline. `plan` opens the turn, `tool` spans a
 * `tool_call` → `tool_result` pair, `compose` is the tail between the last
 * tool finishing and the turn completing.
 */
export type AssistantStep = {
  id: string
  kind: 'plan' | 'tool' | 'compose'
  /** Tool name as reported by the backend, e.g. `searchAssetChunks`. */
  tool?: string
  input?: Record<string, unknown>
  ref?: string
  label: string
  /** Live sub-flow progress, from namespaced `{ step }` events. */
  detail?: string
  startedAt: number
  endedAt: number | null
}

export type AssistantTurn = {
  id: string
  role: 'user' | 'assistant'
  /** The user's instruction, or the assistant's explanation. */
  content: string
  action?: AssistantAction
  saveVersion?: boolean
  versionNote?: string
  steps?: AssistantStep[]
  /** Monotonic (`performance.now`) marks — timeline durations only. */
  startedAt?: number
  endedAt?: number | null
  streaming?: boolean
  /** The turn ended in an error; `content` holds the message. */
  failed?: boolean
}

export type AssistantThread = {
  /** Derived from the subject, so one subject always maps to one thread. */
  id: string
  subject: ThreadSubject
  /** Post/campaign title, for the thread selector. */
  title: string
  turns: AssistantTurn[]
  status: ThreadStatus
  /** Wall-clock ms at which the running turn started, for the elapsed label. */
  runStartedAt: number | null
  /** A turn finished while the user was looking somewhere else. */
  unread: boolean
  /** History has been loaded from the server at least once. */
  loaded: boolean
}
