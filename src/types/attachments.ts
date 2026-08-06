// Post attachments (CON-73 images / CON-75 PDFs / CON-148 video). Mirrors
// `src/models/post_attachment.go` and the `attachmentResponse` /
// `listResponse` wrappers in `src/handlers/post_attachments.go`.

/** One rule failure for an (attachment, platform) pair. */
export type PlatformValidationError = {
  platform: string
  // Empty for post-level rules (count cap, image+PDF mix).
  attachment_id: string
  rule: string
  expected: string
  actual: string
  message: string
}

export type PostAttachment = {
  id: string
  post_id: string
  position: number
  mime_type: string
  size_bytes: number
  // Frame size for video, pixel size for images; 0 for PDFs.
  width: number
  height: number
  is_animated: boolean
  // PDFs only; 0 when pdf-service was unavailable at upload time.
  page_count: number
  /**
   * Video only, from the video-service probe (CON-148). `0` and `''` mean
   * "not probed" — video-service was unreachable at finalize — never
   * "zero-length" or "no codec". Anything reading these has to tell the two
   * apart, because an unprobed video also skips the duration rules.
   */
  duration_ms: number
  codec: string
  checksum_sha256: string
  s3_key: string
  thumbnail_s3_key?: string
  created_by: string
  created_at: string
  /**
   * Short-lived (15 min) presigned GET URL, hydrated per response — not
   * stored. Absent when object storage is unconfigured. Never cache these
   * beyond the query's lifetime; refetch instead.
   */
  presigned_url?: string
  /**
   * First-page preview for PDFs and the poster frame for video, same TTL as
   * `presigned_url`. Absent for a video whose poster render failed — the
   * attachment is still valid.
   */
  thumbnail_url?: string
}

/** An attachment plus the soft pre-check for the post's current platform. */
export type PostAttachmentWithValidation = PostAttachment & {
  platform_validation: PlatformValidationError[]
}

export type AttachmentListResponse = {
  attachments: PostAttachmentWithValidation[]
  /** Post-level rules: count cap, image+PDF mix. */
  platform_validation: PlatformValidationError[]
}

export type AttachmentKind = 'image' | 'pdf' | 'video' | 'other'

/** Mirrors `platforms.AttachmentKind` — the server keys rules off this. */
export function attachmentKind(mimeType: string): AttachmentKind {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('video/')) return 'video'
  return 'other'
}
