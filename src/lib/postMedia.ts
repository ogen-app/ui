import {
  attachmentKind,
  type AttachmentKind,
  type PostAttachment,
} from '@/types/attachments'
import type { Platform } from '@/types/campaigns'
import type { ResolvedPostTypeRule } from '@/types/validation'
import {
  describeImageConstraints,
  formatBytes,
  getPlatformMedia,
  imageSizeLimit,
  type DocumentMediaConstraints,
  type ImageMediaConstraints,
} from '@/lib/platformMedia'
import {
  describeVideoConstraints,
  resolveVideoConstraints,
  videoFormatOf,
  type VideoMediaConstraints,
} from '@/lib/platformVideo'

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
  /** The post type takes attachments Ogen can handle. */
  accepts: boolean
  /** At least one attachment is required to leave Draft. */
  required: boolean
  min: number
  /** Effective ceiling: the stricter of the post-type rule and platform cap. */
  max: number | null
  /** Kinds this post type takes, already filtered to what Ogen supports. */
  kinds: AttachmentKind[]
  /**
   * The post type takes video but the platform row carries no video rules, so
   * the server would answer `video_not_supported`. All six video-capable
   * platforms are seeded, so this only fires against an API that predates the
   * CON-148 migration — which is worth saying out loud rather than offering an
   * upload that will be rejected.
   */
  videoUnsupported: boolean
  image?: ImageMediaConstraints
  document?: DocumentMediaConstraints
  video?: VideoMediaConstraints
}

const SUPPORTED_KINDS: AttachmentKind[] = ['image', 'pdf', 'video']

/**
 * Resolves the policy for a post. `rule` is the server's rule for the
 * selected post type — `null` while it loads, or for whitelist-only types
 * (event, live-video) where Ogen enforces nothing. `platform` is the row from
 * `usePlatforms()`, which carries the server-owned video rules; `undefined`
 * while it loads.
 */
export function mediaPolicy(
  platformId: string,
  rule: ResolvedPostTypeRule | null | undefined,
  platform?: Platform,
): MediaPolicy {
  const media = getPlatformMedia(platformId)
  const video = resolveVideoConstraints(platform)

  // The per-post cap for the kinds this type actually takes. The server has
  // already folded its own cap into `rule.max_attachments`, so this is only a
  // client-side floor — take the loosest applicable one and let the rule bind.
  const capFor = (kinds: AttachmentKind[]): number | null => {
    const caps: number[] = []
    if (kinds.includes('image') && media.image) caps.push(media.image.maxPerPost)
    if (kinds.includes('video') && video) caps.push(video.maxPerPost)
    return caps.length > 0 ? Math.max(...caps) : null
  }

  if (!rule) {
    // No rule: the platform accepts the type and validates it itself. Allow
    // attachments up to the platform cap rather than blocking the user.
    return {
      accepts: true,
      required: false,
      min: 0,
      max: capFor(SUPPORTED_KINDS),
      kinds: SUPPORTED_KINDS,
      videoUnsupported: false,
      image: media.image,
      document: media.document,
      video,
    }
  }

  const declared = rule.allowed_kinds
  const kinds =
    declared.length === 0
      ? SUPPORTED_KINDS
      : (declared.filter((k): k is AttachmentKind =>
          SUPPORTED_KINDS.includes(k as AttachmentKind),
        ) as AttachmentKind[])

  // A video-only type on a platform with no video rules: the upload would be
  // accepted and then warned about. `platform` being undefined is a load, not
  // a verdict, so it must not trip this.
  const videoUnsupported =
    !!platform && kinds.length > 0 && kinds.every((k) => k === 'video') && !video

  // `max_attachments: 0` is the text-post case — no media at all.
  const ruleMax = rule.max_attachments
  const accepts = kinds.length > 0 && ruleMax !== 0
  const platformMax = capFor(kinds)
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
    videoUnsupported,
    image: media.image,
    document: media.document,
    video,
  }
}

/**
 * What to call the thing this post type is missing. A YouTube video post
 * asking for "an image" is worse than vague — it points the user at the wrong
 * file. Mixed-kind types (the `story` image-or-video rule) stay generic.
 */
export function mediaNoun(policy: MediaPolicy, plural = false): string {
  const onlyVideo = policy.kinds.length > 0 && policy.kinds.every((k) => k === 'video')
  const onlyImage = policy.kinds.length > 0 && policy.kinds.every((k) => k === 'image')
  if (onlyVideo) return plural ? 'videos' : 'a video'
  if (onlyImage) return plural ? 'images' : 'an image'
  return plural ? 'files' : 'a file'
}

/**
 * The one-line hint under the dropzone. One hint, for the kind the post type
 * actually takes — a video post type showing image rules would describe an
 * upload it won't accept. Mixed-kind types keep the image hint, the common
 * case for them.
 */
export function describeConstraints(policy: MediaPolicy): string | undefined {
  const onlyVideo = policy.kinds.includes('video') && !policy.kinds.includes('image')
  const hint = onlyVideo
    ? policy.video && describeVideoConstraints(policy.video)
    : policy.image && describeImageConstraints(policy.image)
  return hint || undefined
}

/** The `accept` attribute for the picker, across every kind this type takes. */
export function acceptAttribute(policy: MediaPolicy): string {
  const mimes: string[] = []
  if (policy.kinds.includes('image')) {
    mimes.push(...(policy.image?.allowedMimes ?? ['image/jpeg', 'image/png', 'image/webp', 'image/gif']))
  }
  if (policy.kinds.includes('pdf')) {
    mimes.push(...(policy.document?.allowedMimes ?? ['application/pdf']))
  }
  if (policy.kinds.includes('video') && policy.video) {
    mimes.push(...policy.video.allowedMimes)
  }
  return mimes.join(',')
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
    return { ok: false, reason: `${file.name}: only images, PDFs and video are supported` }
  }
  if (!policy.kinds.includes(kind)) {
    return {
      ok: false,
      reason:
        kind === 'pdf'
          ? `${file.name}: this post type doesn't take PDFs`
          : kind === 'video'
            ? `${file.name}: this post type doesn't take video`
            : `${file.name}: this post type doesn't take images`,
    }
  }

  // Video is checked against our own ingest budget rather than the platform's
  // headline ceiling — see `MAX_VIDEO_UPLOAD_BYTES`. Rejecting here saves the
  // user a multi-hundred-megabyte upload that finalize would refuse anyway.
  if (kind === 'video') {
    if (!policy.video) {
      return { ok: false, reason: `${file.name}: this platform doesn't publish video` }
    }
    if (file.size > policy.video.maxFileSizeBytes) {
      const cap = formatBytes(policy.video.maxFileSizeBytes)
      return {
        ok: false,
        reason: policy.video.cappedByOgen
          ? `${file.name} is over the ${cap} video limit`
          : `${file.name} is larger than this platform allows (${cap})`,
      }
    }
    const format = videoFormatOf(file.type)
    if (file.type && !policy.video.allowedFormats.includes(format)) {
      return {
        ok: false,
        reason: `${file.name}: this platform doesn't accept ${format.toUpperCase()} video`,
      }
    }
    return { ok: true }
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
