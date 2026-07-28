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
}
