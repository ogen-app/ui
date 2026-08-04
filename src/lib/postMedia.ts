import {
  attachmentKind,
  type AttachmentKind,
  type PostAttachment,
} from '@/types/attachments'
import type { ResolvedPostTypeRule } from '@/types/validation'
import {
  getPlatformMedia,
  imageSizeLimit,
  type DocumentMediaConstraints,
  type ImageMediaConstraints,
} from '@/lib/platformMedia'

/**
 * What the currently-selected (platform, post type) pair does with
 * attachments. Resolved from the server's structural rule for the post type
 * intersected with the platform's own media caps.
 *
 * Attachments outlive a post-type change on purpose: switching a carousel to
 * a text post leaves the uploads in place (`accepts: false` +
 * `strandedNotice`) rather than deleting the user's files. Nothing is
 * removed unless the user removes it.
 */
export type MediaPolicy = {
  /** The post type takes attachments Ogen can handle (image or PDF). */
  accepts: boolean
  /** At least one attachment is required to leave Draft. */
  required: boolean
  min: number
  /** Effective ceiling: the stricter of the post-type rule and platform cap. */
  max: number | null
  /** Kinds this post type takes, already filtered to what Ogen supports. */
  kinds: AttachmentKind[]
  /** Set when the post type only takes media Ogen doesn't handle (video). */
  videoOnly: boolean
  image?: ImageMediaConstraints
  document?: DocumentMediaConstraints
}

const SUPPORTED_KINDS: AttachmentKind[] = ['image', 'pdf']

/**
 * Resolves the policy for a post. `rule` is the server's rule for the
 * selected post type — `null` while it loads, or for whitelist-only types
 * (event, live-video) where Ogen enforces nothing.
 */
export function mediaPolicy(
  platformId: string,
  rule: ResolvedPostTypeRule | null | undefined,
): MediaPolicy {
  const media = getPlatformMedia(platformId)
  const platformMax = media.image?.maxPerPost ?? null

  if (!rule) {
    // No rule: the platform accepts the type and validates it itself. Allow
    // attachments up to the platform cap rather than blocking the user.
    return {
      accepts: true,
      required: false,
      min: 0,
      max: platformMax,
      kinds: SUPPORTED_KINDS,
      videoOnly: false,
      image: media.image,
      document: media.document,
    }
  }

  const declared = rule.allowed_kinds
  const kinds =
    declared.length === 0
      ? SUPPORTED_KINDS
      : (declared.filter((k): k is AttachmentKind =>
          SUPPORTED_KINDS.includes(k as AttachmentKind),
        ) as AttachmentKind[])
  const videoOnly = declared.length > 0 && kinds.length === 0

  // `max_attachments: 0` is the text-post case — no media at all.
  const ruleMax = rule.max_attachments
  const accepts = !videoOnly && ruleMax !== 0
  const max =
    ruleMax === null
      ? platformMax
      : platformMax === null
        ? ruleMax
        : Math.min(ruleMax, platformMax)

  return {
    accepts,
    required: accepts && rule.min_attachments > 0,
    min: rule.min_attachments,
    max,
    kinds,
    videoOnly,
    image: media.image,
    document: media.document,
  }
}

/** Attachments the current post type will not publish, if any. */
export function strandedAttachments(
  attachments: PostAttachment[],
  policy: MediaPolicy,
): PostAttachment[] {
  if (!policy.accepts) return attachments
  return attachments.filter((a) => !policy.kinds.includes(attachmentKind(a.mime_type)))
}

/** Client-side pre-check, mirroring what the server would warn about. */
export function checkFile(
  file: File,
  policy: MediaPolicy,
): { ok: true } | { ok: false; reason: string } {
  const kind = attachmentKind(file.type)
  if (kind === 'other') {
    return { ok: false, reason: `${file.name}: only images and PDFs are supported` }
  }
  if (!policy.kinds.includes(kind)) {
    return {
      ok: false,
      reason:
        kind === 'pdf'
          ? `${file.name}: this post type doesn't take PDFs`
          : `${file.name}: this post type doesn't take images`,
    }
  }
  const limit = kind === 'pdf' ? policy.document : policy.image
  const maxBytes =
    kind === 'pdf'
      ? policy.document?.maxFileSizeBytes
      : policy.image && imageSizeLimit(policy.image, file.type)
  if (maxBytes !== undefined && file.size > maxBytes) {
    return { ok: false, reason: `${file.name} is larger than this platform allows` }
  }
  if (limit && file.type && !limit.allowedMimes.includes(file.type)) {
    return { ok: false, reason: `${file.name}: this platform doesn't accept that format` }
  }
  return { ok: true }
}
