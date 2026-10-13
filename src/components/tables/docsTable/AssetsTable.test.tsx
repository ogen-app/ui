import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { i18next, loadLocaleResources } from '@/i18n'
import type { Idea } from '@/lib/ideas'
import type { Asset } from '@/types/content'

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
}))
const ideas = vi.hoisted(() => ({ current: [] as Idea[] }))
vi.mock('@/hooks/useIdeas', () => ({
  useIdeas: () => ({ ideas: ideas.current, isLoading: false, isError: false }),
}))

const { AssetsTable } = await import('./index')

const asset = (over: Partial<Asset>): Asset => ({
  id: 'a1',
  title: 'Positioning',
  content: 'one two three',
  status: 'ready',
  type: 'MD',
  alt_text: '',
  tag_ids: [],
  tags: [],
  analysis_status: 'ready',
  created_by: 'u1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
})

const idea = (over: Partial<Idea>): Idea => ({
  id: Math.random().toString(36),
  title: 'An idea',
  note: '',
  campaignId: null,
  verdict: null,
  createdAt: '2026-10-01T00:00:00Z',
  createdBy: null,
  decidedAt: null,
  decidedBy: null,
  remindAt: null,
  origin: 'asset_analysis',
  sourceAsset: { id: 'a1', title: 'Positioning' },
  ...over,
})

function show(assets: Asset[], campaignId: string | null = null) {
  return renderWithProviders(
    <AssetsTable assets={assets} campaignId={campaignId} onDelete={() => {}} />,
  )
}

beforeEach(() => {
  campaigns.current = []
  ideas.current = []
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
        title: 'riverside_olena_talks%20studio_0070.m4a',
        file: {
          id: 'f',
          original_name: 'x.m4a',
          mime_type: 'audio/mp4',
          size_bytes: 1,
          width: 0,
          height: 0,
          is_animated: false,
        },
      }),
      asset({
        id: 'a2',
        type: 'URL',
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
        status: 'partial',
        source_url: 'https://acme.com/a',
      }),
    ])
    expect(
      await screen.findByText('Partial — page cut short'),
    ).toBeInTheDocument()
  })

  it('reads in place while the analysis runs, with no ideas yet', async () => {
    ideas.current = [idea({})]
    await show([asset({ analysis_status: 'running' })])
    expect(await screen.findByText('Reading the document…')).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('draws the ideas as a verdict pill, each segment opening that pile', async () => {
    ideas.current = [
      idea({}),
      idea({}),
      idea({ verdict: 'yes' }),
      idea({ verdict: 'no' }),
      idea({ origin: 'manual' }),
    ]
    await show([asset({})])
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
      { id: 'c1', name: 'Beekeeping in Ukraine', asset_ids: ['a1'] },
      { id: 'c2', name: 'Finance Q4', asset_ids: ['a1'] },
    ]
    const { unmount } = await show([asset({})])
    expect(await screen.findByText('Beekeeping in Ukraine')).toBeInTheDocument()
    expect(screen.getByText('Finance Q4')).toBeInTheDocument()
    unmount()

    await show([asset({})], 'c1')
    expect(await screen.findByText('Also in')).toBeInTheDocument()
    expect(screen.queryByText('Beekeeping in Ukraine')).not.toBeInTheDocument()
    expect(screen.getByText('Finance Q4')).toBeInTheDocument()
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
    ideas.current = [
      idea({}),
      idea({ verdict: 'later', remindAt: '2099-01-01T00:00:00Z' }),
    ]
    await show([asset({})])
    expect(await screen.findByText('Título')).toBeInTheDocument()
    expect(screen.getByText('Campaña')).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: '1 sin decidir · 1 ahora no' }),
    ).toBeInTheDocument()
  })
})
