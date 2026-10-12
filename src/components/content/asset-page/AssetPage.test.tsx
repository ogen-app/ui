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

function renderPage(a: Asset, campaignId: string | null = null) {
  return renderWithProviders(
    <AssetPage
      asset={a}
      campaignId={campaignId}
      lens={undefined}
      onLensChange={() => {}}
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

  it('answers a campaign with no analysis row as not analysed', async () => {
    campaigns.current = [{ id: 'c1', name: 'Old campaign', asset_ids: ['a1'] }]
    api.listAssetAnalyses.mockResolvedValue([workspaceLens()])
    await renderPage(asset(), 'c1')
    expect(await screen.findByText('Not analysed')).toBeInTheDocument()
    expect(screen.getAllByText('Old campaign').length).toBeGreaterThan(0)
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

    expect(await screen.findByText('Sheets read')).toBeInTheDocument()
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
})
