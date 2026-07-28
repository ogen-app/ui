/**
 * The Post quality assessment (CON-85, cached per CON-92).
 *
 * Mirrors `models.PostEvaluation` in the Go backend. Note the split of
 * authorship inside `QualityDimension`: `score`, `rationale`, `weakness` and
 * `suggestions` come from the model; `weight`, `contribution` and the
 * top-level `overall_pct` are computed by the backend from a weight profile
 * keyed by the post's type. The model never returns a percentage — treat
 * `overall_pct` as the only overall there is, and never recompute it here.
 */

/** The closed set of dimensions a post is scored on. */
export type QualityDimensionKey =
  | 'correctness'
  | 'clarity'
  | 'engagement'
  | 'delivery'

export type QualitySeverity = 'high' | 'medium' | 'low'

/**
 * One guidance-only improvement note. `span` quotes the post text the note
 * reacts to — the backend requires it, as the guard against generic advice.
 */
export type QualitySuggestion = {
  dimension: QualityDimensionKey
  severity: QualitySeverity
  issue: string
  fix: string
  span: string
}

export type QualityDimension = {
  /** 0–10, scored against anchored bands. */
  score: number
  rationale: string
  weakness: string
  /** Capped top-3 by severity. `null` when Go marshalled an empty slice. */
  suggestions: QualitySuggestion[] | null
  /** Fraction of the overall this dimension carries, 0–1. Backend-set. */
  weight: number
  /** Percentage points it added to `overall_pct`. Backend-set. */
  contribution: number
}

export type QualityResult = Record<QualityDimensionKey, QualityDimension>

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
  created_at: string
  updated_at: string
}
