import { attachmentKind, type PostAttachment } from '@/types/attachments'
import type { Platform } from '@/types/campaigns'

/**
 * The server's ceiling on any alt text, whatever the platform
 * (`platform_global_limits.max_alt_text_chars`). A longer write is a 400.
 */
export const MAX_ALT_TEXT_CHARS = 2000

/**
 * How long an image's alt text may be on this platform.
 *
 * `0` means the platform takes no alt text: nothing is published, so the field
 * is not offered. `null` means not known — no platform picked, the row still
 * loading, or an API from before the cap — and the field is offered against
 * the global ceiling, since the text is kept either way.
 */
export function altTextLimit(platform: Platform | undefined): number | null {
  const cap = platform?.image_constraints?.max_alt_text_chars
  return typeof cap === 'number' ? cap : null
}

/**
 * Where an image's alt text came from. `generated` is image-service's
 * description, which nobody has read yet; it publishes all the same.
 */
export type AltTextState = 'missing' | 'generated' | 'written'

export function altTextState(
  attachment: Pick<PostAttachment, 'alt_text' | 'alt_text_edited_by_user'>,
): AltTextState {
  if (!attachment.alt_text.trim()) return 'missing'
  return attachment.alt_text_edited_by_user ? 'written' : 'generated'
}

/** The attachments alt text applies to — images, the only kind it publishes on. */
export function describableImages<T extends PostAttachment>(
  attachments: T[],
): T[] {
  return attachments.filter((a) => attachmentKind(a.mime_type) === 'image')
}
