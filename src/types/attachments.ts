// Post attachments (CON-73 images / CON-75 PDFs). Mirrors
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
  // Images only; 0 for PDFs.
  width: number
  height: number
  is_animated: boolean
  // PDFs only; 0 when pdf-service was unavailable at upload time.
  page_count: number
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
  /** First-page preview for PDFs, same TTL as `presigned_url`. */
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

export type AttachmentKind = 'image' | 'pdf' | 'other'

/** Mirrors `platforms.AttachmentKind` — the server keys rules off this. */
export function attachmentKind(mimeType: string): AttachmentKind {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  return 'other'
}
