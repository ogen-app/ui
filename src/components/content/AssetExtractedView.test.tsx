import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryWrapper } from '@/test/queryWrapper'
import type { Asset, AssetChunkPage } from '@/types/content'

const api = vi.hoisted(() => ({ listAssetChunks: vi.fn() }))
vi.mock('@/services/api/content', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/content')>()),
  listAssetChunks: api.listAssetChunks,
}))

const { AssetExtractedView } = await import('./AssetExtractedView')

const asset = (over: Partial<Asset>): Asset => ({
  id: 'doc1',
  title: 'Q3 plan',
  // The placeholder every PDF and DOC is created with — never the text.
  content: '[]',
  status: 'ready',
  type: 'DOC',
  alt_text: '',
  tag_ids: [],
  tags: [],
  created_by: 'u1',
  created_at: '2026-09-28T00:00:00Z',
  updated_at: '2026-09-28T00:00:00Z',
  ...over,
})

const page = (chunks: AssetChunkPage['chunks'], total = chunks.length) => ({
  chunks,
  total,
  offset: 0,
  limit: 100,
})

const chunk = (
  over: Partial<AssetChunkPage['chunks'][number]>,
): AssetChunkPage['chunks'][number] => ({
  id: `c${over.chunk_index ?? 0}`,
  asset_id: 'doc1',
  chunk_index: 0,
  page_start: 0,
  page_end: 0,
  content: '',
  token_count: 10,
  ...over,
})

function renderView(a: Asset) {
  return render(
    <QueryWrapper>
      <AssetExtractedView
        asset={a}
        onTitleChange={() => {}}
        onDirty={() => {}}
      />
    </QueryWrapper>,
  )
}

describe('AssetExtractedView', () => {
  it('reads the text from the chunks, under the label each is cited by', async () => {
    api.listAssetChunks.mockResolvedValueOnce(
      page([
        chunk({
          chunk_index: 0,
          source_label: 'Slide 1',
          content: 'Launch dates',
        }),
        chunk({
          chunk_index: 1,
          source_label: "Sheet 'Q3' rows 10–24",
          content: 'Budget rows',
        }),
      ]),
    )
    renderView(asset({}))

    expect(await screen.findByText('Launch dates')).toBeInTheDocument()
    expect(screen.getByText('Slide 1')).toBeInTheDocument()
    expect(screen.getByText("Sheet 'Q3' rows 10–24")).toBeInTheDocument()
    // The placeholder is never shown as if it were the document.
    expect(screen.queryByText('[]')).not.toBeInTheDocument()
    expect(api.listAssetChunks).toHaveBeenCalledWith('doc1', 0, 100)
  })

  it('labels a PDF chunk by the pages it spans', async () => {
    api.listAssetChunks.mockResolvedValueOnce(
      page([
        chunk({ chunk_index: 0, page_start: 3, page_end: 3, content: 'one' }),
        chunk({ chunk_index: 1, page_start: 4, page_end: 6, content: 'two' }),
      ]),
    )
    renderView(asset({ type: 'PDF' }))

    expect(await screen.findByText('Page 3')).toBeInTheDocument()
    expect(screen.getByText('Pages 4–6')).toBeInTheDocument()
  })

  // Nothing to page while the service is still writing chunks.
  it('waits for a file still being read, without asking for its chunks', () => {
    api.listAssetChunks.mockClear()
    renderView(asset({ status: 'processing' }))

    expect(screen.getByText('Reading this file')).toBeInTheDocument()
    expect(api.listAssetChunks).not.toHaveBeenCalled()
  })

  it('says why a file failed, from its failure code', () => {
    renderView(
      asset({
        status: 'failed',
        failure_code: 'invalid_file',
        failure_reason:
          'the document could not be read (corrupt, encrypted, or unsupported)',
      }),
    )

    expect(screen.getByText("We couldn't read this file")).toBeInTheDocument()
    expect(
      screen.getByText("This file couldn't be read — it may be damaged."),
    ).toBeInTheDocument()
  })

  it('offers the next page when there are more chunks than came back', async () => {
    api.listAssetChunks.mockResolvedValueOnce(
      page([chunk({ chunk_index: 0, content: 'first' })], 240),
    )
    renderView(asset({}))

    expect(
      await screen.findByText('Showing 1 of 240 sections'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Show more' }),
    ).toBeInTheDocument()
  })

  it('reads a settled file with no text as empty, not failed', async () => {
    api.listAssetChunks.mockResolvedValueOnce(page([]))
    renderView(asset({ type: 'PDF' }))

    expect(
      await screen.findByText(
        'Nothing could be read from this file — it may only contain images.',
      ),
    ).toBeInTheDocument()
  })
})
