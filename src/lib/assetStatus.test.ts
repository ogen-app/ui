import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TFunction } from 'i18next'
import {
  formatBytes,
  uploadAccept,
  uploadLimitLines,
  validateUploadFile,
} from './assetStatus'

const flags = vi.hoisted(() => ({ audio: false }))
vi.mock('@/config/featureFlags', () => ({
  isFeatureEnabled: (flag: string) =>
    flag === 'content-bank-audio' ? flags.audio : false,
}))

afterEach(() => {
  flags.audio = false
})

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
const GB = 1 << 30

describe('uploadAccept', () => {
  // The picker matches the literal extension where the server sniffs the body,
  // so both spellings have to be offered or a `.jpeg` never reaches it.
  it('offers both spellings of JPEG and TIFF', () => {
    const accept = uploadAccept().split(',')
    for (const ext of ['.jpg', '.jpeg', '.tif', '.tiff']) {
      expect(accept).toContain(ext)
    }
  })

  // `imageUploadMIMEs` and `documentUploadMIMEs` in handlers/assets.go.
  it('offers every extension the multipart endpoint routes', () => {
    const accept = uploadAccept().split(',')
    for (const ext of [
      '.md',
      '.pdf',
      '.heic',
      '.heif',
      '.avif',
      '.bmp',
      '.docx',
      '.xlsx',
      '.pptx',
      '.odt',
      '.epub',
      '.csv',
      '.html',
      '.eml',
      '.rtf',
      '.txt',
    ]) {
      expect(accept).toContain(ext)
    }
    expect(accept).toHaveLength(2 + 24 + 11)
  })

  it('offers no SVG and no legacy Office format', () => {
    const accept = uploadAccept().split(',')
    for (const ext of ['.svg', '.doc', '.xls', '.ppt']) {
      expect(accept).not.toContain(ext)
    }
  })

  // `content-bank-audio` — the upload is what the flag holds back.
  it('offers audio only while the flag is on', () => {
    expect(uploadAccept()).not.toContain('.mp3')
    flags.audio = true
    const accept = uploadAccept().split(',')
    for (const ext of ['.mp3', '.wav', '.m4a', '.flac', '.aiff']) {
      expect(accept).toContain(ext)
    }
  })
})

describe('uploadLimitLines', () => {
  // Written into the copy, these would be more places to forget when the
  // server's caps move.
  it('interpolates the caps rather than stating them', () => {
    const [text, documents] = uploadLimitLines(t)
    expect(text).toContain('10 MB')
    expect(text).toContain('50 MB')
    expect(documents).toContain('uploads.limitDocuments')
    expect(documents).toContain('50 MB')
  })

  // The operator sets it (CON-281); any number here would be a guess.
  it('states no cap for images', () => {
    expect(uploadLimitLines(t)[2]).toBe('uploads.limitImages {}')
  })

  it('adds the audio line, in gigabytes, only while the flag is on', () => {
    expect(uploadLimitLines(t)).toHaveLength(3)
    flags.audio = true
    const lines = uploadLimitLines(t)
    expect(lines).toHaveLength(4)
    expect(lines[3]).toContain('5 GB')
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
    for (const name of [
      'logo.png',
      'photo.JPG',
      'photo.jpeg',
      'art.webp',
      'loop.gif',
      'phone.HEIC',
      'scan.tiff',
      'modern.avif',
    ]) {
      expect(validateUploadFile(file(name, 1 * MB)), name).toEqual({
        ok: true,
        kind: 'image',
      })
    }
  })

  // The operator's cap, 50 MB by default — refusing at 10 would turn away
  // files the server takes.
  it('leaves the image cap to the server', () => {
    expect(validateUploadFile(file('huge.png', 40 * MB))).toEqual({
      ok: true,
      kind: 'image',
    })
  })

  it('takes an office or text file up to 50 MB', () => {
    for (const name of ['plan.docx', 'budget.xlsx', 'deck.pptx', 'rows.csv']) {
      expect(validateUploadFile(file(name, 49 * MB)), name).toEqual({
        ok: true,
        kind: 'document',
      })
    }
    expect(validateUploadFile(file('deck.pptx', 51 * MB))).toEqual({
      ok: false,
      failure: {
        code: 'too_large',
        message: 'file exceeds maximum size of 50 MB',
      },
    })
  })

  it('refuses audio as an unknown extension while the flag is off', () => {
    expect(validateUploadFile(file('call.mp3', 1 * MB))).toEqual({
      ok: false,
      failure: {
        code: 'extension_not_allowed',
        message: 'this file type is not accepted',
      },
    })
  })

  it('routes audio up to 5 GB once the flag is on', () => {
    flags.audio = true
    expect(validateUploadFile(file('call.m4a', 4 * GB))).toEqual({
      ok: true,
      kind: 'audio',
    })
    expect(validateUploadFile(file('call.m4a', 6 * GB))).toMatchObject({
      ok: false,
      failure: { code: 'too_large' },
    })
  })

  it('still refuses a type nothing accepts', () => {
    expect(validateUploadFile(file('clip.mp4', 1 * MB))).toMatchObject({
      ok: false,
      failure: { code: 'extension_not_allowed' },
    })
  })

  // The server routes SVG to the image branch just to refuse it as vector
  // artwork; the client says the same thing before the round-trip.
  it('refuses SVG as vector artwork', () => {
    expect(validateUploadFile(file('logo.svg', 1024))).toMatchObject({
      ok: false,
      failure: { code: 'vector_rejected' },
    })
  })

  it('names a legacy Office file so the refusal can say what to do', () => {
    for (const name of ['old.doc', 'old.xls', 'old.PPT']) {
      expect(validateUploadFile(file(name, 1024)), name).toMatchObject({
        ok: false,
        failure: { code: 'legacy_office' },
      })
    }
  })
})

describe('formatBytes', () => {
  it('names the unit the figure is actually in', () => {
    // It measured one file against a per-file cap until the storage allowance
    // started coming through it (CON-232), and an allowance is where the units
    // run out: a plan granting ten gigabytes read "10240.0 MB".
    expect(formatBytes(900)).toBe('900 B')
    expect(formatBytes(2 * 1024)).toBe('2 KB')
    expect(formatBytes(1.4 * 1024 * 1024)).toBe('1.4 MB')
    expect(formatBytes(10 * 1024 * 1024 * 1024)).toBe('10.0 GB')
  })
})
