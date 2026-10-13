import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { i18next, loadLocaleResources } from '@/i18n'
import type { AssetListItem } from '@/types/assetList'

// jsdom measures every box at zero, so the real virtualiser would draw no
// rows; this one draws them all, at their estimated height.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({
    count,
    estimateSize,
  }: {
    count: number
    estimateSize: () => number
  }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        key: i,
        start: i * estimateSize(),
        size: estimateSize(),
      })),
    getTotalSize: () => count * estimateSize(),
    measureElement: () => {},
  }),
}))

const campaigns = vi.hoisted(() => ({ current: [] as unknown[] }))
vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: () => ({ data: campaigns.current }),
  useArchivedCampaigns: () => ({ data: [] }),
}))

const { AssetsTable } = await import('./index')

const NO_IDEAS = { waiting: 0, yes: 0, later: 0, no: 0 }

const asset = (over: Partial<AssetListItem>): AssetListItem => ({
  id: 'a1',
  title: 'Positioning',
  type: 'MD',
  kind: 'note',
  status: 'ready',
  failure_code: '',
  source_url: null,
  analysis_status: 'ready',
  file: null,
  tags: [],
  campaign_ids: [],
  idea_counts: NO_IDEAS,
  gist: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
})

function show(assets: AssetListItem[], campaignId: string | null = null) {
  return renderWithProviders(
    <AssetsTable
      assets={assets}
      campaignId={campaignId}
      onDelete={() => {}}
      sort="-updated_at"
      onSortChange={() => {}}
    />,
  )
}

beforeEach(() => {
  campaigns.current = []
})

describe('AssetsTable', () => {
  it('says nothing for empty cells and a Ready status', async () => {
    await show([asset({})])
    expect(await screen.findByText('Positioning')).toBeInTheDocument()
    expect(screen.queryByText(/Not used/)).not.toBeInTheDocument()
    expect(screen.queryByText('No tags')).not.toBeInTheDocument()
    expect(screen.queryByText('Ready')).not.toBeInTheDocument()
    // Campaign, tags and ideas: a faint dash each, a word for a screen reader.
    expect(screen.getAllByText('None')).toHaveLength(3)
  })

  it('titles a file as words, and a page without its publisher', async () => {
    await show([
      asset({
        id: 'a1',
        type: 'AUDIO',
        kind: 'audio',
        title: 'riverside_olena_talks%20studio_0070.m4a',
        file: { mime_type: 'audio/mp4', duration_ms: 0 },
      }),
      asset({
        id: 'a2',
        type: 'URL',
        kind: 'web',
        title: 'Design Patterns for Serverless Systems - InfoQ',
        source_url: 'https://www.infoq.com/articles/serverless/',
      }),
    ])
    expect(
      await screen.findByText('riverside olena talks studio 0070'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Design Patterns for Serverless Systems'),
    ).toBeInTheDocument()
    expect(screen.getByText(/^infoq\.com/)).toBeInTheDocument()
  })

  it('says what went wrong only when something did', async () => {
    await show([
      asset({
        id: 'a1',
        type: 'URL',
        kind: 'web',
        status: 'partial',
        source_url: 'https://acme.com/a',
      }),
    ])
    expect(
      await screen.findByText('Partial — page cut short'),
    ).toBeInTheDocument()
  })

  it('reads in place while the analysis runs, with no ideas yet', async () => {
    await show([
      asset({
        analysis_status: 'running',
        idea_counts: { ...NO_IDEAS, waiting: 1 },
      }),
    ])
    expect(await screen.findByText('Reading the document…')).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('draws the ideas as a verdict pill, each segment opening that pile', async () => {
    await show([
      asset({ idea_counts: { waiting: 2, yes: 1, later: 0, no: 1 } }),
    ])
    const pill = await screen.findByRole('group', {
      name: '2 undecided · 1 yes · 1 no',
    })
    const undecided = within(pill).getByRole('link', { name: '2 undecided' })
    expect(undecided).toHaveAttribute('href', '/assets/a1?verdict=waiting')
    // No "not now" segment: a verdict with no ideas is left out.
    expect(within(pill).getAllByRole('link')).toHaveLength(3)
  })

  it('names the campaigns holding it, the others on a campaign’s own list', async () => {
    campaigns.current = [
      { id: 'c1', name: 'Beekeeping in Ukraine' },
      { id: 'c2', name: 'Finance Q4' },
    ]
    const held = asset({ campaign_ids: ['c1', 'c2'] })
    const { unmount } = await show([held])
    expect(await screen.findByText('Beekeeping in Ukraine')).toBeInTheDocument()
    expect(screen.getByText('Finance Q4')).toBeInTheDocument()
    unmount()

    await show([held], 'c1')
    expect(await screen.findByText('Also in')).toBeInTheDocument()
    expect(screen.queryByText('Beekeeping in Ukraine')).not.toBeInTheDocument()
    expect(screen.getByText('Finance Q4')).toBeInTheDocument()
  })

  it('shows where a text search matched, with the words marked', async () => {
    await show([
      asset({
        gist: 'A gist that the match replaces',
        match: {
          matches: 2,
          snippet: '…how bees &amp; <mark>overwintering</mark> colonies…',
          source_label: 'Page 14',
          chunk_index: 3,
        },
      }),
    ])
    const marked = await screen.findByText('overwintering')
    expect(marked.tagName).toBe('MARK')
    expect(screen.getByText('…how bees &')).toBeInTheDocument()
    expect(screen.getByText('Page 14 ·')).toBeInTheDocument()
    expect(
      screen.queryByText('A gist that the match replaces'),
    ).not.toBeInTheDocument()
  })

  it('asks the server for another order rather than re-sorting the page', async () => {
    const onSortChange = vi.fn()
    await renderWithProviders(
      <AssetsTable
        // Deliberately out of title order: the table must not reorder them.
        assets={[
          asset({ id: 'b', title: 'Zebra' }),
          asset({ id: 'a', title: 'Apple' }),
        ]}
        campaignId={null}
        onDelete={() => {}}
        sort="-updated_at"
        onSortChange={onSortChange}
      />,
    )
    const titles = await screen.findAllByText(/^(Zebra|Apple)$/)
    expect(titles.map((el) => el.textContent)).toEqual(['Zebra', 'Apple'])
    await userEvent.click(screen.getByRole('button', { name: 'Title' }))
    expect(onSortChange).toHaveBeenCalledWith('title')
    await userEvent.click(screen.getByRole('button', { name: 'Ideas' }))
    expect(onSortChange).toHaveBeenCalledWith('-ideas_undecided')
  })

  it('keeps the bin out of sight until the row is pointed at', async () => {
    await show([asset({})])
    expect(
      await screen.findByRole('button', { name: 'Delete Positioning' }),
    ).toHaveClass('opacity-0')
  })
})

describe('AssetsTable in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('reads its columns and the pill from the catalogue', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show([asset({ idea_counts: { ...NO_IDEAS, waiting: 1, later: 1 } })])
    expect(await screen.findByText('Título')).toBeInTheDocument()
    expect(screen.getByText('Campaña')).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: '1 sin decidir · 1 ahora no' }),
    ).toBeInTheDocument()
  })
})
