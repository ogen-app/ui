// Per-post-type structural rules, served by
// `GET /api/platforms/:id/post-type-rules`. Mirrors
// `platforms.PostTypeRuleView` in `src/platforms/post_types.go`.

export type ResolvedPostTypeRule = {
  requires_content: boolean
  /** Attachment kinds the type accepts; empty means "no kind restriction". */
  allowed_kinds: string[]
  min_attachments: number
  /** `null` means unbounded by this rule (the platform cap still applies). */
  max_attachments: number | null
  /**
   * Body-text ceiling for this post type, already resolved by the server from
   * the platform's `text_constraints` (per-post-type override, else the
   * platform default). `null` means unbounded — show no cap.
   *
   * Counted in Unicode code points, matching the server-side check.
   */
  max_content_chars: number | null
}

export type PostTypeRuleView = {
  slug: string
  label: string
  /**
   * The platform accepts the slug but Ogen enforces no structural rules
   * (live-video, event, …). `rule` is null for these.
   */
  whitelist_only: boolean
  rule: ResolvedPostTypeRule | null
}
