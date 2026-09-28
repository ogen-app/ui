import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import { uploadErrorMessage } from './uploadError'

/**
 * The messages this maps are **the server's**, copied here from the Go that
 * composes them — `handlers/assets.go`'s per-file results and the
 * `imageprobe`/`pdfprobe` errors it passes through verbatim. That is what these
 * tests are for: the mapping is prose-matching, so the only thing that can
 * catch a drift is a fixture that says where each string came from.
 *
 * A `t` that echoes its key and vars, so the assertions are about which copy
 * was chosen and what was lifted out of the message — never about the English,
 * which is the catalogue's business and is what `localisation` tests render.
 */
const t = ((key: string, vars?: Record<string, string>) =>
  vars ? `${key} ${JSON.stringify(vars)}` : key) as unknown as TFunction

const message = (raw: string) => uploadErrorMessage(t, raw)

describe('a result carrying a code', () => {
  const coded = (code: string, raw = '') =>
    uploadErrorMessage(t, { code, message: raw })

  it('chooses the sentence by code, not by prose', () => {
    expect(coded('extension_not_allowed', 'anything at all')).toBe(
      'uploads.errors.type',
    )
    expect(coded('vector_rejected')).toBe('uploads.errors.vector')
    expect(coded('empty_file')).toBe('uploads.errors.empty')
    expect(coded('quota_exceeded', 'media storage limit reached')).toBe(
      'uploads.errors.quota',
    )
    expect(coded('service_unavailable')).toBe('uploads.errors.unavailable')
    expect(coded('internal_error')).toBe('uploads.errors.server')
  })

  it('lifts the cap out of a too_large message', () => {
    expect(coded('too_large', 'file exceeds maximum size of 50 MB')).toBe(
      'uploads.errors.tooBig {"limit":"50 MB"}',
    )
    expect(coded('too_large', 'over the ceiling')).toBe(
      'uploads.errors.tooBigUnstated',
    )
  })

  // process_audio.go:318.
  it('lifts the plan limit out of a duration refusal', () => {
    expect(
      coded(
        'duration_exceeded',
        'audio is 95 min, over the 60 min limit for your plan',
      ),
    ).toBe('uploads.errors.duration {"count":60}')
  })

  // assets.go:707 — the server's code is the generic one, its prose names the fix.
  it('tells a legacy Office file apart from any other unsupported type', () => {
    expect(
      coded(
        'unsupported_media_type',
        'legacy binary or password-protected Office files are not supported — save as unprotected .docx/.xlsx/.pptx and re-upload',
      ),
    ).toBe('uploads.errors.legacyOffice')
    expect(coded('unsupported_media_type', 'unsupported image type')).toBe(
      'uploads.errors.unsupportedType',
    )
    expect(coded('legacy_office')).toBe('uploads.errors.legacyOffice')
  })

  it('keeps the PDF wording for an unreadable PDF', () => {
    expect(coded('invalid_file', 'file is not a valid PDF')).toBe(
      'uploads.errors.notPdf',
    )
    expect(coded('invalid_file', 'the document could not be read')).toBe(
      'uploads.errors.invalid',
    )
  })

  it('falls back to the prose for a code it does not know', () => {
    expect(coded('some_future_code', 'imageprobe: some future refusal')).toBe(
      'Some future refusal',
    )
  })
})

describe('conditions the server reports', () => {
  it('words a refused extension', () => {
    // assets.go:496, before and after CON-280 widened the list.
    expect(message('only .md, .pdf and image files are accepted')).toBe(
      'uploads.errors.type',
    )
    expect(
      message(
        'only .md, .pdf, image, and office/text document files are accepted',
      ),
    ).toBe('uploads.errors.type')
  })

  it('words a sniffed body without repeating the MIME at the reader', () => {
    // imageprobe.go:80 — `%w: %s` over ErrUnsupportedMIME.
    expect(
      message('imageprobe: unsupported media type: text/plain; charset=utf-8'),
    ).toBe('uploads.errors.unsupportedType')
  })

  it('takes the cap from the message rather than restating it', () => {
    // assets.go:359/412/517 — one string, three different caps.
    expect(message('file exceeds maximum size of 50 MB')).toBe(
      'uploads.errors.tooBig {"limit":"50 MB"}',
    )
  })

  it('turns imageprobe’s bytes into the same sentence', () => {
    // imageprobe.go:70 words the identical refusal in bytes.
    expect(message('imageprobe: file exceeds limit of 10485760 bytes')).toBe(
      'uploads.errors.tooBig {"limit":"10.0 MB"}',
    )
  })

  it('takes the dimension cap from the message too', () => {
    // assets.go:546. The client deliberately does not mirror maxImageDimension,
    // so the only place the number can come from is the refusal itself.
    expect(message('image dimensions exceed 8192×8192 px')).toBe(
      'uploads.errors.dimensions {"max":"8192×8192 px"}',
    )
  })

  it('words an empty file', () => {
    expect(message('imageprobe: empty file')).toBe('uploads.errors.empty')
  })

  it('words a file that is not a PDF', () => {
    expect(message('file is not a valid PDF')).toBe('uploads.errors.notPdf')
  })

  it('blames the deployment when storage is unconfigured', () => {
    expect(message('image uploads are not configured')).toBe(
      'uploads.errors.notConfigured',
    )
  })

  it('words an image it could not decode', () => {
    expect(message('imageprobe: decode header: unexpected EOF')).toBe(
      'uploads.errors.undecodable',
    )
    expect(message('imageprobe: decode gif: invalid block size')).toBe(
      'uploads.errors.undecodable',
    )
  })

  it('says nothing about the file when our side failed', () => {
    // Nothing the reader does to the file helps, so all five become one
    // sentence whose only advice is to try again.
    for (const raw of [
      'could not read file',
      'could not generate id',
      'could not create asset',
      'could not store pdf',
      'could not store image',
    ]) {
      expect(message(raw)).toBe('uploads.errors.server')
    }
    expect(message('imageprobe: read: unexpected EOF')).toBe(
      'uploads.errors.server',
    )
  })
})

describe('a message this build has never seen', () => {
  /*
   * The failure mode that matters. Matching prose means a server rewording
   * falls through — so what it falls through *to* is the whole safety of the
   * approach, and it has to be no worse than showing the raw string.
   */
  it('drops the Go package that raised it', () => {
    expect(message('imageprobe: some future refusal')).toBe(
      'Some future refusal',
    )
    expect(message('pdfprobe: something else entirely')).toBe(
      'Something else entirely',
    )
  })

  it('leaves a message that was already a sentence alone', () => {
    expect(message('The bucket rejected it')).toBe('The bucket rejected it')
  })

  it('does not mistake a colon inside prose for a package prefix', () => {
    expect(message('Refused for two reasons: size and kind')).toBe(
      'Refused for two reasons: size and kind',
    )
  })
})
