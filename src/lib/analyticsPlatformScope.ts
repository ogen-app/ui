/**
 * The platform filter the three dashboard reads share (CON-289), in the one
 * shape both the cache key and the request take.
 *
 * Sorted, so choosing LinkedIn then Instagram and Instagram then LinkedIn is one
 * cache entry and one URL rather than two answers to the same question. Empty
 * means every platform and is sent as no parameter at all — see
 * `AnalyticsPlatformQuery`.
 */
export function canonicalPlatforms(
  platforms: readonly string[] = [],
): readonly string[] {
  return [...new Set(platforms)].sort()
}

/** The key segment for a canonical set: `'all'` when nothing narrows it. */
export function platformsKey(platforms: readonly string[]): string {
  return platforms.length ? platforms.join(',') : 'all'
}
