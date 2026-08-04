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
   * The post type's slug (`reel`, `short`, `thread`, `story`, `image-post`).
   *
   * Most types are the same feed card and ignore this. It exists for the ones
   * that are not: it decides the frame (a Reel is 9:16 where a feed image is
   * square), and it marks the types that are not a feed card at all — a story
   * is fullscreen and captionless, a thread is several posts.
   */
  postType: string
  author: PreviewAuthor
  /** "Just now", "in 3 days" — whatever the post's schedule makes true. */
  timeLabel: string
  /**
   * The platform's character ceiling, resolved from the API (CON-91), or
   * `null` while it is still loading or where the network has none.
   *
   * Passed down rather than looked up per network: it used to be a constant
   * beside the folds, and a card carrying its own copy of the number is how
   * the preview and the Validations panel come to disagree about whether the
   * same post fits.
   */
  charLimit?: number | null
}

