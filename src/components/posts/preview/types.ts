export type PreviewAuthor = {
  name: string | null
  /** LinkedIn's headline, Facebook's nothing, Instagram's nothing. */
  subtitle?: string | null
  username?: string | null
  avatarUrl?: string | null
}

/** What every platform preview needs. Platform-specific extras go on top. */
export type PreviewProps = {
  /** Already flattened out of Markdown — see `lib/socialText.ts`. */
  text: string
  mediaUrls: string[]
  author: PreviewAuthor
  /** "Just now", "in 3 days" — whatever the post's schedule makes true. */
  timeLabel: string
  /**
   * The post-type slug (`text-post`, `thread`, `story`, …).
   *
   * Most types are the same feed card and ignore this. The ones that are not
   * a feed card at all — a story is fullscreen and captionless, a thread is
   * several posts — are what it exists for.
   */
  postType?: string
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
