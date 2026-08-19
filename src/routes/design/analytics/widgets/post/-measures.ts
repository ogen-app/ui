import type { MeasureId } from '@/components/analytics/types'

/**
 * The measures a post can get a card for, in the order they stack on the
 * surface — and the set the `$measure` bench route is validated against.
 *
 * Kept beside the harness rather than exported from the component: the surface
 * decides which cards a *given post* renders from what its platform reported,
 * and this is the different question of which cards exist to be reviewed at all.
 */
export const POST_MEASURE_IDS = [
  'reach',
  'impressions',
  'interactions',
  'engagement_rate',
  'saves',
  'clicks',
  'views',
] as const satisfies readonly MeasureId[]

export function isPostMeasure(value: string): value is (typeof POST_MEASURE_IDS)[number] {
  return (POST_MEASURE_IDS as readonly string[]).includes(value)
}
