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

/**
 * Where a dimension sits on the radar (CON-440). The web is a square turned on
 * its corner, so the four dimensions take the diagonals — which is what lets
 * the vertical centre line mean something: the writing on the left, the fit
 * for the channel on the right.
 */
export type RadarCorner = 'nw' | 'sw' | 'ne' | 'se'

export type QualityDimensionMeta = {
  key: QualityDimensionKey
  /**
   * Whether the score depends on which channel the post targets. Correctness
   * and Clarity read the same everywhere; Engagement and Delivery are judged
   * against the platform's own conventions — it explains why the same copy
   * scores differently on two channels, and it is why those two take the
   * radar's right-hand side.
   */
  platformAware: boolean
  corner: RadarCorner
}

/**
 * In the order CON-85 defines them; lists render them in this order. The
 * names live in the catalogue (`posts.quality.dimensions`) and are read
 * through `dimensionLabel`.
 */
export const QUALITY_DIMENSIONS: QualityDimensionMeta[] = [
  { key: 'correctness', platformAware: false, corner: 'nw' },
  { key: 'clarity', platformAware: false, corner: 'sw' },
  { key: 'engagement', platformAware: true, corner: 'ne' },
  { key: 'delivery', platformAware: true, corner: 'se' },
]

/**
 * The dimension's name as a user reads it. Not the API key: "Correctness" and
 * "Delivery" are the rubric's words, and the panel says Accuracy and Channel
 * fit (CON-440).
 */
export function dimensionLabel(t: TFunction, key: QualityDimensionKey): string {
  return t(`posts.quality.dimensions.${key}` as const)
}

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
 * The dimension this post type's weight profile leans on hardest — what the
 * summary names to explain why the overall isn't the plain average. `null`
 * when the weights are missing or all equal, where naming one would be a
 * claim the profile doesn't make.
 */
export function heaviestDimension(
  evaluation: PostEvaluation,
): QualityDimensionKey | null {
  const weighted = QUALITY_DIMENSIONS.flatMap((meta) => {
    const w = evaluation.result?.[meta.key]?.weight
    return typeof w === 'number' && Number.isFinite(w)
      ? [{ key: meta.key, w }]
      : []
  })
  if (weighted.length === 0) return null
  const top = Math.max(...weighted.map((d) => d.w))
  const leaders = weighted.filter((d) => d.w === top)
  return leaders.length === 1 ? leaders[0].key : null
}

/**
 * The lowest-scoring dimension, which the radar sets in bold and its label
 * names. `null` on a tie for last: picking one of two equal scores would
 * single out a dimension for no reason the user could see.
 */
export function lowestDimension(
  evaluation: PostEvaluation,
): QualityDimensionKey | null {
  const scored = QUALITY_DIMENSIONS.flatMap((meta) => {
    const d = evaluation.result?.[meta.key]
    return d ? [{ key: meta.key, score: d.score ?? 0 }] : []
  })
  if (scored.length === 0) return null
  const bottom = Math.min(...scored.map((d) => d.score))
  const trailing = scored.filter((d) => d.score === bottom)
  return trailing.length === 1 ? trailing[0].key : null
}

/**
 * How far a dimension moved since the previous run, or `null` when there is
 * nothing to compare — no previous run, or the dimension missing from either.
 * Zero is a real answer ("unchanged") and comes back as 0, not `null`.
 */
export function scoreDelta(
  current: PostEvaluation,
  previous: PostEvaluation | null | undefined,
  key: QualityDimensionKey,
): number | null {
  const now = current.result?.[key]
  const before = previous?.result?.[key]
  if (!now || !before) return null
  return (now.score ?? 0) - (before.score ?? 0)
}

/** "+2", "−1", "±0" — a signed change, with a real minus sign. */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`
  if (delta < 0) return `\u2212${Math.abs(delta)}`
  return '\u00b10'
}

/** A "Why these scores" row's DOM id, so a radar corner can scroll to it. */
export const reasonRowId = (key: QualityDimensionKey) => `quality-reason-${key}`

/** Clamps a dimension score onto the radar's 0–10 axis. */
export function radarScore(score: number | undefined): number {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 0
  return Math.min(10, Math.max(0, score))
}

/**
 * Where a score lands on its corner's axis, as an offset from the centre. The
 * web is a square, so a 10 sits on the outer ring's corner at `(±reach,
 * ±reach)` and every ring is the same square scaled — `reach` is half the
 * outer ring's side.
 */
export function radarPoint(
  corner: RadarCorner,
  score: number | undefined,
  reach: number,
): { x: number; y: number } {
  const r = (radarScore(score) / 10) * reach
  const sx = corner === 'nw' || corner === 'sw' ? -1 : 1
  const sy = corner === 'nw' || corner === 'ne' ? -1 : 1
  // `+ 0` folds a zero score's -0 into 0.
  return { x: sx * r + 0, y: sy * r + 0 }
}

/** The band thresholds the radar draws as rings — `scoreBand`'s own cut-offs. */
export const RADAR_RINGS = [5, 8] as const

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
