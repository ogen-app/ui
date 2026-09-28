import type { TFunction } from 'i18next'
import {
  LEGACY_OFFICE_CODE,
  STORAGE_UPLOAD_FAILED_CODE,
  formatBytes,
  type UploadFailure,
} from '@/lib/assetStatus'

/**
 * An upload refusal, or an ingest failure, in the reader's language.
 *
 * Since CON-281/312 every refusal carries a stable `code` beside the prose the
 * server composed: on each `/upload` result, on a post attachment's error body,
 * and on a failed asset as `failure_code`. **The code decides which sentence**;
 * the prose is read for only two things. One is the numbers a code deliberately
 * leaves out — a cap, a duration limit — which are lifted out of the message
 * rather than restated, so a cap that moves on the server moves here without
 * touching a catalogue. The other is a code this build predates, which falls
 * through to matching the prose the way every refusal was worded before codes
 * existed.
 *
 * That fallback is still brittle in one direction only: a rewording falls
 * through to `humanise`, which strips a Go package prefix and shows what is
 * left. So the worst case is an untranslated line, never a wrong explanation.
 *
 * It also covers the client's own refusals: `validateUploadFile` answers with
 * the codes the server would have used, which is what lets one table word both
 * without knowing which side spoke.
 */
export function uploadErrorMessage(
  t: TFunction,
  failure: UploadFailure | string,
): string {
  const { code, message: raw } =
    typeof failure === 'string'
      ? { code: undefined, message: failure }
      : failure
  const message = raw.trim()

  switch (code) {
    case 'extension_not_allowed':
      return t('uploads.errors.type')
    case LEGACY_OFFICE_CODE:
      return t('uploads.errors.legacyOffice')
    case 'unsupported_media_type':
      // The server uses this code for a legacy or password-protected Office
      // container too, and that one has a fix worth stating.
      return LEGACY_PROSE.test(message)
        ? t('uploads.errors.legacyOffice')
        : t('uploads.errors.unsupportedType')
    case 'vector_rejected':
      return t('uploads.errors.vector')
    case 'too_large': {
      const limit = capFrom(message)
      return limit
        ? t('uploads.errors.tooBig', { limit })
        : t('uploads.errors.tooBigUnstated')
    }
    case 'empty_file':
      return t('uploads.errors.empty')
    case 'invalid_file':
      return /pdf/i.test(message)
        ? t('uploads.errors.notPdf')
        : t('uploads.errors.invalid')
    case 'dimensions_exceeded': {
      const max = message.match(/dimensions exceed (.+)$/i)?.[1]?.trim()
      return max
        ? t('uploads.errors.dimensions', { max })
        : t('uploads.errors.dimensionsUnstated')
    }
    case 'duration_exceeded': {
      const minutes = message.match(/over the (\d+) min limit/i)?.[1]
      return minutes
        ? t('uploads.errors.duration', { count: Number(minutes) })
        : t('uploads.errors.durationUnstated')
    }
    case 'quota_exceeded':
      return t('uploads.errors.quota')
    case 'service_unavailable':
      return t('uploads.errors.unavailable')
    case 'extraction_partial':
      return t('uploads.errors.partial')
    case 'internal_error':
      return t('uploads.errors.server')
    case STORAGE_UPLOAD_FAILED_CODE:
      return t('uploads.errors.storage')
  }

  return fromProse(t, message)
}

/** How the server words a legacy or password-protected Office file. */
const LEGACY_PROSE = /legacy binary or password-protected/i

/** "file exceeds maximum size of 50 MB" → `50 MB`; imageprobe's bytes too. */
function capFrom(message: string): string | null {
  const stated = message.match(/exceeds maximum size of (\d+ [MG]B)/i)
  if (stated) return stated[1]
  // The audio finalize's 413 (`headWithinCap`), in binary units.
  const gib = message.match(/maximum size of (\d+) GiB/i)
  if (gib) return `${gib[1]} GB`
  const bytes = message.match(/exceeds limit of (\d+) bytes/i)
  return bytes ? formatBytes(Number(bytes[1])) : null
}

/**
 * The refusal as the server worded it, for a result with no code this build
 * knows — a server older than CON-281, or a code added after this shipped.
 */
function fromProse(t: TFunction, message: string): string {
  if (/only \.md, \.pdf.* are accepted/i.test(message)) {
    return t('uploads.errors.type')
  }
  if (LEGACY_PROSE.test(message)) return t('uploads.errors.legacyOffice')

  // The body was sniffed and is not what the name claimed. The sniffed MIME is
  // in the message and deliberately dropped: `text/plain; charset=utf-8` names
  // the problem in a vocabulary the reader did not choose.
  if (/unsupported media type/i.test(message)) {
    return t('uploads.errors.unsupportedType')
  }

  const limit = capFrom(message)
  if (limit) return t('uploads.errors.tooBig', { limit })

  const tooBig = message.match(/dimensions exceed (.+)$/i)
  if (tooBig) return t('uploads.errors.dimensions', { max: tooBig[1].trim() })

  if (/empty file/i.test(message)) return t('uploads.errors.empty')
  if (/not a valid pdf/i.test(message)) return t('uploads.errors.notPdf')

  // Storage is unconfigured — a deployment fault, so it says so rather than
  // suggesting the file is at fault.
  if (/uploads are not configured/i.test(message)) {
    return t('uploads.errors.notConfigured')
  }

  // The bytes are an image the decoder could not finish reading: truncated, or
  // a GIF whose frames don't parse.
  if (/decode (header|gif)/i.test(message)) {
    return t('uploads.errors.undecodable')
  }

  // Everything the handler words as "could not …" is our side failing, plus
  // imageprobe's read error. Nothing about the file is wrong, so nothing the
  // reader does to the file will help — the only useful advice is to try again.
  if (/could not |: read: /i.test(message)) return t('uploads.errors.server')

  return humanise(message)
}

/**
 * The fallback: a message this build has never seen.
 *
 * Strips a leading Go package prefix (`imageprobe: `, `pdfprobe: `) so a
 * condition added server-side after this shipped still reads as a sentence
 * rather than as a stack trace, and capitalises what is left. It says nothing
 * about what went wrong, because it does not know.
 */
function humanise(message: string): string {
  const stripped = message.replace(/^[a-z][a-z0-9_]*: /, '')
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}
