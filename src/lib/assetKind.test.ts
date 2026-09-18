import { describe, expect, it } from 'vitest'
import { assetKind, opensAsDocument, tallyAssetKinds } from './assetKind'
import type { AssetType } from '@/types/content'

describe('assetKind', () => {
  it('files an upload under pdf', () => {
    expect(assetKind({ type: 'PDF' })).toBe('pdf')
  })

  it('files an image under image', () => {
    expect(assetKind({ type: 'IMG' })).toBe('image')
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

describe('opensAsDocument', () => {
  it('opens a note written in the app', () => {
    expect(opensAsDocument({ type: null })).toBe(true)
  })

  it('opens an uploaded markdown file', () => {
    expect(opensAsDocument({ type: 'MD' })).toBe(true)
  })

  // What you edit on a PDF is the extracted text, which is what the embeddings
  // are built from — so it is a document, whatever the bytes behind it are.
  it('opens a PDF, because its text is the asset', () => {
    expect(opensAsDocument({ type: 'PDF' })).toBe(true)
  })

  it('opens a scraped page', () => {
    expect(opensAsDocument({ type: 'URL' })).toBe(true)
  })

  /*
   * The case the predicate exists for. An image's `content` is a description
   * of the picture, so an editor pointed at it is editing the wrong field —
   * and autosaving over it (CON-16 R32).
   */
  it('refuses an image', () => {
    expect(opensAsDocument({ type: 'IMG' })).toBe(false)
  })

  /*
   * And the general case behind it. The cast stands in for a server that has
   * grown a type this build was compiled before, which is how `URL` and `IMG`
   * both arrived: failing closed has to be the default, not a list of the
   * exceptions we happened to think of.
   */
  it('refuses a type this build has never heard of', () => {
    expect(opensAsDocument({ type: 'VIDEO' as AssetType })).toBe(false)
  })
})
