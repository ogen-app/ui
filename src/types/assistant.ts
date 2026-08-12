/** What an assistant thread is attached to. One thread per subject. */
export type ThreadSubject =
  | { kind: 'post'; postId: string; campaignId: string }
  | { kind: 'campaign'; campaignId: string }

/**
 * What the post assistant did with the instruction (CON-42).
 *
 * `noted` means the turn wrote one or more notes and left the body alone
 * (CON-188). A turn that did both reports `edited` and carries the notes
 * alongside — so this value is "notes *only*", not "notes happened".
 */
export type PostAssistantAction = 'edited' | 'declined' | 'noted'

/**
 * What the campaign assistant did (CON-112 and its sub-issues). Every action
 * except `answered`/`declined` corresponds to a tool that already wrote to the
 * campaign — the payload describes what landed, it is never a proposal.
 */
export type CampaignAssistantAction =
  | 'answered'
  | 'declined'
  | 'content_plan_generated'
  | 'posts_generated'
  | 'brief_enriched'
  | 'dates_updated'
  | 'posts_redistributed'
  | 'brief_reviewed'
  | 'posts_reviewed'

export type AssistantAction = PostAssistantAction | CampaignAssistantAction

export type ReviewSeverity = 'high' | 'medium' | 'low'

/**
 * One item from a consistency review (CON-116). The backend names the subject
 * `aspect` for brief findings and `title` for post findings; both land here.
 */
export type ReviewFinding = {
  severity?: ReviewSeverity
  label?: string
  issue: string
  suggestion?: string
}

/**
 * The structured half of a campaign turn's `complete` payload. Exactly one key
 * is populated, matching the action — the findings and counts exist nowhere
 * else, so the reply has to render them.
 */
export type AssistantResultDetails = {
  contentPlan?: { postCount: number; warnings: string[] }
  generatedPosts?: { postCount: number; warnings: string[] }
  brief?: { applied: boolean }
  dates?: { startDate: string; endDate: string; postsOutsideRange: number }
  redistribute?: { postsUpdated: number; phaseCount: number }
  briefReview?: { consistent: boolean; findings: ReviewFinding[] }
  postsReview?: {
    checked: number
    total: number
    capped: boolean
    findings: ReviewFinding[]
  }
}

/**
 * A draft the content-plan / targeted-generation flows have *already
 * persisted*, seen mid-stream before the authoritative refetch. Shaped to
 * merge into the campaign's post list by id.
 */
export type StreamedPost = {
  id: string
  title: string
  content: string
  platform_id: string
  platform_post_type: string
  campaign_type_phase_id: string | null
  scheduled_at: string | null
}

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
  /** Campaign turns only — the structured result behind the action. */
  details?: AssistantResultDetails
  /** Post turns only. */
  saveVersion?: boolean
  versionNote?: string
  /**
   * Set when a post turn cloned the post (CON-59): the clone is a new,
   * already-persisted post in the same campaign, and the reply offers a jump to
   * it. `campaignId` is the subject's — resolved in the store, as the event
   * omits it — so the jump can target the clone's editor.
   */
  clone?: { postId: string; campaignId: string }
  steps?: AssistantStep[]
  /** Monotonic (`performance.now`) marks — timeline durations only. */
  startedAt?: number
  endedAt?: number | null
  streaming?: boolean
  /** The turn ended in an error; `content` holds the message. */
  failed?: boolean
  /**
   * The turn was stopped by the user. Campaign flows persist as they go, so a
   * stop is not a rollback — the reply says so.
   */
  cancelled?: boolean
}

export type AssistantThread = {
  /** Derived from the subject, so one subject always maps to one thread. */
  id: string
  subject: ThreadSubject
  /** Post/campaign title, for the thread selector. */
  title: string
  /**
   * The name of the campaign this thread belongs to — its own name for a
   * campaign thread, its parent's for a post thread. The thread list groups by
   * campaign, so every row needs it, including the post rows.
   */
  campaignTitle: string
  turns: AssistantTurn[]
  status: ThreadStatus
  /** Wall-clock ms at which the running turn started, for the elapsed label. */
  runStartedAt: number | null
  /** A turn finished while the user was looking somewhere else. */
  unread: boolean
  /** History has been loaded from the server at least once. */
  loaded: boolean
  /**
   * Posts streamed by the running turn, merged into the campaign's post list
   * until the refetch supersedes them. Campaign threads only.
   */
  streamedPosts: StreamedPost[]
}
