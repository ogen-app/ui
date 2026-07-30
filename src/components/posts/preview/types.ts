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
}
