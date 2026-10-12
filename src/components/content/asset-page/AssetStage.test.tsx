import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Asset } from '@/types/content'
import { AssetStage } from './AssetStage'

const pdf = (): Asset => ({
  id: 'a1',
  title: 'Report',
  content: '[]',
  status: 'ready',
  type: 'PDF',
  alt_text: '',
  tag_ids: [],
  tags: [],
  created_by: 'u1',
  created_at: '2026-10-12T10:00:00Z',
  updated_at: '2026-10-12T10:00:00Z',
  file: {
    id: 'f1',
    original_name: 'report.pdf',
    mime_type: 'application/pdf',
    size_bytes: 325_000,
    page_count: 17,
    url: 'https://cdn/report.pdf',
    thumbnail_url: 'https://cdn/thumbnail.png',
    width: 0,
    height: 0,
    is_animated: false,
  },
})

function renderStage(asset: Asset) {
  return render(
    <AssetStage
      asset={asset}
      audioRef={createRef<HTMLAudioElement>()}
      onAudioTime={() => {}}
    />,
  )
}

describe('AssetStage', () => {
  it('draws a PDF by its cover', () => {
    const { container } = renderStage(pdf())
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn/thumbnail.png',
    )
  })

  it('falls back to the tile when the cover will not load', () => {
    const { container } = renderStage(pdf())
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('pdf')).toBeInTheDocument()
    expect(screen.getByText('report.pdf')).toBeInTheDocument()
  })
})
