import type { TFunction } from 'i18next'
import type { AssetStatus } from '@/types/content'
import type { StatusTone } from '@/components/ui/status-badge'

export type UploadKind = 'md' | 'pdf' | 'image'

const MB = 1 << 20

/** Per-extension upload limits, mirroring the Go backend (assets.go). */
const UPLOAD_LIMITS: Record<UploadKind, number> = {
  md: 10 * MB,
  pdf: 50 * MB,
  // 10 MB is the number every image path the server has agrees on —
  // `POST /api/images`, post attachments, and now the asset upload
  // (`maxImageUploadSize`).
  image: 10 * MB,
}

/**
 * The server's cap on an image's alt text (`maxAltTextLen`), counted in code
 * points the way Go's `utf8.RuneCountInString` counts them — not UTF-16 units,
 * which is what a `maxLength` attribute would use and what would put an emoji
 * over the line half a limit early.
 *
 * Generous on purpose: it guards an unbounded column rather than expressing any
 * platform's idea of a good alt text.
 */
export const MAX_ALT_TEXT_CHARS = 2000

/*
 * The server also caps each side at 8192 px (`maxImageDimension`), and that one
 * is deliberately not mirrored: knowing an image's dimensions before uploading
 * it means decoding it, and decoding every dropped file to pre-empt a refusal
 * the server already words well buys nothing. Its per-file message arrives in
 * the upload row like any other.
 */

/**
 * Whether the Content Bank takes images: the `content-bank-images` flag
 * (CON-16), threaded in rather than read from the flag record in here. These
 * functions mirror server rules and are worth testing in both states without
 * reaching for global flag state.
 */
export type UploadOptions = { images: boolean }

/**
 * The extensions the file picker offers.
 *
 * Kept in step with `imageprobe.AllowedMIMEs` — JPEG, PNG, WebP, GIF (CON-16
 * R9). `.jpeg` is listed beside `.jpg` because the picker matches the literal
 * extension while the server sniffs the body, so leaving it out would reject a
 * file the server would have taken.
 */
export function uploadAccept({ images }: UploadOptions): string {
  return images ? '.md,.pdf,.jpg,.jpeg,.png,.webp,.gif' : '.md,.pdf'
}

/**
 * The limits, one line per kind of file.
 *
 * A list rather than a sentence because the caller decides how to separate
 * them, and every caller so far separates them with a line break. Joining them
 * here with a middle dot made one long line the eye has to parse before it can
 * find the number it came for.
 *
 * The sizes are interpolated from `UPLOAD_LIMITS` rather than written into the
 * copy, so a cap that moves on the server moves here in one place instead of in
 * every catalogue.
 */
export function uploadLimitLines(
  t: TFunction,
  { images }: UploadOptions,
): string[] {
  const lines = [
    t('uploads.limitDocs', {
      md: capLabel(UPLOAD_LIMITS.md),
      pdf: capLabel(UPLOAD_LIMITS.pdf),
    }),
  ]
  if (images) {
    lines.push(
      t('uploads.limitImages', { size: capLabel(UPLOAD_LIMITS.image) }),
    )
  }
  return lines
}

/**
 * A cap, as the number it was set as: `10 MB`, never `10.0 MB`.
 *
 * `formatBytes` keeps a decimal because it measures a file, where the tenth is
 * the difference between "just under" and "just over". A limit is a round
 * number somebody chose, and printing it to a decimal implies a precision the
 * rule does not have.
 */
function capLabel(bytes: number): string {
  return `${Math.round(bytes / MB)} MB`
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

/** Maps a filename extension to an upload kind, or null if unsupported. */
function detectUploadKind(
  filename: string,
  { images }: UploadOptions,
): UploadKind | null {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  if (ext === '.md') return 'md'
  if (ext === '.pdf') return 'pdf'
  if (images && IMAGE_EXTENSIONS.includes(ext)) return 'image'
  return null
}

export type UploadValidation =
  | { ok: true; kind: UploadKind }
  | { ok: false; error: string }

/**
 * Client-side guard that mirrors the backend's accepted types and size caps so
 * obviously-bad files fail instantly without a network round-trip. The error
 * strings match the messages the server returns for the same conditions.
 */
export function validateUploadFile(
  file: File,
  options: UploadOptions,
): UploadValidation {
  const kind = detectUploadKind(file.name, options)
  if (!kind) {
    return {
      ok: false,
      error: options.images
        ? 'only .md, .pdf and image files are accepted'
        : 'only .md and .pdf files are accepted',
    }
  }
  const limit = UPLOAD_LIMITS[kind]
  if (file.size > limit) {
    return {
      ok: false,
      error: `file exceeds maximum size of ${Math.round(limit / MB)} MB`,
    }
  }
  return { ok: true, kind }
}

/** Async statuses that will never change again. */
export function isTerminalStatus(status: AssetStatus): boolean {
  return status === 'ready' || status === 'partial' || status === 'failed'
}

const STATUS_BADGE: Record<AssetStatus, { tone: StatusTone; label: string }> = {
  pending: { tone: 'progress', label: 'Pending' },
  processing: { tone: 'progress', label: 'Processing' },
  ready: { tone: 'positive', label: 'Ready' },
  partial: { tone: 'warn', label: 'Partial' },
  failed: { tone: 'destructive', label: 'Failed' },
}

/** Tone + label for rendering an asset status as a StatusBadge. */
export function statusToBadge(status: AssetStatus): {
  tone: StatusTone
  label: string
} {
  return STATUS_BADGE[status] ?? { tone: 'neutral', label: status }
}

/** Compact human-readable file size, e.g. "1.4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}
