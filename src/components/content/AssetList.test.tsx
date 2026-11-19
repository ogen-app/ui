import { useState } from 'react'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { BAND_TOP } from '@/components/page-primitives/pinnedBands'
import { i18next, loadLocaleResources } from '@/i18n'
import { useSettingsStore } from '@/stores/settingsStore'
import type { AssetGrouping } from '@/lib/assetFilter'
import type { AssetGroupCount, AssetListItem } from '@/types/assetList'

const campaigns = vi.hoisted(() => ({ current: [] as unknown[] }))
vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: () => ({ data: campaigns.current }),
  useArchivedCampaigns: () => ({ data: [] }),
}))

/** The asset's readings, each with its ideas — what the hover list reads. */
const analyses = vi.hoisted(() => ({ fn: vi.fn() }))
vi.mock('@/services/api/content', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/content')>()),
  listAssetAnalyses: analyses.fn,
}))

const { AssetList } = await import('./AssetList')
const { CardHead } = await import('@/components/page-primitives/listCards')

const NO_IDEAS = { waiting: 0, yes: 0, later: 0, no: 0 }

/** When the server answered: every date on screen is said against this. */
const AS_OF = Date.parse('2026-10-13T12:00:00Z')

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
  next_idea: null,
  published_at: null,
  created_at: '2026-10-13T11:58:00Z',
  updated_at: '2026-10-13T11:58:00Z',
  ...over,
})

function show(
  rows: AssetListItem[],
  {
    campaignId = null,
    grouping = 'none',
    groups = [],
    onToggleBand = () => {},
    selectedIds = new Set<string>(),
  }: {
    campaignId?: string | null
    grouping?: AssetGrouping
    groups?: AssetGroupCount[]
    onToggleBand?: (ids: string[]) => void
    selectedIds?: Set<string>
  } = {},
) {
  return renderWithProviders(
    <AssetList
      head={null}
      rows={rows}
      groups={groups}
      grouping={grouping}
      groupLabel={(key) => `band ${key}`}
      campaignId={campaignId}
      selectedIds={selectedIds}
      selecting={selectedIds.size > 0}
      onToggleRow={() => {}}
      onToggleBand={onToggleBand}
      asOf={AS_OF}
      onEndReached={() => {}}
      loadingMore={false}
    />,
  )
}

beforeEach(() => {
  campaigns.current = []
  useSettingsStore.setState({ collapsedAssetBands: [] })
})

describe('a row', () => {
  it('leads with the kind and the title, then one line of facts', async () => {
    await show([
      asset({
        type: 'PDF',
        kind: 'pdf',
        title: 'Hype_Cycle_for_AI.pdf',
        file: { mime_type: 'application/pdf', page_count: 94, duration_ms: 0 },
        published_at: '2025-08-01T00:00:00Z',
      }),
    ])
    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: 'Hype Cycle for AI',
      }),
    ).toBeInTheDocument()
    // The mark says it is a PDF; the facts line doesn't say it again.
    expect(screen.getByRole('img', { name: 'PDF' })).toBeInTheDocument()
    expect(screen.getByText('94 pages')).toBeInTheDocument()
    expect(screen.queryByText(/^PDF/)).not.toBeInTheDocument()
    // Added and published are two facts, each with its exact date as its
    // tooltip.
    expect(screen.getByText('added 2 minutes ago')).toBeInTheDocument()
    expect(
      screen.getByText('published last year').closest('[title]'),
    ).toHaveAttribute('title', expect.stringContaining('2025'))
  })

  it('says only when it was added, when the source never said when it was published', async () => {
    await show([asset({})])
    expect(await screen.findByText('added 2 minutes ago')).toBeInTheDocument()
    expect(screen.queryByText(/published/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Note/)).not.toBeInTheDocument()
  })

  it('titles a page without its publisher, and names its site', async () => {
    await show([
      asset({
        type: 'URL',
        kind: 'web',
        title: 'Design Patterns for Serverless Systems - InfoQ',
        source_url: 'https://www.infoq.com/articles/serverless/',
      }),
    ])
    expect(
      await screen.findByText('Design Patterns for Serverless Systems'),
    ).toBeInTheDocument()
    expect(screen.getByText('infoq.com')).toBeInTheDocument()
  })

  it('counts the ideas waiting at its end, opening their pile, every verdict its name', async () => {
    await show([
      asset({
        idea_counts: { waiting: 9, yes: 1, later: 0, no: 1 },
        next_idea: { id: 'i1', title: 'Which AI techniques are past the peak' },
      }),
    ])
    const link = await screen.findByRole('link', {
      name: '9 on the desk · 1 making · 1 set aside',
    })
    expect(link).toHaveTextContent('9 ideas →')
    expect(link).toHaveAttribute('href', '/assets/a1?verdict=waiting')
  })

  it('says nothing at its end once every idea is answered', async () => {
    await show([
      asset({ idea_counts: { waiting: 0, yes: 2, later: 0, no: 1 } }),
    ])
    await screen.findByText('Positioning')
    expect(screen.queryByText(/ideas →/)).not.toBeInTheDocument()
  })

  it('says it is still reading, with no ideas and no summary yet', async () => {
    await show([
      asset({
        status: 'processing',
        analysis_status: null,
        gist: 'Not yet',
        idea_counts: { ...NO_IDEAS, waiting: 1 },
      }),
    ])
    expect(await screen.findByText('Reading it…')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Reading it…' })).toBeInTheDocument()
    expect(screen.queryByText(/ideas →/)).not.toBeInTheDocument()
    expect(screen.queryByText('Not yet')).not.toBeInTheDocument()
  })

  it('says why a file failed, from its code, and what to do', async () => {
    await show([asset({ status: 'failed', failure_code: 'empty_file' })])
    expect(await screen.findByText('Couldn’t read it')).toBeInTheDocument()
    expect(
      screen.getByText(/Upload it again, or delete it\.$/),
    ).toBeInTheDocument()
  })

  it('says a read with no ideas found nothing, and offers to analyse again', async () => {
    await show([asset({ gist: 'A glossary of terms' })])
    expect(
      await screen.findByText(/No ideas came out of it/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Analyse again' }),
    ).toBeInTheDocument()
    expect(screen.getByText('A glossary of terms')).toBeInTheDocument()
  })

  it('makes no claim about ideas when nothing was analysed', async () => {
    await show([asset({ analysis_status: null })])
    await screen.findByText('Positioning')
    expect(screen.queryByText(/No ideas came/)).not.toBeInTheDocument()
    expect(screen.queryByText(/ideas →/)).not.toBeInTheDocument()
  })

  it('shows its tags as chips', async () => {
    await show([
      asset({
        tags: [
          { id: 't1', name: 'Gartner', color: '' },
          { id: 't2', name: 'Finance', color: '' },
        ],
      }),
    ])
    // On the details line, after the facts.
    expect(await screen.findByText('Gartner')).toBeInTheDocument()
    expect(screen.getByText('Finance')).toBeInTheDocument()
  })

  it('names the campaigns holding it — only the others on a campaign’s own page', async () => {
    campaigns.current = [
      { id: 'c1', name: 'Beekeeping in Ukraine' },
      { id: 'c2', name: 'Finance Q4' },
    ]
    const held = asset({ campaign_ids: ['c1', 'c2'] })
    const { unmount } = await show([held])
    // The first in its column on a wide list, then how many more; all of
    // them ending the details line on a narrow one, where the column is
    // hidden.
    expect(await screen.findByText('Beekeeping in Ukraine')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
    expect(
      screen.getByText('Beekeeping in Ukraine, Finance Q4'),
    ).toBeInTheDocument()
    unmount()

    await show([held], { campaignId: 'c1' })
    expect(await screen.findAllByText('Finance Q4')).toHaveLength(2)
    expect(screen.queryByText('Beekeeping in Ukraine')).not.toBeInTheDocument()
  })

  it('says nothing for a document in no campaign', async () => {
    campaigns.current = [{ id: 'c1', name: 'Finance Q4' }]
    await show([asset({})])
    await screen.findByText('Positioning')
    expect(screen.queryByText('No campaign')).not.toBeInTheDocument()
  })

  it('shows where a text search matched, in place of the summary', async () => {
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
    expect((await screen.findByText('overwintering')).tagName).toBe('MARK')
    expect(
      screen.queryByText('A gist that the match replaces'),
    ).not.toBeInTheDocument()
  })

  it('opens the asset from anywhere on the card, and has no bin', async () => {
    const opened = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    await show([asset({})])
    await userEvent.click(
      (await screen.findByText('added 2 minutes ago')).closest('li')!,
    )
    expect(opened).toHaveBeenCalledTimes(1)
    opened.mockRestore()
    // DELETE is the selection's, which asks.
    expect(
      screen.queryByRole('button', { name: /Delete/ }),
    ).not.toBeInTheDocument()
  })
})

describe('the other ideas', () => {
  const idea = (
    id: string,
    title: string,
    note = '',
    fit_score: number | null = null,
  ) => ({
    id,
    title,
    note,
    fit_score,
    campaign_id: null,
    verdict: null,
    created_at: '2026-10-01T00:00:00Z',
    created_by: null,
    decided_at: null,
    decided_by: null,
    remind_at: null,
  })
  const lens = (campaign_id: string | null, ideas: unknown[]) => ({
    id: `lens-${campaign_id ?? 'workspace'}`,
    asset_id: 'a1',
    campaign_id,
    status: 'ready',
    ideas,
  })
  const row = asset({
    idea_counts: { waiting: 3, yes: 0, later: 0, no: 0 },
    next_idea: { id: 'i1', title: 'The next one' },
  })

  beforeEach(() => {
    analyses.fn
      .mockReset()
      .mockResolvedValue([
        lens(null, [
          idea('i1', 'The next one'),
          idea('i2', 'A second angle', 'Why the trough matters'),
        ]),
        lens('c1', [idea('i9', 'Only for the campaign')]),
      ])
  })

  it('links the count to the undecided pile', async () => {
    await show([row])
    const link = await screen.findByRole('link', { name: '3 on the desk' })
    expect(link).toHaveTextContent('3 ideas →')
    expect(link).toHaveAttribute('href', '/assets/a1?verdict=waiting')
  })

  it('lists this reading’s ideas, the next one included, read only on hover', async () => {
    await show([row])
    expect(analyses.fn).not.toHaveBeenCalled()

    await userEvent.hover(
      await screen.findByRole('link', { name: '3 on the desk' }),
    )

    expect(
      (await screen.findAllByText('A second angle')).length,
    ).toBeGreaterThan(0)
    // Each with its note under the title.
    expect(
      (await screen.findAllByText('Why the trough matters')).length,
    ).toBeGreaterThan(0)
    // The workspace's reading in the bank; never the campaign's.
    expect(screen.queryByText('Only for the campaign')).not.toBeInTheDocument()
    expect(analyses.fn).toHaveBeenCalledWith('a1')
  })

  it('orders them best fit first, unscored last, each with its score', async () => {
    analyses.fn.mockResolvedValue([
      lens(null, [
        idea('i1', 'The next one', '', 90),
        idea('i2', 'Never scored'),
        idea('i3', 'A weaker fit', '', 41),
        idea('i4', 'A strong fit', '', 77),
      ]),
    ])
    await show([row])
    await userEvent.hover(
      await screen.findByRole('link', { name: '3 on the desk' }),
    )
    await screen.findAllByText('A strong fit')

    const lists = screen.getAllByRole('list')
    const card = lists[lists.length - 1]
    const titles = within(card)
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    // The next one heads the card: it is the best fit.
    expect(titles).toEqual([
      expect.stringContaining('The next one'),
      expect.stringContaining('A strong fit'),
      expect.stringContaining('A weaker fit'),
      expect.stringContaining('Never scored'),
    ])
    expect(
      within(card).getByRole('img', { name: 'Fit 77 of 100' }),
    ).toBeInTheDocument()
    expect(
      within(card).getByRole('img', { name: 'Not scored' }),
    ).toBeInTheDocument()
  })

  it('lists every idea, scrolling rather than stopping at a count', async () => {
    analyses.fn.mockResolvedValue([
      lens(
        null,
        Array.from({ length: 12 }, (_, i) =>
          idea(
            `i${i + 1}`,
            i === 0 ? 'The next one' : `Idea ${i + 1}`,
            '',
            90 - i,
          ),
        ),
      ),
    ])
    await show([row])
    await userEvent.hover(
      await screen.findByRole('link', { name: '3 on the desk' }),
    )
    await screen.findAllByText('Idea 12')
    const lists = screen.getAllByRole('list')
    const card = lists[lists.length - 1]
    expect(within(card).getAllByRole('listitem')).toHaveLength(12)
    expect(within(card).queryByText(/more$/)).not.toBeInTheDocument()
  })

  it('marks each idea with its verdict, a woken one as undecided', async () => {
    analyses.fn.mockResolvedValue([
      lens(null, [
        idea('i1', 'The next one', '', 90),
        { ...idea('i2', 'Taken', '', 80), verdict: 'yes' },
        {
          ...idea('i3', 'Postponed', '', 70),
          verdict: 'later',
          remind_at: '2999-01-01T00:00:00Z',
        },
        {
          ...idea('i4', 'Back again', '', 60),
          verdict: 'later',
          remind_at: '2000-01-01T00:00:00Z',
        },
        { ...idea('i5', 'Dropped', '', 50), verdict: 'no' },
      ]),
    ])
    await show([row])
    await userEvent.hover(
      await screen.findByRole('link', { name: '3 on the desk' }),
    )
    await screen.findAllByText('Taken')
    const lists = screen.getAllByRole('list')
    const card = lists[lists.length - 1]
    const marks = within(card)
      .getAllByRole('listitem')
      .map((li) =>
        within(li)
          .getAllByRole('img')
          .map((img) => img.getAttribute('aria-label'))
          .filter((name) => !name?.startsWith('Fit')),
      )
    expect(marks).toEqual([
      ['On the desk'],
      ['Making'],
      ['In the drawer'],
      ['On the desk'],
      ['Set aside'],
    ])
  })

  it('reads the campaign’s reading on a campaign’s page', async () => {
    await show([row], { campaignId: 'c1' })
    await userEvent.hover(
      await screen.findByRole('link', { name: '3 on the desk' }),
    )
    expect(
      (await screen.findAllByText('Only for the campaign')).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText('A second angle')).not.toBeInTheDocument()
  })
})

describe('group bands', () => {
  const grouped = [
    asset({ id: 'a1', title: 'One', group_key: '1d' }),
    asset({ id: 'a2', title: 'Two', group_key: '1d' }),
    asset({ id: 'a3', title: 'Three', group_key: 'earlier' }),
  ]
  const groups = [
    { key: '1d', count: 7 },
    { key: 'earlier', count: 1 },
  ]

  it('heads each run of rows with its group and the server’s count', async () => {
    await show(grouped, { grouping: 'created', groups })
    const bands = await screen.findAllByRole('heading', { level: 2 })
    expect(bands.map((b) => b.textContent)).toEqual([
      'band 1d7',
      'band earlier1',
    ])
    // Only the list's head pins; a group's head scrolls with its cards.
    expect(bands[0].parentElement).not.toHaveClass('sticky')
  })

  it('draws the band even when the grouping has a single group', async () => {
    await show(grouped.slice(0, 2), {
      grouping: 'created',
      groups: [{ key: '1d', count: 2 }],
    })
    expect(
      await screen.findByRole('heading', { level: 2, name: /band 1d/ }),
    ).toBeInTheDocument()
  })

  /*
   * A new grouping, a fold or the next page moves the list without a scroll
   * event, so the pinned head — and the cap behind the header that comes
   * with it — is marked again whenever the list changes, not only on scroll.
   */
  it('marks the list head at the header’s foot as pinned when the list changes', async () => {
    // jsdom lays nothing out: the scroller's top is 0, so a head at
    // `BAND_TOP` is sitting at the header's foot.
    const at = { top: 500 }
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const top = this.hasAttribute('data-band') ? at.top : 0
        return {
          top,
          bottom: top,
          left: 0,
          right: 0,
          height: 0,
          width: 0,
          x: 0,
          y: top,
          toJSON: () => ({}),
        }
      })
    function Harness() {
      const [grouping, setGrouping] = useState<AssetGrouping>('none')
      return (
        <div style={{ overflowY: 'auto' }}>
          <button
            onClick={() => {
              at.top = BAND_TOP
              setGrouping('created')
            }}
          >
            regroup
          </button>
          <AssetList
            head={
              <CardHead wide box={null}>
                the head
              </CardHead>
            }
            rows={grouped}
            groups={grouping === 'none' ? [] : groups}
            grouping={grouping}
            groupLabel={(key) => `band ${key}`}
            campaignId={null}
            selectedIds={new Set()}
            selecting={false}
            onToggleRow={() => {}}
            onToggleBand={() => {}}
            asOf={AS_OF}
            onEndReached={() => {}}
            loadingMore={false}
          />
        </div>
      )
    }
    await renderWithProviders(<Harness />)
    expect(document.querySelector('[data-pinned]')).toBeNull()

    await userEvent.click(screen.getByText('regroup'))
    const pinned = document.querySelectorAll('[data-pinned]')
    expect(pinned).toHaveLength(1)
    expect(pinned[0]).toHaveTextContent('the head')
    rect.mockRestore()
  })

  it('ticks a group’s loaded cards from its own box', async () => {
    const onToggleBand = vi.fn()
    await show(grouped, { grouping: 'created', groups, onToggleBand })
    await userEvent.click(
      await screen.findByRole('checkbox', {
        name: 'Select everything in band 1d',
      }),
    )
    expect(onToggleBand).toHaveBeenCalledWith(['a1', 'a2'])
  })

  it('draws no group heads when the list is not grouped', async () => {
    await show(grouped.slice(0, 2), { grouping: 'none' })
    await screen.findByText('One')
    // The list's head is its edge to pin (CON-392).
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
  })

  it('folds a band on its button, and remembers it', async () => {
    await show(grouped, { grouping: 'created', groups })
    await userEvent.click(
      await screen.findByRole('button', { name: 'Fold band 1d' }),
    )
    expect(screen.queryByText('One')).not.toBeInTheDocument()
    expect(screen.getByText('Three')).toBeInTheDocument()
    expect(useSettingsStore.getState().collapsedAssetBands).toEqual([
      'created:1d',
    ])
    await userEvent.click(
      screen.getByRole('button', { name: 'Unfold band 1d' }),
    )
    expect(screen.getByText('One')).toBeInTheDocument()
  })

  it('lists a document under each of its tags', async () => {
    await show(
      [
        asset({ id: 'a1', title: 'Hype Cycle', group_key: 't1' }),
        asset({ id: 'a1', title: 'Hype Cycle', group_key: 't2' }),
      ],
      {
        grouping: 'tag',
        groups: [
          { key: 't1', count: 1 },
          { key: 't2', count: 1 },
        ],
      },
    )
    expect(await screen.findAllByText('Hype Cycle')).toHaveLength(2)
  })
})

describe('the next page', () => {
  /** jsdom has no IntersectionObserver; this one records what it watches. */
  const observed: { fire: () => void }[] = []
  beforeEach(() => {
    observed.length = 0
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(private callback: IntersectionObserverCallback) {}
        observe() {
          observed.push({
            fire: () =>
              this.callback(
                [{ isIntersecting: true } as IntersectionObserverEntry],
                this as unknown as IntersectionObserver,
              ),
          })
        }
        disconnect() {}
      },
    )
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /*
   * The empty state mounts neither the scroller nor its foot, so an observer
   * set up only on mount never existed for a list that arrived later — a
   * filter going from no matches to some — and that list never paged.
   */
  it('is asked for once rows arrive after an empty first answer', async () => {
    const onEndReached = vi.fn()
    function Harness() {
      const [rows, setRows] = useState<AssetListItem[]>([])
      return (
        <>
          <button onClick={() => setRows([asset({})])}>arrive</button>
          <AssetList
            head={null}
            rows={rows}
            groups={[]}
            grouping="none"
            groupLabel={(key) => key}
            campaignId={null}
            selectedIds={new Set()}
            selecting={false}
            onToggleRow={() => {}}
            onToggleBand={() => {}}
            asOf={AS_OF}
            onEndReached={onEndReached}
            loadingMore={false}
          />
        </>
      )
    }
    await renderWithProviders(<Harness />)
    expect(observed).toHaveLength(0)

    await userEvent.click(screen.getByText('arrive'))
    await screen.findByText('Positioning')
    expect(observed).toHaveLength(1)
    observed[0].fire()
    expect(onEndReached).toHaveBeenCalledTimes(1)
  })
})

/**
 * The list in a language that is not English: in an English test a literal
 * in the component and a catalogue entry render the same, so only this can
 * tell them apart.
 */
describe('in Spanish', () => {
  beforeAll(async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
  })
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('reads its facts, its idea line and its states from the catalogue', async () => {
    await show([
      asset({
        id: 'a1',
        idea_counts: { ...NO_IDEAS, waiting: 3, later: 1 },
        next_idea: { id: 'i1', title: 'Una idea' },
      }),
      asset({ id: 'a2', title: 'Roto', status: 'failed' }),
    ])
    expect(
      await screen.findByRole('link', {
        name: '3 sobre la mesa · 1 en el cajón',
      }),
    ).toHaveTextContent('3 ideas →')
    expect(screen.getByText('No se pudo leer')).toBeInTheDocument()
    expect(screen.getAllByText(/^añadido hace/)).toHaveLength(2)
    // The English that a literal would have left behind.
    expect(screen.queryByText(/on the desk/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Couldn’t read/)).not.toBeInTheDocument()
  })
})
