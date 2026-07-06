import type { ResolvedPostTypeRule } from '@/types/validation'

const KIND_IMAGE = 'image'

// True when the post type requires an image attachment (e.g. image-post,
// carousel). Those images come from the attachment system, so the
// preview shows an empty required placeholder rather than an inline
// content image.
export function imageRequired(
  rule: ResolvedPostTypeRule | null | undefined,
): boolean {
  return (
    !!rule && rule.min_attachments > 0 && rule.allowed_kinds.includes(KIND_IMAGE)
  )
}

// First inline image URL in BlockNote markdown content (`![alt](url)`),
// or null. Used for post types where an image is optional.
export function firstImageUrl(markdown: string): string | null {
  const m = (markdown ?? '').match(/!\[[^\]]*\]\(\s*([^\s)]+)/)
  if (!m) return null
  return m[1].replace(/^<|>$/g, '')
}
