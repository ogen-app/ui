import { describe, expect, it } from 'vitest'
import { assetPreviewUrl } from './assetPreview'
import type { AssetFile, AssetImage } from '@/types/content'

const file = (thumbnail_url: string | null): AssetFile => ({
  id: 'f1',
  original_name: 'deck.pdf',
  mime_type: 'application/pdf',
  size_bytes: 1024,
  page_count: 12,
  thumbnail_url,
})

const image = (url: string, idx = 0): AssetImage => ({
  id: `i${idx}`,
  idx,
  source_url: `https://example.com/${idx}.png`,
  url,
  mime_type: 'image/png',
  size_bytes: 512,
})

describe('assetPreviewUrl', () => {
  it('shows the rendered first page of an upload', () => {
    expect(assetPreviewUrl({ file: file('https://cdn/thumb.png') })).toBe('https://cdn/thumb.png')
  })

  it('shows the first mirrored image of a scraped page', () => {
    expect(assetPreviewUrl({ images: [image('https://cdn/a.png', 0), image('https://cdn/b.png', 1)] })).toBe(
      'https://cdn/a.png',
    )
  })

  it('has nothing to show for a note', () => {
    expect(assetPreviewUrl({})).toBeNull()
  })

  // A PDF whose render failed still has a file row, so the file alone can't be
  // read as "there is a picture" — the row falls back to its kind instead.
  it('has nothing to show when the render failed', () => {
    expect(assetPreviewUrl({ file: file(null) })).toBeNull()
  })

  it('skips an image the storage never gave a URL', () => {
    expect(assetPreviewUrl({ images: [image(''), image('https://cdn/b.png', 1)] })).toBe(
      'https://cdn/b.png',
    )
  })

  // Both at once is not a case the backend produces today, but the page is the
  // document itself where an image off it is only part of one.
  it('prefers the page to an image from it', () => {
    expect(
      assetPreviewUrl({ file: file('https://cdn/thumb.png'), images: [image('https://cdn/a.png')] }),
    ).toBe('https://cdn/thumb.png')
  })
})
