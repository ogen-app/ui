import { describe, expect, it } from 'vitest'
import { assetPreviewUrl } from './assetPreview'
import type { AssetFile, AssetImage } from '@/types/content'

const file = (thumbnail_url: string | null): AssetFile => ({
  id: 'f1',
  original_name: 'deck.pdf',
  mime_type: 'application/pdf',
  size_bytes: 1024,
  page_count: 12,
  // Every stored file has a URL now, a PDF's included — which is exactly what
  // stops the fallback below from being "use `url` when there is no thumbnail".
  url: 'https://cdn/deck.pdf',
  thumbnail_url,
  width: 0,
  height: 0,
  is_animated: false,
})

const imageFile = (url: string | null): AssetFile => ({
  id: 'f2',
  original_name: 'logo.png',
  mime_type: 'image/png',
  size_bytes: 2048,
  url,
  width: 800,
  height: 600,
  is_animated: false,
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
    expect(assetPreviewUrl({ file: file('https://cdn/thumb.png') })).toBe(
      'https://cdn/thumb.png',
    )
  })

  it('shows the first mirrored image of a scraped page', () => {
    expect(
      assetPreviewUrl({
        images: [image('https://cdn/a.png', 0), image('https://cdn/b.png', 1)],
      }),
    ).toBe('https://cdn/a.png')
  })

  it('shows an uploaded image itself', () => {
    expect(assetPreviewUrl({ file: imageFile('https://cdn/logo.png') })).toBe(
      'https://cdn/logo.png',
    )
  })

  it('has nothing to show for a note', () => {
    expect(assetPreviewUrl({})).toBeNull()
  })

  // A PDF whose render failed still has a file row, and that row now carries a
  // URL for the PDF itself — which an `<img>` cannot draw. The media type is
  // what keeps the image fallback off it.
  it('has nothing to show when the render failed', () => {
    expect(assetPreviewUrl({ file: file(null) })).toBeNull()
  })

  it('has nothing to show for an image storage never took', () => {
    expect(assetPreviewUrl({ file: imageFile(null) })).toBeNull()
  })

  it('skips an image the storage never gave a URL', () => {
    expect(
      assetPreviewUrl({ images: [image(''), image('https://cdn/b.png', 1)] }),
    ).toBe('https://cdn/b.png')
  })

  // Both at once is not a case the backend produces today, but the page is the
  // document itself where an image off it is only part of one.
  it('prefers the page to an image from it', () => {
    expect(
      assetPreviewUrl({
        file: file('https://cdn/thumb.png'),
        images: [image('https://cdn/a.png')],
      }),
    ).toBe('https://cdn/thumb.png')
  })
})
