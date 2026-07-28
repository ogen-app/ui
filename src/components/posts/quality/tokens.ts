import {
  EyeIcon,
  HeartIcon,
  PaperPlaneTiltIcon,
  SealCheckIcon,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react'
import type { QualityBand } from '@/lib/postQuality.ts'
import type { QualityDimensionKey } from '@/types/quality'

/**
 * The panel's shared vocabulary: how a score is coloured, and what each
 * dimension looks like. In one place so the ring, the overall bar and the
 * dimension cards can't drift apart.
 */

/** How a score reads: strong is good news, weak is a problem to fix. */
export const BAND_TEXT: Record<QualityBand, string> = {
  strong: 'text-positive',
  workable: 'text-warning',
  weak: 'text-destructive',
}

export const BAND_FILL: Record<QualityBand, string> = {
  strong: 'bg-positive',
  workable: 'bg-warning',
  weak: 'bg-destructive',
}

/**
 * One glyph per dimension, standing in for the name so the card can lead with
 * what the dimension *means* instead of what it is called. Categorical only —
 * an icon says which dimension, never how it scored; that is the bar's job,
 * and giving both a colour made the card argue with itself.
 */
export const DIMENSION_ICON: Record<QualityDimensionKey, PhosphorIcon> = {
  correctness: SealCheckIcon,
  clarity: EyeIcon,
  engagement: HeartIcon,
  delivery: PaperPlaneTiltIcon,
}
