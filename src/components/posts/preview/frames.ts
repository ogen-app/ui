/**
 * Which shape a card draws its media in.
 *
 * The networks all run two frames: the feed's (landscape on LinkedIn, square
 * on Instagram, whatever the file is on Facebook) and a full-height vertical
 * one for the short-video formats. The post type is what picks between them,
 * and drawing the wrong one shows the user a crop that will never exist.
 */

/**
 * Post types rendered in a 9:16 frame. Slugs come from
 * `platformDictionary.ts` — `reel` on Facebook and Instagram, `short` on
 * YouTube, `story` on both of the first two.
 */
const VERTICAL_TYPES = new Set(['reel', 'short', 'story'])

/**
 * 9:16 for the vertical formats, otherwise the caller's feed default — which
 * may be `undefined`, meaning "let the media keep its own shape". The
 * overloads say what the implementation guarantees: give it a default and a
 * number always comes back.
 */
export function frameAspect(postType: string, feedAspect: number): number
export function frameAspect(
  postType: string,
  feedAspect?: number,
): number | undefined
export function frameAspect(
  postType: string,
  feedAspect?: number,
): number | undefined {
  return VERTICAL_TYPES.has(postType) ? 9 / 16 : feedAspect
}
