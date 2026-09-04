import type { TFunction } from 'i18next'
import type {
  PostEvaluation,
  QualityDimension,
  QualityDimensionKey,
  QualitySuggestion,
} from '@/types/quality'

/**
 * Presentation rules for the quality assessment (CON-85). Pure and tested —
 * the panel does the drawing, this decides what the numbers mean.
 */

export type QualityDimensionMeta = {
  key: QualityDimensionKey
  label: string
  /** The one-line question the dimension answers. */
  blurb: string
  /**
   * Whether the score depends on which channel the post targets. Correctness
   * and Clarity read the same everywhere; Engagement and Delivery are judged
   * against the platform's own conventions, which is worth saying on the card
   * — it explains why the same copy scores differently on two channels.
   */
  platformAware: boolean
}

/** In the order CON-85 defines them; the panel renders them in this order. */
export const QUALITY_DIMENSIONS: QualityDimensionMeta[] = [
  {
    key: 'correctness',
    label: 'Correctness',
    blurb: 'True and well-formed',
    platformAware: false,
  },
  {
    key: 'clarity',
    label: 'Clarity',
    blurb: 'Understood on one pass',
    platformAware: false,
  },
  {
    key: 'engagement',
    label: 'Engagement',
    blurb: 'Makes people care and act',
    platformAware: true,
  },
  {
    key: 'delivery',
    label: 'Delivery',
    blurb: 'Fits the channel',
    platformAware: true,
  },
]

/**
 * How a score reads. Named for the rubric's bands rather than for a colour,
 * so the panel can restyle without this file having an opinion about hue.
 */
export type QualityBand = 'strong' | 'workable' | 'weak'

/** Bands the 0–10 dimension score: 8+ strong, 5–7 workable, below that weak. */
export function scoreBand(score: number): QualityBand {
  if (score >= 8) return 'strong'
  if (score >= 5) return 'workable'
  return 'weak'
}

/**
 * Bands the overall percentage on the same thresholds, scaled. Kept separate
 * from `scoreBand` because the inputs are different scales and conflating
 * them is the kind of bug that only shows up as a wrong colour.
 */
export function overallBand(pct: number): QualityBand {
  if (pct >= 80) return 'strong'
  if (pct >= 50) return 'workable'
  return 'weak'
}

/**
 * The band as a word, for places that state the verdict rather than draw it.
 *
 * A number needs a rubric to read; "Good" needs nothing. The words are in the
 * catalogue (`posts.quality.bands`) and read through `t` rather than held in a
 * map here: this module is imported by plain functions as well as components,
 * so a `const` of labels would freeze whichever language loaded first.
 */
export function bandLabel(t: TFunction, band: QualityBand): string {
  return t(`posts.quality.bands.${band}` as const)
}

/** Clamps the stored percentage into the range a progress ring can draw. */
export function overallPct(evaluation: PostEvaluation): number {
  const pct = evaluation.overall_pct
  if (!Number.isFinite(pct)) return 0
  return Math.min(100, Math.max(0, pct))
}

/** Go marshals an empty slice as `null`, so every read goes through here. */
export function suggestionsOf(
  dimension: QualityDimension | undefined,
): QualitySuggestion[] {
  return dimension?.suggestions ?? []
}

/** Across all four dimensions — the count the panel's title carries. */
export function totalSuggestions(evaluation: PostEvaluation): number {
  return QUALITY_DIMENSIONS.reduce(
    (sum, meta) => sum + suggestionsOf(evaluation.result?.[meta.key]).length,
    0,
  )
}

/**
 * Whether the post has been edited since it was scored.
 *
 * Deliberately a coarse timestamp comparison, not an inputs comparison: only
 * the backend knows which fields the model actually read (it hashes the
 * rendered prompt — CON-92). So this over-reports — rescheduling a post bumps
 * `updated_at` without changing a word the model sees — and that is the safe
 * direction to be wrong in. Re-assessing an over-reported post costs nothing:
 * the input hash still matches and the server returns the stored result
 * without calling the model.
 */
export function isAssessmentStale(
  evaluation: PostEvaluation,
  postUpdatedAt: string,
): boolean {
  const scored = Date.parse(evaluation.updated_at)
  const edited = Date.parse(postUpdatedAt)
  if (Number.isNaN(scored) || Number.isNaN(edited)) return false
  return edited > scored
}

/**
 * The flow's stages, in the order they complete. Listing them up front lets
 * the progress view show what is still to come — an assessment takes long
 * enough that "3 of 6" is worth more than a spinner.
 *
 * A cached run (CON-92) short-circuits after `buildContext`, so the last four
 * never arrive. That is not a stall: the run finishes with `complete`.
 */
export const ASSESS_STEPS = [
  { step: 'validateInput', label: 'Checking the post' },
  { step: 'buildContext', label: 'Gathering campaign context' },
  { step: 'evaluate', label: 'Scoring the four dimensions' },
  { step: 'validateOutput', label: 'Validating the result' },
  { step: 'composeScore', label: 'Composing the overall score' },
  { step: 'persist', label: 'Saving' },
] as const

/** Falls back to spacing out a camelCase stage name we don't have copy for. */
export function stepLabel(step: string): string {
  const known = ASSESS_STEPS.find((s) => s.step === step)
  if (known) return known.label
  const spaced = step.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
