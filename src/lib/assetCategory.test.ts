import { describe, expect, it } from 'vitest'
import { assetCategory, opensAsDocument } from './assetCategory'
import type { AssetType } from '@/types/content'

describe('assetCategory', () => {
  it('files an upload under files', () => {
    expect(assetCategory({ type: 'PDF' })).toBe('files')
  })

  it('files an image under imagery', () => {
    expect(assetCategory({ type: 'IMG' })).toBe('imagery')
  })

  it('reads everything else as text', () => {
    expect(assetCategory({ type: 'MD' })).toBe('text')
    expect(assetCategory({ type: 'URL' })).toBe('text')
    expect(assetCategory({ type: null })).toBe('text')
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
