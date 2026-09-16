import type { TFunction } from 'i18next'
import { formatBytes } from '@/lib/assetStatus'

/**
 * An upload refusal, in the reader's language.
 *
 * `POST /api/content-bank/assets/upload` always answers 201 and reports each
 * file's fate in its own `results[]` row, so a refusal arrives as a **string
 * the server composed** — there is no code to switch on. Rendered as it stands
 * that string is English in a Spanish workspace, and for the image path it is
 * also Go: `imageprobe.Probe`'s errors are caller-facing and every one of them
 * carries the package name that raised it, so a reader who dropped a `.txt`
 * renamed `.png` is told `imageprobe: unsupported media type: text/plain;
 * charset=utf-8`.
 *
 * This maps the conditions the server can actually report onto catalogue copy,
 * and lifts any number out of the message it matched rather than restating it —
 * a cap that moves on the server moves here without touching a catalogue.
 *
 * **Matching English prose is the compromise, and it is deliberate.** It is
 * brittle in one direction only: a server rewording falls through to the
 * fallback, which strips the package prefix and shows what is left. So the
 * worst case is today's behaviour minus the Go, never a wrong explanation —
 * and an untranslated line is a strictly better failure than a mistranslated
 * one. The real fix is a stable `code` per result, which is an ask on the API
 * (`docs/open-questions.md`), not something the client can invent.
 *
 * It also covers the client's own refusals: `validateUploadFile` returns the
 * same two strings the server does for the same conditions, which is what lets
 * one table word both without knowing which side spoke.
 */
export function uploadErrorMessage(t: TFunction, raw: string): string {
  const message = raw.trim()

  // The kind was refused by the extension — ours, and the server's for a file
  // it never opened.
  if (/only \.md, \.pdf and image files are accepted/i.test(message)) {
    return t('uploads.errors.type')
  }

  // The body was sniffed and is not what the name claimed. The sniffed MIME is
  // in the message and deliberately dropped: `text/plain; charset=utf-8` names
  // the problem in a vocabulary the reader did not choose.
  if (/unsupported media type/i.test(message)) {
    return t('uploads.errors.unsupportedType')
  }

  const overCap = message.match(/exceeds maximum size of (\d+ MB)/i)
  if (overCap) return t('uploads.errors.tooBig', { limit: overCap[1] })

  // imageprobe words the same refusal in bytes.
  const overBytes = message.match(/exceeds limit of (\d+) bytes/i)
  if (overBytes) {
    return t('uploads.errors.tooBig', {
      limit: formatBytes(Number(overBytes[1])),
    })
  }

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
