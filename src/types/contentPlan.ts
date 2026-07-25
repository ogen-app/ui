// Mirrors the SSE payloads of POST /api/campaigns/:id/generate-draft
// (Go: src/genkit/flows/content_plan/types.go). The server is the source of
// truth — keep in sync when the flow changes.

export type DraftPost = {
  title: string
  body: string
  contentType: string
  platformId: string
  /** ISO YYYY-MM-DD, always within the campaign date range. */
  publishDate: string
  toneNotes: string
  phaseId: string
  assetRefs?: string[]
}

export type StepEvent = {
  step: string
  status: string
}

export type PostEvent = {
  post: DraftPost
  /**
   * Deterministic global slot of the post in the plan. Posts arrive
   * interleaved under parallel batching — order by this, not wire order.
   */
  index: number
  /** Real persisted Post id — the row exists before this event fires. */
  id: string
}

export type WarningEvent = {
  message: string
  /** When set, the post previously streamed at this index was dropped. */
  index?: number
}

export type CompleteEvent = {
  campaignId: string
  generatedAt: string
  posts: DraftPost[]
  warnings?: string[]
}

export type DraftPlanStreamHandlers = {
  onStep?: (event: StepEvent) => void
  onPost?: (event: PostEvent) => void
  onWarning?: (event: WarningEvent) => void
  onComplete?: (event: CompleteEvent) => void
}
