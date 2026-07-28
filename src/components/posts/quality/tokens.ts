import type { QualityBand } from '@/lib/postQuality.ts'
import type { QualityDimensionKey } from '@/types/quality'

/**
 * The two colour scales the quality panel uses, kept in one place so the
 * composition bar and the dimension cards can't drift apart.
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
 * One hue per dimension, for the composition bar and the dot on each card
 * that ties a slice back to its card. Categorical, not judgemental — these
 * say *which* dimension, never how well it did, so they come from the chart
 * ramp rather than from the status accents above.
 */
export const DIMENSION_FILL: Record<QualityDimensionKey, string> = {
  correctness: 'bg-chart-3',
  clarity: 'bg-chart-2',
  engagement: 'bg-chart-1',
  delivery: 'bg-chart-4',
}
