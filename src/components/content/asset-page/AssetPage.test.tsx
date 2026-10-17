import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import type { Asset, AssetChunkPage } from '@/types/content'

const api = vi.hoisted(() => ({
  listAssetAnalyses: vi.fn(),
  listAssetChunks: vi.fn(),
}))
vi.mock('@/services/api/content', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/content')>()),
  listAssetAnalyses: api.listAssetAnalyses,
  listAssetChunks: api.listAssetChunks,
}))

const campaigns = vi.hoisted(() => ({ current: [] as unknown[] }))
vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: () => ({ data: campaigns.current, isSuccess: true }),
}))
vi.mock('@/hooks/useWorkspaces', () => ({
  useWorkspaceMembers: () => ({ data: [{ id: 'u1', name: 'Anna K.' }] }),
}))

const { AssetPage } = await import('./AssetPage')

const asset = (over: Partial<Asset> = {}): Asset => ({
  id: 'a1',
  title: 'Q3 Pipeline Review',
  content: '[]',
  status: 'ready',
  type: 'PDF',
  alt_text: '',
  tag_ids: [],
  tags: [],
  created_by: 'u1',
  created_at: '2026-10-12T10:00:00Z',
  updated_at: '2026-10-12T10:00:00Z',
  ...over,
})

const workspaceLens = (over: Partial<AssetAnalysis> = {}): AssetAnalysis => ({
  id: 'an-1',
  asset_id: 'a1',
  campaign_id: null,
  campaign_name: null,
  status: 'ready',
  strategy: 'full',
  summary: 'The workspace reading.',
  language: 'en',
  key_points: [],
  topics: [],
  entities: [],
  relevance: null,
  partial_source: false,
  truncated: false,
  failure_code: '',
  failure_reason: '',
  analyzed_at: '2026-10-12T10:00:00Z',
  ideas: [],
  ...over,
})

function renderPage(
  a: Asset,
  campaignId: string | null = null,
  place: { at?: string; onPlaceReached?: () => void } = {},
) {
  return renderWithProviders(
    <AssetPage
      asset={a}
      campaignId={campaignId}
      lens={undefined}
      onLensChange={() => {}}
      {...place}
      source={<p>legacy source</p>}
      onTitleChange={() => {}}
      onDirty={() => {}}
    />,
  )
}

beforeEach(() => {
  campaigns.current = []
  api.listAssetAnalyses.mockReset()
  api.listAssetChunks.mockReset()
})

describe('AssetPage', () => {
  it('shows the creator and the workspace reading', async () => {
    api.listAssetAnalyses.mockResolvedValue([workspaceLens()])
    await renderPage(asset())
    expect(
      await screen.findByText('The workspace reading.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Anna K.')).toBeInTheDocument()
  })

  it('draws a deck as its outline of slides', async () => {
    api.listAssetChunks.mockResolvedValue({
      offset: 0,
      limit: 100,
      total: 1,
      chunks: [
        {
          id: 'k0',
          asset_id: 'a1',
          chunk_index: 0,
          page_start: 0,
          page_end: 0,
          source_label: 'Slides 1-2',
          source_anchor: { kind: 'slide', slide: 1 },
          content: 'Slide 1\nQ3 launch\n\nSlide 2\nPricing',
          token_count: 5,
        },
      ],
    })
    api.listAssetAnalyses.mockResolvedValue([workspaceLens()])
    await renderPage(
      asset({
        type: 'DOC',
        file: {
          id: 'f1',
          original_name: 'launch.pptx',
          mime_type:
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          size_bytes: 2_000_000,
          width: 0,
          height: 0,
          is_animated: false,
        },
      }),
    )
    expect(await screen.findByText('Q3 launch')).toBeInTheDocument()
    expect(screen.getByText('Pricing')).toBeInTheDocument()
    expect(screen.getByText('Slides')).toBeInTheDocument()
  })

  it('names a web page by its domain, update and images', async () => {
    api.listAssetAnalyses.mockResolvedValue([workspaceLens()])
    await renderPage(
      asset({
        type: 'URL',
        source_url: 'https://acme.com/blog/launch',
        images: [
          {
            id: 'i1',
            idx: 0,
            source_url: 'https://acme.com/a.png',
            url: 'https://cdn/a.png',
            mime_type: 'image/png',
            size_bytes: 1,
          },
        ],
      }),
    )
    expect(await screen.findByText('Updated')).toBeInTheDocument()
    expect(screen.getByText('Images')).toBeInTheDocument()
  })

  it('answers a campaign with no analysis row as not analysed', async () => {
    campaigns.current = [{ id: 'c1', name: 'Old campaign', asset_ids: ['a1'] }]
    api.listAssetAnalyses.mockResolvedValue([workspaceLens()])
    await renderPage(asset(), 'c1')
    expect(await screen.findByText('Not analysed')).toBeInTheDocument()
    expect(screen.getAllByText('Old campaign').length).toBeGreaterThan(0)
  })

  it('offers no lens picker when only the workspace has read it', async () => {
    api.listAssetAnalyses.mockResolvedValue([workspaceLens()])
    await renderPage(asset())
    expect(
      await screen.findByText('Read for your workspace'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('titles a file-named asset in words and marks the open campaign', async () => {
    campaigns.current = [
      { id: 'c1', name: 'Spring launch', asset_ids: ['a1'] },
      { id: 'c2', name: 'Autumn push', asset_ids: ['a1'] },
    ]
    api.listAssetAnalyses.mockResolvedValue([
      workspaceLens(),
      workspaceLens({
        id: 'an-2',
        campaign_id: 'c1',
        campaign_name: 'Spring launch',
      }),
    ])
    await renderPage(asset({ title: 'q3_pipeline_review.pdf' }), 'c1')
    expect(
      await screen.findByDisplayValue('q3 pipeline review'),
    ).toBeInTheDocument()
    const open = screen
      .getAllByRole('link')
      .find((l) => l.getAttribute('aria-current') === 'true')
    expect(open).toHaveTextContent('Spring launch')
  })

  it('opens a spreadsheet idea’s rows in the sheet table', async () => {
    const page: AssetChunkPage = {
      offset: 0,
      limit: 100,
      total: 2,
      chunks: [
        {
          id: 'k0',
          asset_id: 'a1',
          chunk_index: 0,
          page_start: 0,
          page_end: 0,
          source_label: 'Sheet "Pipeline" summary',
          source_anchor: {
            kind: 'sheet',
            sheet: 'Pipeline',
            cell_range: 'A1:B3',
          },
          content: 'Sheet "Pipeline" — columns: Deal, Value. 2 data rows.',
          token_count: 5,
        },
        {
          id: 'k1',
          asset_id: 'a1',
          chunk_index: 1,
          page_start: 0,
          page_end: 0,
          source_label: 'Sheet "Pipeline" rows 2-3',
          source_anchor: {
            kind: 'sheet',
            sheet: 'Pipeline',
            cell_range: 'A2:B3',
          },
          content: 'Deal: Contoso | Value: €120k\nDeal: Litware | Value: €96k',
          token_count: 5,
        },
      ],
    }
    api.listAssetChunks.mockResolvedValue(page)
    api.listAssetAnalyses.mockResolvedValue([
      workspaceLens({
        ideas: [
          {
            id: 'i1',
            title: 'Bigger deals',
            note: 'Angle\n\nWhy\n\nSources: Sheet "Pipeline" rows 3-3',
            campaign_id: null,
            verdict: null,
            created_at: '2026-10-12T10:00:00Z',
            created_by: null,
            decided_at: null,
            decided_by: null,
            remind_at: null,
          },
        ],
      }),
    ])
    await renderPage(
      asset({
        type: 'DOC',
        file: {
          id: 'f1',
          original_name: 'q3.xlsx',
          mime_type:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size_bytes: 48_000,
          width: 0,
          height: 0,
          is_animated: false,
        },
      }),
    )

    expect(await screen.findByText('What it covers')).toBeInTheDocument()
    expect(
      screen.getAllByText('Sheets').some((el) => el.tagName === 'DT'),
    ).toBe(true)
    fireEvent.click(screen.getByText('Bigger deals'))
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Show Pipeline · row 3 in the sheet',
      }),
    )
    expect(
      await screen.findByText(/cited by “Bigger deals”/),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('table')).getByText('Litware').closest('tr'),
    ).toHaveClass('bg-warning/10')
  })

  it('opens the Source tab at the page an idea cites (?at=), once', async () => {
    api.listAssetAnalyses.mockResolvedValue([workspaceLens()])
    api.listAssetChunks.mockResolvedValue({
      chunks: [],
      total: 0,
      offset: 0,
      limit: 50,
    } satisfies AssetChunkPage)
    const scrolled = vi.fn()
    Element.prototype.scrollIntoView = scrolled
    const onPlaceReached = vi.fn()
    await renderWithProviders(
      <>
        <AssetPage
          asset={asset()}
          campaignId={null}
          lens={undefined}
          onLensChange={() => {}}
          at="pp. 5–6"
          onPlaceReached={onPlaceReached}
          source={
            <ol>
              <li data-place data-page-from="1" data-page-to="4" />
              <li data-place data-page-from="5" data-page-to="8" id="p5" />
            </ol>
          }
          onTitleChange={() => {}}
          onDirty={() => {}}
        />
      </>,
    )

    expect(
      screen.getByRole('tab', { name: /Source/, selected: true }),
    ).toBeInTheDocument()
    await vi.waitFor(() => expect(onPlaceReached).toHaveBeenCalledTimes(1))
    expect(scrolled.mock.contexts[0]).toHaveProperty('id', 'p5')
  })

  it('reads on through the document until the cited page turns up', async () => {
    api.listAssetAnalyses.mockResolvedValue([workspaceLens()])
    const chunk = (i: number, from: number, to: number) => ({
      id: `c${i}`,
      asset_id: 'a1',
      chunk_index: i,
      page_start: from,
      page_end: to,
      content: `Pages ${from}–${to}`,
      token_count: 10,
    })
    api.listAssetChunks
      .mockResolvedValueOnce({
        chunks: [chunk(0, 1, 4)],
        total: 2,
        offset: 0,
        limit: 1,
      } satisfies AssetChunkPage)
      .mockResolvedValueOnce({
        chunks: [chunk(1, 5, 8)],
        total: 2,
        offset: 1,
        limit: 1,
      } satisfies AssetChunkPage)
    const scrolled = vi.fn()
    Element.prototype.scrollIntoView = scrolled
    const onPlaceReached = vi.fn()
    const { AssetExtractedView } = await import('../AssetExtractedView')
    const pdf = asset()
    await renderWithProviders(
      <AssetPage
        asset={pdf}
        campaignId={null}
        lens={undefined}
        onLensChange={() => {}}
        at="p. 6"
        onPlaceReached={onPlaceReached}
        source={<AssetExtractedView asset={pdf} />}
        onTitleChange={() => {}}
        onDirty={() => {}}
      />,
    )

    await vi.waitFor(() => expect(onPlaceReached).toHaveBeenCalledTimes(1))
    expect(api.listAssetChunks).toHaveBeenCalledTimes(2)
    expect(scrolled.mock.contexts[0]).toHaveProperty('dataset.pageFrom', '5')
  })
})
