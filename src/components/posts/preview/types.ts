export type PreviewAuthor = {
  name: string | null
  /** LinkedIn's headline, Facebook's nothing, Instagram's nothing. */
  subtitle?: string | null
  username?: string | null
  avatarUrl?: string | null
}

/**
 * One tile in a card's media block.
 *
 * A video arrives as its poster frame — the same still the networks show
 * before playback — so `url` is a picture either way. `kind` is what stops the
 * card from *presenting* it as a picture: without it a video reads as an image
 * post, which is the wrong answer to "what will this look like".
 */
export type PreviewMediaItem = {
  url: string
  kind: 'image' | 'video'
  /**
   * Probed length, in milliseconds. `0` means the probe never ran (video
   * service unreachable — see `docs/technical-decisions.md#video-ingest`),
   * never a zero-length video, so the badge is omitted rather than showing
   * "0:00".
   */
  durationMs: number
}

/** What every platform preview needs. Platform-specific extras go on top. */
export type PreviewProps = {
  /** Already flattened out of Markdown — see `lib/socialText.ts`. */
  text: string
  /**
   * The post's title. Only rendered where the platform publishes one
   * (YouTube); elsewhere it is Ogen's internal name for the post and the
   * panel's notes say so.
   */
  title: string
  media: PreviewMediaItem[]
  /**
   * The post type's slug (`reel`, `short`, `image-post`). Decides the frame:
   * a Reel is 9:16 where a feed image is square, and a card that draws the
   * wrong shape answers the one question a preview exists to answer wrongly.
   */
  postType: string
  author: PreviewAuthor
  /** "Just now", "in 3 days" — whatever the post's schedule makes true. */
  timeLabel: string
}

