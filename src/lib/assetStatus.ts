import type { TFunction } from 'i18next'
import type { AssetStatus } from '@/types/content'
import type { StatusTone } from '@/components/ui/status-badge'
import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * What a file becomes once uploaded, routed by its extension the way the server
 * routes it (`detectUploadKind` in `handlers/assets.go`). The extension is only
 * advisory there — each service sniffs the bytes — so this decides which
 * request a file goes out on and which cap it is held to, never what it is.
 *
 * `audio` goes out on a different request from the rest: presign, a PUT
 * straight to storage, finalize (`services/api/uploads`). The multipart
 * endpoint refuses an audio extension outright.
 */
export type UploadKind = 'md' | 'pdf' | 'document' | 'image' | 'audio'

const MB = 1 << 20
const GB = 1 << 30

/**
 * Per-kind upload caps, mirroring the Go backend.
 *
 * Images have none here, on purpose. Since CON-281 the image cap is set by the
 * operator (50 MB by default), so there is no number the client could hold that
 * would stay true — and a guess below it refuses files the server would take,
 * which is the one mistake a client-side check must not make. The server's
 * `too_large` names its own cap, and that is what the row shows.
 */
const UPLOAD_LIMITS: Record<UploadKind, number | null> = {
  md: 10 * MB,
  pdf: 50 * MB,
  // `maxDocumentUploadSize` — larger than markdown because a real .pptx
  // carries embedded media the parser discards but still receives.
  document: 50 * MB,
  image: null,
  // `maxAudioUploadBytes`, enforced at finalize against the stored object.
  audio: 5 * GB,
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
 * The server also caps an image's pixel dimensions, and that one is deliberately
 * not mirrored: knowing an image's dimensions before uploading it means decoding
 * it, and decoding every dropped file to pre-empt a refusal the server already
 * words well buys nothing. Its per-file `dimensions_exceeded` arrives in the
 * upload row like any other.
 */

/**
 * The extensions each kind is routed by — the keys of the server's
 * `imageUploadMIMEs`, `documentUploadMIMEs` and `audioUploadMIMEs`. Both
 * spellings of JPEG and TIFF are listed because the picker matches the literal
 * extension while the server sniffs the body, so leaving one out would refuse a
 * file the server would have taken.
 */
const EXTENSIONS: Record<UploadKind, readonly string[]> = {
  md: ['.md'],
  pdf: ['.pdf'],
  document: [
    '.docx',
    '.docm',
    '.dotx',
    '.xlsx',
    '.xlsm',
    '.xltx',
    '.pptx',
    '.pptm',
    '.potx',
    '.odt',
    '.ods',
    '.odp',
    '.fodt',
    '.fods',
    '.fodp',
    '.epub',
    '.csv',
    '.tsv',
    '.html',
    '.xhtml',
    '.eml',
    '.rtf',
    '.txt',
    '.log',
  ],
  image: [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.heic',
    '.heif',
    '.avif',
    '.tif',
    '.tiff',
    '.bmp',
  ],
  audio: [
    '.mp3',
    '.wav',
    '.m4a',
    '.aac',
    '.ogg',
    '.oga',
    '.opus',
    '.flac',
    '.webm',
    '.aif',
    '.aiff',
  ],
}

/**
 * Office files in the binary format that predates OOXML. document-service
 * can't read the OLE2 container, so the server refuses them — but as an
 * extension it has never heard of, which tells someone holding a perfectly good
 * Word file nothing about what to do. Named here so the refusal can say "save
 * it as .docx".
 */
const LEGACY_OFFICE = ['.doc', '.dot', '.xls', '.xlt', '.ppt', '.pot']

/** Whether this build uploads audio — see `content-bank-audio`. */
function audioUploads(): boolean {
  return isFeatureEnabled('content-bank-audio')
}

function uploadKinds(): UploadKind[] {
  const kinds: UploadKind[] = ['md', 'pdf', 'document', 'image']
  return audioUploads() ? [...kinds, 'audio'] : kinds
}

/** The extensions the file picker offers, as an `accept` attribute. */
export function uploadAccept(): string {
  return uploadKinds()
    .flatMap((kind) => EXTENSIONS[kind])
    .join(',')
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
export function uploadLimitLines(t: TFunction): string[] {
  const lines = [
    t('uploads.limitText', {
      md: capLabel(UPLOAD_LIMITS.md),
      pdf: capLabel(UPLOAD_LIMITS.pdf),
    }),
    t('uploads.limitDocuments', { size: capLabel(UPLOAD_LIMITS.document) }),
    t('uploads.limitImages'),
  ]
  if (audioUploads()) {
    lines.push(t('uploads.limitAudio', { size: capLabel(UPLOAD_LIMITS.audio) }))
  }
  return lines
}

/**
 * A cap, as the number it was set as: `10 MB`, `5 GB`, never `10.0 MB`.
 *
 * `formatBytes` keeps a decimal because it measures a file, where the tenth is
 * the difference between "just under" and "just over". A limit is a round
 * number somebody chose, and printing it to a decimal implies a precision the
 * rule does not have.
 */
function capLabel(bytes: number | null): string {
  if (bytes === null) return ''
  return bytes >= GB
    ? `${Math.round(bytes / GB)} GB`
    : `${Math.round(bytes / MB)} MB`
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot === -1 ? '' : filename.slice(dot).toLowerCase()
}

/** Maps a filename extension to an upload kind, or null if unsupported. */
function detectUploadKind(filename: string): UploadKind | null {
  const ext = extensionOf(filename)
  return uploadKinds().find((kind) => EXTENSIONS[kind].includes(ext)) ?? null
}

/**
 * Why a file did not upload: the machine-readable `code` when there is one,
 * and the prose beside it.
 *
 * The codes are the server's (`models/upload_code.go`, CON-281/312), so the
 * client's own refusals and the server's are worded by one table
 * (`lib/uploadError`) without it having to know which side spoke. The message
 * is kept for two reasons: a code this build predates falls back to it, and it
 * is where the server puts the numbers — a cap, a duration — that a code
 * deliberately leaves out.
 */
export type UploadFailure = { code?: string; message: string }

export type UploadValidation =
  { ok: true; kind: UploadKind } | { ok: false; failure: UploadFailure }

/**
 * Client-side guard that mirrors the backend's accepted types and size caps so
 * obviously-bad files fail instantly without a network round-trip. Each refusal
 * carries the code — and, where there is one, the message — the server would
 * have answered with for the same file.
 */
export function validateUploadFile(file: File): UploadValidation {
  const ext = extensionOf(file.name)
  const kind = detectUploadKind(file.name)
  if (!kind) {
    // SVG reaches the image branch on the server, which refuses it as vector
    // artwork rather than as an unknown extension; say the same thing here.
    if (ext === '.svg') {
      return {
        ok: false,
        failure: {
          code: 'vector_rejected',
          message: 'vector images are not supported',
        },
      }
    }
    return {
      ok: false,
      failure: {
        code: LEGACY_OFFICE.includes(ext)
          ? LEGACY_OFFICE_CODE
          : 'extension_not_allowed',
        message: 'this file type is not accepted',
      },
    }
  }
  const limit = UPLOAD_LIMITS[kind]
  if (limit !== null && file.size > limit) {
    return {
      ok: false,
      failure: {
        code: 'too_large',
        message: `file exceeds maximum size of ${capLabel(limit)}`,
      },
    }
  }
  return { ok: true, kind }
}

/**
 * The one refusal code that is ours rather than the server's: a legacy Office
 * file, which the server answers as `extension_not_allowed`. Never sent, only
 * read by `lib/uploadError`.
 */
export const LEGACY_OFFICE_CODE = 'legacy_office'

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
