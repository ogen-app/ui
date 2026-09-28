import { describe, expect, it } from 'vitest'
import { assetKind, assetScreen, tallyAssetKinds } from './assetKind'
import type { AssetType } from '@/types/content'

describe('assetKind', () => {
  it('files an upload under pdf', () => {
    expect(assetKind({ type: 'PDF' })).toBe('pdf')
  })

  it('files an image under image', () => {
    expect(assetKind({ type: 'IMG' })).toBe('image')
  })

  // CON-280/282 — both used to fall through to the note's glyph.
  it('files an office or text file under document', () => {
    expect(assetKind({ type: 'DOC' })).toBe('document')
  })

  it('files a recording under audio', () => {
    expect(assetKind({ type: 'AUDIO' })).toBe('audio')
  })

  // The kind the categories used to leave to the glyph to special-case.
  it('files a scraped page under page', () => {
    expect(assetKind({ type: 'URL' })).toBe('page')
  })

  it('reads markdown, an in-app note and an unknown type as text', () => {
    expect(assetKind({ type: 'MD' })).toBe('text')
    expect(assetKind({ type: null })).toBe('text')
    expect(assetKind({ type: 'VIDEO' as AssetType })).toBe('text')
  })
})

describe('tallyAssetKinds', () => {
  it('counts each kind', () => {
    expect(
      tallyAssetKinds([
        { type: 'MD' },
        { type: null },
        { type: 'PDF' },
        { type: 'IMG' },
        { type: 'IMG' },
      ]),
    ).toEqual([
      { kind: 'text', count: 2 },
      { kind: 'pdf', count: 1 },
      { kind: 'image', count: 2 },
    ])
  })

  // Fixed order, whatever order the library arrived in — the row is meant to
  // be recognised at a glance rather than read.
  it('keeps the reading order regardless of the input order', () => {
    expect(
      tallyAssetKinds([{ type: 'IMG' }, { type: 'URL' }, { type: 'MD' }]).map(
        (entry) => entry.kind,
      ),
    ).toEqual(['text', 'page', 'image'])
  })

  it('drops the kinds nothing falls into', () => {
    expect(tallyAssetKinds([{ type: 'PDF' }])).toEqual([
      { kind: 'pdf', count: 1 },
    ])
    expect(tallyAssetKinds([])).toEqual([])
  })
})

describe('assetScreen', () => {
  it('opens a note, a markdown upload and a scraped page in the editor', () => {
    expect(assetScreen({ type: null })).toBe('editor')
    expect(assetScreen({ type: 'MD' })).toBe('editor')
    expect(assetScreen({ type: 'URL' })).toBe('editor')
  })

  /*
   * The server refuses a changed `content` on both (CON-312), so an editor on
   * either would fail every keystroke — and their `content` is a placeholder
   * anyway, the text living in the chunks.
   */
  it('shows a PDF and an office document read-only', () => {
    expect(assetScreen({ type: 'PDF' })).toBe('extracted')
    expect(assetScreen({ type: 'DOC' })).toBe('extracted')
  })

  /*
   * An image's `content` is a description of the picture, so an editor
   * pointed at it is editing the wrong field — and autosaving over it
   * (CON-16 R32).
   */
  it('gives an image and a recording screens of their own', () => {
    expect(assetScreen({ type: 'IMG' })).toBe('image')
    expect(assetScreen({ type: 'AUDIO' })).toBe('audio')
  })

  /*
   * The case the function exists for. The cast stands in for a server that
   * has grown a type this build was compiled before, which is how `URL`, `IMG`,
   * `DOC` and `AUDIO` all arrived: failing closed has to be the default, not a
   * list of the exceptions we happened to think of.
   */
  it('refuses a type this build has never heard of', () => {
    expect(assetScreen({ type: 'VIDEO' as AssetType })).toBe('unsupported')
  })
})
