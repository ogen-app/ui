import type { TFunction } from 'i18next'
import {
  bandLabel,
  overallBand,
  scoreBand,
  type QualityBand,
} from '@/lib/postQuality'
import type { QualityDimensionKey } from '@/types/quality'
import { placeAgainstTypical, type Criterion } from './criteria'
import type { PostQuality, QualityView, ScoredPost } from './types'

/**
 * Holding the pre-publish quality score against what the posts actually earned.
 *
 * The whole card rests on one uncomfortable question — *does the number we put
 * on a post before publishing have anything to do with what happens after?* —
 * and the rules here exist so that the answer can honestly be **no**. A card
 * that can only confirm the score is worthless; the states worth designing for
 * are the flat element, the inverted one, and the element every post scores the
 * same on.
 *
 * Three things make the comparison defensible:
 *
 * - **Bands, not a correlation.** Nine posts do not support a coefficient, and
 *   a coefficient is unreadable anyway. Three bands — the app's own Good /
 *   Workable / Weak — turn it into "these posts against those posts", which is
 *   a comparison a reader can check by opening two of them.
 * - **What the bands are compared *on* is the performers card's criteria**, not
 *   a raw total. The bands hold posts of every age by construction, so ranking
 *   them on reach would rank them by seniority; `criteria.ts` already solved
 *   that, and reusing it means one vocabulary of "performed well" across the
 *   surface instead of two.
 * - **Medians, not means.** One post at a quarter of the campaign lands in
 *   whichever band it lands in and drags that band's average wherever it likes.
 *   The card's own finding would then be an artefact of a single post — which
 *   is the exact failure the anomaly rule elsewhere on this surface exists to
 *   name.
 */

/** The overall, plus each element the model scores separately. */
export type QualityElement = 'overall' | QualityDimensionKey

/**
 * Overall first, then the four in the order CON-85 defines them — the same
 * order the quality panel in the post editor renders, because a reader who has
 * seen one should not have to re-find the elements in the other.
 *
 * Ids only. What each is called, the one-line question it answers, and how its
 * three bands read in its own units are all in the catalogue under
 * `analytics.quality.elements.<id>` — read through {@link elementCopy}. The
 * band ranges are copy rather than data because two of them are words:
 * "Under 50%" and "Under 5" are sentences a locale writes, not numbers.
 */
export const QUALITY_ELEMENTS: QualityElement[] = [
  'overall',
  'correctness',
  'clarity',
  'engagement',
  'delivery',
]

export interface QualityElementCopy {
  label: string
  /** The one-line question the element answers — the tile's tooltip. */
  blurb: string
  /** How the bands read, in the element's own units. */
  bands: Record<QualityBand, string>
}

export function elementCopy(
  t: TFunction,
  element: QualityElement,
): QualityElementCopy {
  return {
    label: t(`analytics.quality.elements.${element}.label` as const),
    blurb: t(`analytics.quality.elements.${element}.blurb` as const),
    bands: {
      strong: t(`analytics.quality.elements.${element}.strong` as const),
      workable: t(`analytics.quality.elements.${element}.workable` as const),
      weak: t(`analytics.quality.elements.${element}.weak` as const),
    },
  }
}

/** Best band first, so every list on the card runs the same way down. */
export const BAND_ORDER: QualityBand[] = ['strong', 'workable', 'weak']

/**
 * A band needs this many *placeable* posts before it shows a figure.
 *
 * Blunt on purpose, and lower than the ranking gate elsewhere: the claim here
 * is a comparison between two bands rather than a ranking within one, so the
 * sample that matters is the smaller of the two ends. Two posts is an anecdote
 * that will be screenshotted; three is the least that can carry a median at
 * all.
 */
export const MIN_BAND_POSTS = 3

/**
 * And the card needs this many scored, reported posts before it draws bands.
 *
 * Below it there is no arrangement of three bands that isn't mostly empty, and
 * an empty band is indistinguishable on sight from a band nothing scored into
 * — which is the one misreading this card cannot afford, because "no post of
 * yours scored Weak" and "too few posts to say" lead to opposite conclusions.
 */
export const MIN_SCORED_POSTS = 6

/** The element's score on a post: 0–100 for the overall, 0–10 otherwise. */
export function elementScore(
  quality: PostQuality,
  element: QualityElement,
): number {
  return element === 'overall' ? quality.overall : quality.scores[element]
}

/** Which band that score falls in. The app's own thresholds, not new ones. */
export function elementBand(
  quality: PostQuality,
  element: QualityElement,
): QualityBand {
  return element === 'overall'
    ? overallBand(quality.overall)
    : scoreBand(quality.scores[element])
}

export interface BandGroup {
  band: QualityBand
  /** `Good`, `Workable`, `Weak` — the words the post editor already uses. */
  label: string
  /** `8–10` — what a post had to score to be in here. */
  range: string
  /** Every scored, reported post in the band, whether or not it can be read. */
  posts: ScoredPost[]
  /** How many of them the chosen criterion could actually read. */
  placed: number
  /**
   * The band's typical result — the median of the criterion across its placed
   * posts. `null` when the band is empty or under {@link MIN_BAND_POSTS}, which
   * is a real state the row renders rather than a hole.
   */
  value: number | null
}

/**
 * The three bands of one element, best first.
 *
 * Always three, including the empty ones. A band that disappears when nothing
 * scored into it turns "we never write anything weak" into a card that looks
 * like it only has two bands, and the reader has no way to tell that from a
 * card whose third band is off the bottom.
 */
export function bandGroups(
  t: TFunction,
  posts: ScoredPost[],
  element: QualityElement,
  criterion: Criterion,
  corrected: boolean,
): BandGroup[] {
  const copy = elementCopy(t, element)
  return BAND_ORDER.map((band) => {
    const inBand = posts.filter(
      (post) => elementBand(post.quality, element) === band,
    )
    const values = inBand
      .map((post) => criterion.value(post, corrected))
      .filter((value): value is number => value !== null)
    return {
      band,
      label: bandLabel(t, band),
      range: copy.bands[band],
      posts: inBand,
      placed: values.length,
      value: values.length >= MIN_BAND_POSTS ? median(values) : null,
    }
  })
}

/**
 * What a better score bought, and which way round it ran.
 *
 * The ratio is always *higher band ÷ lower band* in **score order**, never
 * largest ÷ smallest — so an element where the posts we scored badly did better
 * comes out below 1 and says so, instead of being flattened into the same
 * "1.6× spread" as an element that worked. That inversion is the single most
 * useful thing this card can find, and sorting it away would hide it.
 */
export interface QualitySpread {
  /** `1.8` — the top occupied band's result over the bottom one's. */
  ratio: number
  /** Whether the score tracked the result, ran against it, or said nothing. */
  direction: 'tracks' | 'inverted' | 'flat'
  top: BandGroup
  bottom: BandGroup
}

/**
 * Why an element can't be placed — each answered differently on the tile.
 *
 * `single-band` is the one worth naming rather than folding into "not enough":
 * an element every post scores Good on has plenty of sample and no variance,
 * and the finding is that this element is a floor everything clears, not a
 * lever anything is pulled by. Telling someone to write more posts would be
 * exactly the wrong advice.
 */
export type SpreadGap = 'single-band' | 'thin-bands'

export function spreadOf(groups: BandGroup[]): QualitySpread | SpreadGap {
  const occupied = groups.filter((g) => g.posts.length > 0)
  if (occupied.length < 2) return 'single-band'

  const placed = groups.filter((g) => g.value !== null)
  if (placed.length < 2) return 'thin-bands'

  // Best-scoring first, so `top` is the better-scored end whatever the numbers
  // say about it. `bandGroups` already returns them in that order.
  const top = placed[0]
  const bottom = placed[placed.length - 1]
  if (bottom.value === 0) return 'thin-bands'

  const ratio = (top.value as number) / (bottom.value as number)
  const placement = placeAgainstTypical(ratio)
  return {
    ratio,
    // The same reciprocal thresholds the rest of the surface calls "unusual" —
    // a quarter better either way. Anything inside them is the ordinary spread
    // between two handfuls of a workspace's own posts, and calling that a
    // relationship is how a card starts confirming whatever it is shown.
    direction:
      placement === 'ahead'
        ? 'tracks'
        : placement === 'behind'
          ? 'inverted'
          : 'flat',
    top,
    bottom,
  }
}

export function isSpread(
  spread: QualitySpread | SpreadGap,
): spread is QualitySpread {
  return typeof spread !== 'string'
}

/** Posts that can be in the comparison at all: scored, reported, not stale. */
export function comparablePosts(view: QualityView): ScoredPost[] {
  return view.posts.filter((post) => !post.quality.stale)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}
