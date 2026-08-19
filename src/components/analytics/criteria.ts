import { formatCount, formatPercent } from './format'
import type { PacePlacement, PerformerCriterionId, PerformersView, RankedPost } from './types'

/**
 * What "best" and "worst" mean on the performers card.
 *
 * A ranked list of posts is only as honest as the number it is sorted on, and
 * the obvious number — reach — is the one most contaminated by age. So the card
 * asks the reader which question they are asking, and every criterion here is
 * one that survives being asked of posts of different ages:
 *
 * - **Ratios settle early.** Interactions per person reached is roughly the
 *   same at hour six and week three, because both halves of it arrive together.
 *   That makes a rate the only figure a two-day-old post and a three-week-old
 *   one can be ranked on with no correction at all — which is also why a
 *   workspace too young to have a maturation curve is not locked out of this
 *   card.
 * - **A total needs correcting.** Reach is ranked where it *lands*, not where
 *   it stands: divided through the share of its lifetime earning that has
 *   already arrived. Under the curve's floor that division amplifies noise into
 *   a verdict, so those posts are refused rather than estimated.
 * - **Pace is the correction turned into the question.** This post against what
 *   a typical post of yours had earned by the same age — dimensionless, so it
 *   needs no projection to be fair.
 *
 * Every criterion refuses rather than guesses. A post that can't be ranked on
 * the chosen one is held out and counted, never ranked last: absent is not
 * zero, and a post whose platform doesn't report saves would otherwise be the
 * card's worst performer for a reason that has nothing to do with the post.
 *
 * Clicks are deliberately not here. A click is only meaningful against the
 * place it went, which is the Outcomes card's whole job — ranking posts by
 * clicks with no destination named would be that card's question asked badly.
 */

export interface Criterion {
  id: PerformerCriterionId
  /** Names the column and the option in the picker. */
  label: string
  /**
   * What it is called with no curve to correct against — read through
   * `criterionLabel`, never directly.
   *
   * "Reach when it finishes" is a promise about a projection, and a workspace
   * with no curve isn't projecting anything: the same column there is reach so
   * far, and the label has to say which of the two it is.
   */
  rawLabel?: string
  /** The unit, where the number alone doesn't carry it. */
  suffix?: string
  format: (value: number) => string
  /** Reads a post, or refuses. `corrected` is whether a curve exists. */
  value: (post: RankedPost, corrected: boolean) => number | null
  /** Why a post gets refused — the sentence at the foot when some are. */
  heldOut: (count: number) => string
  /** Whether the row's meta line should carry the period share or the reach. */
  qualifier: 'share' | 'reach'
}

/**
 * A rate needs a denominator worth dividing by. Three interactions from forty
 * people reached is 7.5% — a figure that would top any engagement ranking on
 * the strength of nothing, and the one most likely to be screenshotted.
 */
export const MIN_REACH_FOR_RATE = 300

const rate =
  (measure: 'interactions' | 'saves' | 'followers', per: number) =>
  (post: RankedPost): number | null => {
    const reach = post.metrics.reach ?? 0
    const earned = post.metrics[measure]
    // Absent is not zero. A platform that hands back no saves must not make
    // its posts the worst in the workspace at saving.
    if (earned === undefined || reach < MIN_REACH_FOR_RATE) return null
    return (earned / reach) * per
  }

export const CRITERIA: Criterion[] = [
  {
    id: 'pace',
    label: 'Against your typical',
    format: (v) => `${v.toFixed(1)}×`,
    value: (post) => post.pace,
    heldOut: (n) =>
      `${n === 1 ? 'One post is' : `${n} posts are`} too young to place against the curve.`,
    qualifier: 'share',
  },
  {
    id: 'reach',
    label: 'Reach when it finishes',
    rawLabel: 'Reach so far',
    format: formatCount,
    value: (post, corrected) => {
      const reach = post.metrics.reach
      if (reach === undefined) return null
      if (!corrected) return reach
      if (post.matured >= 1) return reach
      // The floor, borrowed from the curve: `pace` is null for exactly the
      // posts too young to correct, so dividing by their maturity is the one
      // thing this criterion must not do.
      if (post.pace === null || post.matured <= 0) return null
      return Math.round(reach / post.matured)
    },
    heldOut: (n) =>
      `${n === 1 ? 'One post is' : `${n} posts are`} too young to project — almost nothing has landed yet.`,
    qualifier: 'share',
  },
  {
    id: 'engagement_rate',
    label: 'Engagement rate',
    format: formatPercent,
    value: rate('interactions', 1),
    heldOut: (n) =>
      `${n === 1 ? 'One post was' : `${n} posts were`} seen by too few people for a rate to mean anything, or reported no interactions.`,
    qualifier: 'reach',
  },
  {
    id: 'save_rate',
    label: 'Saves',
    suffix: 'per 1,000 reached',
    format: (v) => v.toFixed(1),
    value: rate('saves', 1_000),
    heldOut: (n) =>
      `${n === 1 ? 'One post did' : `${n} posts did`} not report saves, or was seen by too few people to divide.`,
    qualifier: 'reach',
  },
  {
    id: 'follow_rate',
    label: 'Follows',
    suffix: 'per 1,000 reached',
    format: (v) => v.toFixed(1),
    value: rate('followers', 1_000),
    heldOut: (n) =>
      `${n === 1 ? 'One post did' : `${n} posts did`} not report follows, or was seen by too few people to divide.`,
    qualifier: 'reach',
  },
]

/**
 * The least a view has to carry to be ranked: the posts, and whether there is a
 * maturation curve to correct their ages against.
 *
 * Structural rather than `PerformersView` itself, because the performers card is
 * no longer the only one asking "which of these posts did better" — the quality
 * card asks it of three bands at once, on the same criteria, and a second
 * vocabulary of *performed well* on one surface would be one too many.
 */
export type RankableView = Pick<PerformersView, 'posts' | 'curve'>

/**
 * The criteria this view can actually be ranked by.
 *
 * A criterion that would rank nothing is not offered. Pace withdraws with the
 * curve; the rates withdraw on a platform that doesn't report them — and an
 * option that opens onto an empty list is worse than an option that isn't
 * there, because the reader spends the click finding that out.
 */
export function availableCriteria(view: RankableView): Criterion[] {
  const corrected = view.curve !== null
  return CRITERIA.filter(
    (c) =>
      (c.id !== 'pace' || corrected) &&
      view.posts.some((p) => c.value(p, corrected) !== null),
  )
}

/** What to call a criterion, given whether there is a curve behind it. */
export function criterionLabel(criterion: Criterion, corrected: boolean): string {
  return corrected ? criterion.label : (criterion.rawLabel ?? criterion.label)
}

/**
 * Where a figure sits against this workspace's own typical.
 *
 * The thresholds are reciprocal — 1.25 and 0.8 — so "a quarter better" and "a
 * fifth worse" are the same distance from normal in both directions. Anything
 * inside them is the ordinary spread of a workspace's own posts, and calling
 * that a win teaches people to ignore the ones that are.
 */
export function placeAgainstTypical(ratio: number): PacePlacement {
  if (ratio >= 1.25) return 'ahead'
  if (ratio <= 0.8) return 'behind'
  return 'usual'
}
