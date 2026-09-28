import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryWrapper } from '@/test/queryWrapper'
import type { Asset } from '@/types/content'

const api = vi.hoisted(() => ({
  regenerateAltText: vi.fn(),
  reextractImage: vi.fn(),
}))
vi.mock('@/services/api/content', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/content')>()),
  ...api,
}))

const { AssetImageView } = await import('./AssetImageView')

const asset = (over: Partial<Asset> = {}): Asset => ({
  id: 'img1',
  title: 'Workbench',
  content: 'A person at a workbench.',
  status: 'ready',
  type: 'IMG',
  alt_text: 'A person holding an implant',
  alt_text_edited_by_user: false,
  tag_ids: [],
  tags: [],
  created_by: 'u1',
  created_at: '2026-09-28T00:00:00Z',
  updated_at: '2026-09-28T00:00:00Z',
  file: {
    id: 'f1',
    original_name: 'bench.jpg',
    mime_type: 'image/jpeg',
    size_bytes: 1024,
    url: 'https://bucket.example/bench.jpg',
    width: 800,
    height: 600,
    is_animated: false,
  },
  ...over,
})

function renderView(a: Asset, onChange = vi.fn()) {
  render(
    <QueryWrapper>
      <AssetImageView asset={a} onChange={onChange} onDirty={() => {}} />
    </QueryWrapper>,
  )
  return onChange
}

beforeEach(() => {
  api.regenerateAltText.mockReset()
  api.reextractImage.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AssetImageView', () => {
  // The service writes the description and alt text first; a form mounted
  // early would seed empty fields and keep them empty.
  it('waits for an image still being read', () => {
    renderView(asset({ status: 'pending', alt_text: '', content: '' }))
    expect(screen.getByText('Reading this file')).toBeInTheDocument()
    expect(screen.queryByLabelText('Alt text')).not.toBeInTheDocument()
  })

  it('says when the alt text was written automatically', () => {
    renderView(asset())
    expect(
      screen.getByText(/Written automatically from the picture/),
    ).toBeInTheDocument()
  })

  it('does not call a person’s alt text automatic', () => {
    renderView(asset({ alt_text_edited_by_user: true }))
    expect(
      screen.queryByText(/Written automatically from the picture/),
    ).not.toBeInTheDocument()
  })

  /*
   * The server saves a regenerated alt text itself. Sending it back would be
   * harmless on its own — but the debounced save was built from the draft
   * before the regenerate, so it would put the old text over the new one.
   */
  it('shows a regenerated alt text and never sends it back', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.regenerateAltText.mockResolvedValue('A dentist at a workbench')
    const onChange = renderView(asset({ alt_text_edited_by_user: true }))

    fireEvent.change(screen.getByLabelText('Alt text'), {
      target: { value: 'typed' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Write a new one' }))
    expect(
      await screen.findByDisplayValue('A dentist at a workbench'),
    ).toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(600))
    for (const [payload] of onChange.mock.calls) {
      expect(payload).not.toHaveProperty('alt_text')
    }
  })

  it('sends the alt text once a person has typed in it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const onChange = renderView(asset())
    fireEvent.change(screen.getByLabelText('Alt text'), {
      target: { value: 'Mine' },
    })
    await act(() => vi.advanceTimersByTimeAsync(600))
    expect(onChange).toHaveBeenLastCalledWith({ alt_text: 'Mine' })
  })

  // No browser draws a HEIC; image-service's PNG of it is what can be shown.
  it('draws the normalized copy of a format browsers cannot', () => {
    renderView(
      asset({
        file: {
          ...asset().file!,
          mime_type: 'image/heic',
          url: 'https://bucket.example/bench.heic',
          normalized_url: 'https://bucket.example/normalized.png',
        },
      }),
    )
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://bucket.example/normalized.png',
    )
  })

  it('names a failed read and offers to read it again', async () => {
    api.reextractImage.mockResolvedValue(undefined)
    renderView(
      asset({
        status: 'failed',
        failure_code: 'service_unavailable',
        failure_reason: 'image processing is temporarily unavailable',
      }),
    )
    expect(
      screen.getByText(
        "Files like this can't be read right now. Try again in a few minutes.",
      ),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Read again' }))
    await waitFor(() => expect(api.reextractImage).toHaveBeenCalledWith('img1'))
  })
})
