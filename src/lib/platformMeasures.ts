import type { AnalyticsMetrics } from '@/types/analytics'

/**
 * Which measures a platform actually reports — the table that turns an
 * ambiguous `0` on the wire back into *not reported*.
 *
 * The wire cannot say it. `PostAnalyticsMetrics` is nine plain Go `int`s with
 * no `omitempty`, so a platform that has no concept of saves sends `saves: 0`,
 * which is indistinguishable from a post nobody saved. Rendering that as a
 * figure claims the platform measured something and found none — and the post
 * surface's whole rule is that *a measure the platform never reported has no
 * card*, which is unrepresentable without this.
 *
 * **The table only ever removes zeros.** A non-zero value is always kept, even
 * where this file says the platform doesn't report it, so a wrong entry can
 * suppress a genuine zero but can never hide a real number. That asymmetry is
 * what makes it safe to ship a table built from reading rather than from
 * observation.
 *
 * Which is what this is. Nothing here has been checked against a running
 * Zernio: the entries below are the public platform APIs, and Zernio's own
 * normalisation sits between them and us. Correct them against real data
 * before the `post-analytics` flag is flipped — a slug that turns out to
 * report a measure listed here shows a tile the moment it reports a non-zero,
 * which is the signal that the entry is wrong.
 */

/** The nine the wire carries — the keys of the metrics block itself. */
export type WireMeasure = keyof AnalyticsMetrics

/**
 * Per platform, the measures believed **not** to be reported at all, keyed by
 * the wire slug (`resolvePlatformInfo` answers to these).
 *
 * A platform absent from this table reports everything — the right default for
 * one we have not looked at, because it errs towards showing a figure we have
 * rather than hiding one we do.
 */
const UNREPORTED: Record<string, readonly WireMeasure[]> = {
  // Impressions, never unique reach; bookmarks arrive as saves.
  twitter: ['reach'],
  // Feed posts carry no link-click count.
  instagram: ['clicks'],
  // Insights are views, likes, replies, reposts and quotes — nothing else.
  threads: ['reach', 'impressions', 'saves', 'clicks'],
  // Views and impressions, no unique reach; nothing save- or click-shaped.
  youtube: ['reach', 'saves', 'clicks'],
  // Impressions, unique impressions, reactions, comments, reposts, clicks.
  linkedin: ['saves'],
  // Facebook reports all nine; listed for the reader who comes looking.
  facebook: [],
}

/** Whether this platform is believed to measure this at all. */
export function reportsMeasure(
  platform: string,
  measure: WireMeasure,
): boolean {
  return !UNREPORTED[platform]?.includes(measure)
}

/**
 * Whether a figure on the wire is a result or an absence.
 *
 * The one rule, in one place: a zero from a platform that does not measure the
 * thing is nothing, and everything else is a number.
 */
export function isReported(
  platform: string,
  measure: WireMeasure,
  value: number,
): boolean {
  return value !== 0 || reportsMeasure(platform, measure)
}
