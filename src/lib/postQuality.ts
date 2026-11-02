import type { TFunction } from 'i18next'
import type {
  PostEvaluation,
  QualityDimension,
  QualityDimensionKey,
  QualitySeverity,
  QualityStaleReason,
  QualitySuggestion,
  QualityTrigger,
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

const SEVERITY_RANK: Record<QualitySeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

/**
 * The post's suggestions as the one list the panel shows (CON-438): every
 * dimension's, most severe first.
 *
 * One list rather than one per dimension because there are at most five of
 * them now, and two per card left most cards holding one line under a
 * heading. Ties keep rubric order — the sort is stable and the input is built
 * in `QUALITY_DIMENSIONS` order — so the list doesn't reshuffle between two
 * renders of the same result. Not capped here: the server caps at five, and a
 * client that dropped a sixth would hide the one the server thought mattered.
 */
export function postSuggestions(
  evaluation: PostEvaluation,
): QualitySuggestion[] {
  return QUALITY_DIMENSIONS.flatMap((meta) =>
    suggestionsOf(evaluation.result?.[meta.key]),
  ).sort(
    (a, b) =>
      (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3),
  )
}

/**
 * Why the stored score may no longer describe the post, or `null` when it
 * still does.
 *
 * The server decides it (CON-438) by rendering the prompt the next run would
 * use and comparing fingerprints, which is the only place that knows which
 * fields the model reads — the old client-side `updated_at` comparison
 * flagged a rescheduled post as edited. A `stale` without a reason — or with
 * one this build has no copy for — reads as `content`: that is the side a
 * re-assessment is least likely to surprise. The result names a catalogue
 * key, so it must never be a value off the wire unchecked.
 */
export function staleReason(
  evaluation: PostEvaluation,
): QualityStaleReason | null {
  if (!evaluation.stale) return null
  const reason = evaluation.stale_reason
  return reason && STALE_REASONS.includes(reason) ? reason : 'content'
}

const STALE_REASONS: readonly QualityStaleReason[] = [
  'content',
  'context',
  'both',
]

const AUTOMATIC_TRIGGERS: readonly Exclude<QualityTrigger, 'manual'>[] = [
  'ready',
  'version',
  'scheduled',
  'published',
]

/**
 * Runs left on this post's `quality_reviews_per_post` allowance, or `null`
 * when the plan sets none (or the server didn't say). Automatic and manual
 * runs draw on the same allowance; a reused, unchanged assessment draws on
 * neither.
 */
export function runsLeft(evaluation: PostEvaluation | null | undefined): {
  left: number
  limit: number
} | null {
  const limit = evaluation?.runs_limit
  if (limit === null || limit === undefined) return null
  return { left: Math.max(0, limit - (evaluation?.runs_used ?? 0)), limit }
}

/**
 * The lifecycle checkpoint that produced the stored score, when it was one.
 * A manual run, and a row written before triggers were recorded, say nothing:
 * "you asked for this" is not news to the person who asked. Neither does a
 * checkpoint the server added after this build: it names a catalogue key.
 */
export function automaticTrigger(
  evaluation: PostEvaluation,
): Exclude<QualityTrigger, 'manual'> | null {
  const trigger = evaluation.trigger
  if (!trigger || trigger === 'manual') return null
  return AUTOMATIC_TRIGGERS.includes(trigger) ? trigger : null
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
