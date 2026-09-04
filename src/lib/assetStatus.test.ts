import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import {
  UPLOAD_ACCEPT,
  uploadLimitLines,
  validateUploadFile,
} from './assetStatus'

/**
 * A `t` that echoes the key and whatever was interpolated into it, so these
 * tests assert what the copy is *told* rather than what English says today —
 * the sizes are the part that has to match the server.
 */
const t = ((key: string, vars?: Record<string, string>) =>
  `${key} ${JSON.stringify(vars ?? {})}`) as unknown as TFunction

/** A `File` of a given size without allocating the bytes. */
function file(name: string, sizeBytes: number): File {
  const f = new File(['x'], name)
  Object.defineProperty(f, 'size', { value: sizeBytes })
  return f
}

const MB = 1 << 20

describe('UPLOAD_ACCEPT', () => {
  // The picker matches the literal extension where the server sniffs the body,
  // so both spellings have to be offered or a `.jpeg` never reaches it.
  it('offers both spellings of JPEG', () => {
    expect(UPLOAD_ACCEPT).toContain('.jpg')
    expect(UPLOAD_ACCEPT).toContain('.jpeg')
  })

  it('offers exactly imageprobe.AllowedMIMEs, plus the documents', () => {
    expect(UPLOAD_ACCEPT).toBe('.md,.pdf,.jpg,.jpeg,.png,.webp,.gif')
  })
})

describe('uploadLimitLines', () => {
  it('names the image cap', () => {
    const lines = uploadLimitLines(t)
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('uploads.limitImages')
    expect(lines[1]).toContain('10 MB')
  })

  // Written into the copy, these would be two more places to forget when the
  // server's caps move.
  it('interpolates the document caps rather than stating them', () => {
    expect(uploadLimitLines(t)[0]).toContain('10 MB')
    expect(uploadLimitLines(t)[0]).toContain('50 MB')
  })

  // One string per line is the whole point: the caller breaks them, so no
  // separator character survives into the copy.
  it('keeps each limit a line of its own', () => {
    for (const line of uploadLimitLines(t)) expect(line).not.toContain('·')
  })
})

describe('validateUploadFile', () => {
  it('takes a markdown file up to 10 MB', () => {
    expect(validateUploadFile(file('brief.md', 9 * MB))).toEqual({
      ok: true,
      kind: 'md',
    })
  })

  it('takes a PDF up to 50 MB', () => {
    expect(validateUploadFile(file('deck.pdf', 49 * MB))).toEqual({
      ok: true,
      kind: 'pdf',
    })
  })

  it('takes every accepted image type', () => {
    for (const [name, ext] of [
      ['logo.png', 'png'],
      ['photo.JPG', 'jpg'],
      ['photo.jpeg', 'jpeg'],
      ['art.webp', 'webp'],
      ['loop.gif', 'gif'],
    ]) {
      expect(validateUploadFile(file(name, 1 * MB)), ext).toEqual({
        ok: true,
        kind: 'image',
      })
    }
  })

  // 10 MB, matching `maxImageSize` — not the PDF's 50 (CON-16 R11).
  it('holds an image to 10 MB rather than the PDF ceiling', () => {
    expect(validateUploadFile(file('huge.png', 11 * MB))).toEqual({
      ok: false,
      error: 'file exceeds maximum size of 10 MB',
    })
    expect(validateUploadFile(file('big.pdf', 11 * MB))).toEqual({
      ok: true,
      kind: 'pdf',
    })
  })

  it('still refuses a type nothing accepts', () => {
    expect(validateUploadFile(file('clip.mp4', 1 * MB))).toEqual({
      ok: false,
      error: 'only .md, .pdf and image files are accepted',
    })
  })

  // SVG is every brand kit's logo format and is deliberately not accepted:
  // `imageprobe` can't decode it and served inline it is an XSS vector
  // (CON-16 open question 3).
  it('refuses SVG, which imageprobe does not accept', () => {
    expect(validateUploadFile(file('logo.svg', 1024)).ok).toBe(false)
  })
})
