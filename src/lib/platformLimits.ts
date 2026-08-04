// Per-platform character limits for post content.
//
// The backend owns these as of CON-91: every platform row carries a
// `text_constraints` object, and `GET /api/platforms/:id/post-type-rules`
// serves the already-resolved `max_content_chars` per post type. Nothing here
// hardcodes a number any more.
//
// Mirrors `TextConstraints.ContentLimitFor` in the Go repo — per the
// `src/lib/*` rule, the server is the source of truth; if its resolution
// changes, this follows.

import type { Platform, TextConstraints } from '@/types/campaigns'
import type { ResolvedPostTypeRule } from '@/types/validation'

/**
 * The platform's ceiling for one post type, or `null` when unbounded.
 *
 * `0` is the Go zero value for "not seeded", and reads as unbounded rather
 * than as "no characters allowed" — a platform we have no limit for must not
 * fail every post.
 */
export function contentLimitFor(
  constraints: TextConstraints | undefined,
  postType: string,
): number | null {
  if (!constraints) return null

  const override = postType ? constraints.per_post_type?.[postType] : undefined
  if (override !== undefined && override > 0) return override

  return constraints.max_content_chars > 0 ? constraints.max_content_chars : null
}

/**
 * The platform's ceiling for the post *title*, or `null` when it sets none
 * (CON-160). Only platforms with a distinct title field seed this — YouTube at
 * 100, matching what Zernio documents; everywhere else the title is Ogen's own
 * label and never leaves the app.
 *
 * There is no per-post-type override: unlike `max_content_chars`, the server's
 * `TextConstraints` carries a single title cap per platform.
 */
export function titleLimitFor(
  constraints: TextConstraints | undefined,
): number | null {
  if (!constraints) return null
  return constraints.max_title_chars > 0 ? constraints.max_title_chars : null
}

/**
 * The limit to measure a post against, preferring the server's own resolution.
 *
 * The post-type rule is authoritative — it is what the publish-time check uses
 * — but it is absent for a whitelist-only type, before a type is picked, and
 * while the rules query is in flight. The platform row covers those, so the
 * counter still has a cap to show instead of blinking out.
 */
export function resolveCharLimit(
  platform: Platform | undefined,
  rule: ResolvedPostTypeRule | null,
  postType: string,
): number | null {
  if (rule) return rule.max_content_chars
  return contentLimitFor(platform?.text_constraints, postType)
}
