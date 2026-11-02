/**
 * The Post quality assessment (CON-85, cached per CON-92, compact and
 * automatic since CON-438).
 *
 * Mirrors `post_quality.Status` in the Go backend — `models.PostEvaluation`
 * plus what the read endpoint knows about it now. Note the split of authorship
 * inside `QualityDimension`: `score`, `verdict` and `suggestions` come from the
 * model; `weight`, `contribution` and the top-level `overall_pct` are computed
 * by the backend from a weight profile keyed by the post's type. The model
 * never returns a percentage — treat `overall_pct` as the only overall there
 * is, and never recompute it here.
 */

/** The closed set of dimensions a post is scored on. */
export type QualityDimensionKey =
  'correctness' | 'clarity' | 'engagement' | 'delivery'

export type QualitySeverity = 'high' | 'medium' | 'low'

/**
 * One guidance-only improvement note. `span` quotes the post text the note
 * reacts to — the backend requires it, as the guard against generic advice.
 * `advice` is one sentence naming what is wrong and what to do about it.
 */
export type QualitySuggestion = {
  dimension: QualityDimensionKey
  severity: QualitySeverity
  span: string
  advice: string
}

export type QualityDimension = {
  /** 0–10, scored against anchored bands. */
  score: number
  /** One or two sentences, at most 240 characters. */
  verdict: string
  /**
   * Zero to two per dimension, at most five across the post. `null` when Go
   * marshalled an empty slice.
   */
  suggestions: QualitySuggestion[] | null
  /** Fraction of the overall this dimension carries, 0–1. Backend-set. */
  weight: number
  /** Percentage points it added to `overall_pct`. Backend-set. */
  contribution: number
}

export type QualityResult = Record<QualityDimensionKey, QualityDimension>

/**
 * What started the run that produced the stored score: the author asking, or
 * one of the lifecycle checkpoints that assess on their own.
 */
export type QualityTrigger =
  'manual' | 'ready' | 'version' | 'scheduled' | 'published'

/**
 * Which side of the assessment's inputs moved since it ran. `content` is the
 * post itself, and is usually re-scored at the next checkpoint; `context` is
 * the brief, the assets, the model or the rubric, and never is.
 */
export type QualityStaleReason = 'content' | 'context' | 'both'

export type PostEvaluation = {
  id: string
  post_id: string
  platform_id: string
  platform_post_type: string
  /**
   * True when the post carried media the model could not see, so the score
   * covers the caption only. Worth surfacing: the image weight profile leans
   * hardest on Engagement, and that is exactly where the unseen visual lives.
   */
  caption_scoped: boolean
  overall_pct: number
  result: QualityResult
  model_id: string
  input_hash: string
  /** Empty on rows written before CON-438. */
  trigger?: QualityTrigger | ''
  created_at: string
  updated_at: string

  /**
   * Whether the score no longer describes the post, as the server decides it
   * by re-rendering the prompt and comparing fingerprints. `false` when the
   * server could only serve the stored row. Not on the evaluation a run's
   * `complete` event carries — a score that has just been taken is current.
   */
  stale?: boolean
  stale_reason?: QualityStaleReason
  /** Model runs behind this score — cached reuses don't count. */
  runs_used?: number
  /**
   * The plan's `quality_reviews_per_post` cap, shared by automatic and manual
   * runs. `null` is unlimited. Only the read endpoint reports it.
   */
  runs_limit?: number | null
}
