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

describe('conditions the server reports', () => {
  it('words a refused extension', () => {
    // assets.go:323 — and `validateUploadFile`'s own copy of it.
    expect(message('only .md, .pdf and image files are accepted')).toBe(
      'uploads.errors.type',
    )
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
