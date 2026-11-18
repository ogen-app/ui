import { fireEvent, screen } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAssistantStore } from '@/stores/assistantStore'
import type { IdeasResults as Results } from '@/types/assistant'
import { IdeasResults, IdeaReadOnly, LiveDrafts } from './IdeasResults'

vi.mock('@/hooks/usePlatforms', () => ({
  usePlatformCatalog: () => ({
    resolve: (slug: string) =>
      ({ instagram: { name: 'Instagram' }, linkedin: { name: 'LinkedIn' } })[
        slug
      ],
  }),
}))

vi.mock('@/hooks/useCampaignNames', () => ({
  useCampaignNames: () => ({
    names: new Map([['c1', 'Spring reopening']]),
    ready: true,
  }),
}))

const undo = vi.fn(async () => {})
const runUiAction = vi.fn(async () => {})

beforeEach(() => {
  undo.mockClear()
  runUiAction.mockClear()
  useAssistantStore.setState({ undo, runUiAction })
})

function show(
  results: Results,
  {
    campaignId = 'c1',
    findFilter,
    undoStates = {},
  }: {
    campaignId?: string
    findFilter?: string
    undoStates?: Record<string, 'undone' | 'changed'>
  } = {},
) {
  return renderWithProviders(
    <IdeasResults
      threadId="campaign:c1"
      turnId="t1"
      campaignId={campaignId}
      findFilter={findFilter}
      results={results}
      undoStates={undoStates}
    />,
  )
}

describe('triage', () => {
  it('names the pile a verdict put the idea in, its day back, and undoes it', async () => {
    await show({
      decided: {
        idea: {
          id: 'i1',
          title: 'The pool',
          verdict: 'later',
          remindAt: '2099-05-01T00:00:00Z',
        },
        undoId: 'u1',
      },
    })
    expect(screen.getByText('In the drawer: The pool')).toBeTruthy()
    expect(screen.getByText('back on May 1')).toBeTruthy()
    fireEvent.click(screen.getByText('UNDO'))
    expect(undo).toHaveBeenCalledWith('campaign:c1', 't1', 'u1')
  })

  it('puts a woken idea on the desk, not in the drawer (bug 6)', async () => {
    await show({
      found: {
        total: 1,
        ideas: [
          {
            id: 'i1',
            title: 'The pool',
            verdict: 'later',
            remindAt: '2020-01-01T00:00:00Z',
          },
        ],
      },
    })
    expect(screen.getByText('On the desk')).toBeTruthy()
  })

  it('lists what was found, of its pile, each opening its idea, with SHOW ON SCREEN', async () => {
    await show(
      {
        found: {
          total: 12,
          pileTotal: 14,
          ideas: [
            { id: 'i1', title: 'The pool', fitScore: 82, campaignId: 'c1' },
          ],
        },
      },
      { findFilter: 'pile=waiting&text=pool' },
    )
    expect(screen.getByText('12 ideas')).toBeTruthy()
    expect(screen.getByText('of 14 · On the desk')).toBeTruthy()
    expect(screen.getByText('fit 82')).toBeTruthy()
    expect(screen.getByText('and 11 more')).toBeTruthy()
    // Exactly that idea, opened (CON-510).
    expect(screen.getByText('The pool').getAttribute('href')).toBe(
      '/campaigns/c1/ideas?ids=i1&idea=i1',
    )
    // SHOW ON SCREEN can run, so there is no OPEN ALL beside it.
    expect(screen.queryByText('OPEN ALL')).toBeNull()
    fireEvent.click(screen.getByText('SHOW ON SCREEN'))
    expect(runUiAction).toHaveBeenCalledWith('campaign:c1', 't1', {
      type: 'set_filter',
      screen: 'campaign.ideas',
      campaignId: 'c1',
      filter: 'pile=waiting&text=pool',
    })
  })

  it('names a bulk verdict’s pile and day, each idea, and what UNDO put back', async () => {
    await show(
      {
        decidedMany: {
          done: 2,
          failed: 0,
          undoId: 'u2',
          verdict: 'later',
          remindAt: '2099-05-01T00:00:00Z',
          ideas: [
            {
              id: 'i1',
              title: 'Six rooms',
              verdict: 'later',
              remindAt: '2099-05-01T00:00:00Z',
            },
            {
              id: 'i2',
              title: 'Breakfast at 7',
              verdict: 'later',
              remindAt: '2099-05-01T00:00:00Z',
            },
          ],
        },
      },
      { undoStates: { u2: 'undone' } },
    )
    expect(screen.getByText('In the drawer: 2 ideas')).toBeTruthy()
    expect(screen.getByText('back on May 1')).toBeTruthy()
    expect(screen.getByText('Six rooms')).toBeTruthy()
    expect(
      screen.getByText('Undone: 2 ideas back where they were'),
    ).toBeTruthy()
  })

  it('says a delete has no undo, and what it couldn’t do', async () => {
    await show({ deleted: { done: 3, failed: 1 } })
    expect(screen.getByText('3 ideas deleted')).toBeTruthy()
    expect(screen.getByText('1 idea couldn’t be changed')).toBeTruthy()
    expect(screen.queryByText('UNDO')).toBeNull()
  })

  it('counts every merged group, with no UNDO', async () => {
    await show({
      merged: {
        groups: [
          { idea: { id: 'i1', title: 'Breakfast first' }, deleted: 1 },
          { idea: { id: 'i2', title: 'The pool' }, deleted: 1 },
        ],
      },
    })
    expect(screen.getByText('2 groups merged')).toBeTruthy()
    expect(screen.getByText('4 ideas → 2')).toBeTruthy()
    expect(screen.queryByText('UNDO')).toBeNull()
    // The survivors, exactly, on the workspace's list (CON-510).
    expect(screen.getByText('OPEN ALL').getAttribute('href')).toBe(
      '/ideas?ids=i1%2Ci2',
    )
  })

  it('opens a reloaded FOUND’s ideas exactly, on the pile most of them are in', async () => {
    await show({
      found: {
        total: 3,
        ideas: [
          { id: 'i1', title: 'One', verdict: 'later', campaignId: 'c1' },
          { id: 'i2', title: 'Two', verdict: 'yes', campaignId: 'c1' },
          { id: 'i3', title: 'Three', verdict: 'yes', campaignId: 'c1' },
        ],
      },
    })
    expect(screen.getByText('OPEN ALL').getAttribute('href')).toBe(
      '/campaigns/c1/ideas?ids=i1%2Ci2%2Ci3&pile=yes',
    )
  })
})

const compiled: NonNullable<Results['compiled']> = {
  posts: [
    {
      postId: 'p1',
      title: 'Water, not rooms',
      platformId: 'instagram',
      postType: 'carousel',
    },
  ],
  campaignId: 'c1',
  ideas: 3,
  builtFrom: [
    { id: 'i1', title: 'Thermal pool at dusk' },
    { id: 'i2', title: 'Six rooms, one pool' },
  ],
  theses: [
    { title: 'The pool is cut into the hillside.', points: [] },
    { title: 'Six rooms share it.', points: [] },
  ],
  grounding: {
    mode: 'grounded',
    sources: [{ id: 'a1', title: 'Brochure' }],
  },
  undoId: 'u3',
}

describe('compile and draft', () => {
  it('says why each draft has its day (CON-485)', async () => {
    await show({
      drafted: {
        warnings: [],
        posts: [
          {
            postId: 'p1',
            title: 'Lemon, olive, sea salt',
            platformId: 'instagram',
            campaignId: 'c1',
            ideaIds: ['i1'],
            publishDate: '2026-04-24',
            dateFrom: 'plan',
            grounding: { mode: 'grounded', sources: [] },
          },
          {
            postId: 'p2',
            title: 'A pool in the rock',
            platformId: 'instagram',
            campaignId: 'c1',
            ideaIds: ['i2'],
            publishDate: '2026-04-22',
            dateFrom: 'asked',
            grounding: { mode: 'grounded', sources: [] },
          },
        ],
      },
    })
    expect(screen.getByText(/the idea’s plan date$/)).toBeTruthy()
    expect(screen.getByText(/the day you chose$/)).toBeTruthy()
  })

  it('says a single draft’s day and why, or that it isn’t scheduled', async () => {
    const one = (publishDate?: string) => ({
      drafted: {
        warnings: [],
        posts: [
          {
            postId: 'p1',
            title: 'Lemon, olive, sea salt',
            platformId: 'instagram',
            campaignId: 'c1',
            ideaIds: ['i1'],
            publishDate,
            dateFrom: publishDate ? ('plan' as const) : undefined,
            grounding: { mode: 'grounded' as const, sources: [] },
          },
        ],
      },
    })
    const { unmount } = await show(one('2026-04-24'))
    expect(screen.getByText(/the idea’s plan date$/)).toBeTruthy()
    unmount()
    await show(one())
    expect(screen.getByText('Not scheduled')).toBeTruthy()
  })

  it('draws the planned post with its type, theses and the ideas it was built from', async () => {
    await show({ compiled })
    expect(screen.getByText('Planned post')).toBeTruthy()
    expect(screen.getByText('Instagram · carousel · no date')).toBeTruthy()
    expect(screen.getByText('01')).toBeTruthy()
    expect(screen.getByText('The pool is cut into the hillside.')).toBeTruthy()
    expect(screen.getByText('Built from 2 ideas')).toBeTruthy()
    expect(
      screen.getByText('Thermal pool at dusk · Six rooms, one pool'),
    ).toBeTruthy()
    expect(screen.getByText('OPEN').getAttribute('href')).toBe(
      '/campaigns/c1/posts/p1',
    )
    fireEvent.click(screen.getByText('UNDO'))
    expect(undo).toHaveBeenCalledWith('campaign:c1', 't1', 'u3')
  })

  it('says a changed post can’t be undone, and how to remove it', async () => {
    await show({ compiled }, { undoStates: { u3: 'changed' } })
    expect(screen.getByText('edited since')).toBeTruthy()
    expect(screen.getByText(/Delete it from the post itself/)).toBeTruthy()
  })

  it('says where ungrounded theses came from, and a post with no platform', async () => {
    await show({
      compiled: {
        ...compiled,
        posts: [{ postId: 'p1', title: 'The rooftop opens' }],
        ideas: 2,
        grounding: { mode: 'exploratory', sources: [] },
      },
    })
    expect(screen.getByText('no platform yet')).toBeTruthy()
    expect(
      screen.getByText(
        'None of the ideas cites a document; the theses come from their own words.',
      ),
    ).toBeTruthy()
  })

  it('sums the drafts, from how many ideas, each opening in its own campaign', async () => {
    await show(
      {
        drafted: {
          warnings: [],
          posts: [
            {
              postId: 'p2',
              title: 'The rooftop',
              platformId: 'instagram',
              campaignId: 'c2',
              ideaIds: ['i1'],
              grounding: { mode: 'exploratory', sources: [] },
            },
            {
              postId: 'p3',
              title: 'The kitchen garden',
              platformId: 'instagram',
              campaignId: 'c2',
              ideaIds: ['i2'],
              publishDate: '2026-11-26',
              grounding: { mode: 'grounded', sources: [] },
            },
          ],
        },
      },
      { campaignId: undefined },
    )
    expect(screen.getByText('2 posts from 2 ideas')).toBeTruthy()
    expect(screen.getByText('1 not scheduled')).toBeTruthy()
    // Each row's day on the right: not scheduled, or its date (CON-485).
    expect(screen.getByText('Not scheduled')).toBeTruthy()
    expect(screen.getByText(/^Thu,? 26 Nov|^Thu,? Nov 26/).className).toContain(
      'text-accent-ink',
    )
    expect(screen.getByText('Not grounded')).toBeTruthy()
    expect(screen.getByText('The rooftop').getAttribute('href')).toBe(
      '/campaigns/c2/posts/p2',
    )
    // One undated: SHOW opens the campaign's Not scheduled panel.
    expect(screen.getByText('SHOW')).toBeTruthy()
  })

  it('draws drafts as they are written, then the next as a placeholder', async () => {
    await renderWithProviders(
      <LiveDrafts
        drafts={{
          done: 1,
          total: 3,
          posts: [
            {
              postId: 'p2',
              title: 'A pool in the rock',
              platformId: 'instagram',
              campaignId: 'c1',
              ideaIds: ['i1'],
              excerpt: 'Cut into the hillside, warm in March.',
              grounding: { mode: 'exploratory', sources: [] },
            },
          ],
        }}
      />,
    )
    expect(screen.getByText('A pool in the rock')).toBeTruthy()
    expect(
      screen.getByText('Cut into the hillside, warm in March.'),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'The idea cites no document; written from its own words.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Draft 2 of 3')).toBeTruthy()
  })

  const next = (ideas: string[], platformId = 'linkedin') => ({
    ideas: ideas.map((title, i) => ({ ideaId: `i${i}`, title })),
    platformId,
    count: 1,
    done: 2,
    total: 4,
  })

  it('names the idea it is writing next and where it goes (CON-510)', async () => {
    await renderWithProviders(
      <LiveDrafts
        drafts={{
          done: 2,
          total: 4,
          posts: [],
          next: next(['What the water does in March']),
        }}
      />,
    )
    expect(
      screen.getByText('What the water does in March · LinkedIn'),
    ).toBeTruthy()
    expect(screen.queryByText('Draft 3 of 4')).toBeNull()
  })

  it('draws no placeholder once the drafts tool has finished, done or failed', async () => {
    await renderWithProviders(
      <LiveDrafts
        drafts={{
          done: 2,
          total: 4,
          posts: [],
          ended: true,
        }}
      />,
    )
    expect(screen.queryByText('Draft 3 of 4')).toBeNull()
    expect(screen.queryByText('Writing')).toBeNull()
  })

  it('names every idea a together post draws on', async () => {
    await renderWithProviders(
      <LiveDrafts
        drafts={{
          done: 2,
          total: 4,
          posts: [],
          next: next(['The pool', 'Breakfast first'], 'instagram'),
        }}
      />,
    )
    expect(
      screen.getByText('The pool and Breakfast first · Instagram'),
    ).toBeTruthy()
  })
})

describe('FOUND names what its search was about (CON-509)', () => {
  const found = (named: NonNullable<Results['found']>['named']) =>
    show({
      found: {
        total: 6,
        ideas: [{ id: 'i1', title: 'The pool', campaignId: 'c1' }],
        named,
      },
    })

  it('words a kept document as the Ideas list does', async () => {
    await found({ sourceAssets: [{ id: 'a1', title: 'Brochure' }] })
    expect(screen.getByText('6 ideas from Brochure')).toBeTruthy()
  })

  it('never words a left-out document as kept', async () => {
    await found({
      sourceAssets: [{ id: 'a1', title: 'Brochure', excluded: true }],
    })
    expect(screen.getByText('6 ideas not from Brochure')).toBeTruthy()
    expect(screen.queryByText('6 ideas from Brochure')).toBeNull()
  })

  it('names the document, the campaign and the author, in the list’s order', async () => {
    await found({
      authors: [{ id: 'u1', title: 'Ana' }],
      campaigns: [{ id: 'c1', title: 'Spring reopening' }],
      sourceAssets: [
        { id: 'a1', title: 'Brochure' },
        { id: 'a2', title: 'Menu' },
      ],
    })
    expect(
      screen.getByText(
        '6 ideas from Brochure or Menu, in Spring reopening, written by Ana',
      ),
    ).toBeTruthy()
  })

  it('keeps a title’s own angle brackets and dollar signs', async () => {
    await found({ sourceAssets: [{ id: 'a1', title: 'Budget <draft> $1' }] })
    expect(screen.getByText('6 ideas from Budget <draft> $1')).toBeTruthy()
  })

  it('keeps the count alone when the search named none of them', async () => {
    await found(undefined)
    expect(screen.getByText('6 ideas')).toBeTruthy()
  })

  it('words it in Spanish', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    try {
      await found({ sourceAssets: [{ id: 'a1', title: 'Folleto' }] })
      expect(screen.getByText('6 ideas de Folleto')).toBeTruthy()
    } finally {
      await i18next.changeLanguage('en')
    }
  })
})

describe('reads', () => {
  it('heads why it fits with the score and the campaign, the breakdown first', async () => {
    await show({
      idea: {
        idea: { id: 'i1', title: 'The pool cut into the rock' },
        angle: 'The spa is built into the hillside.',
        rationale: 'The brief leads with rest.',
        fit: {
          score: 82,
          lens: 'campaign',
          campaignId: 'c1',
          criteria: [{ key: 'brief', level: 4, why: 'Matches the brief' }],
          caps: [],
        },
        sourceAsset: { id: 'a1', title: 'Villa Aurora brochure' },
        lens: { campaignId: 'c1', campaignName: 'Spring reopening' },
        posts: [],
      },
    })
    expect(screen.getByText('Fit 82 for Spring reopening')).toBeTruthy()
    expect(screen.getByText('Rationale')).toBeTruthy()
    expect(
      screen.getByText('Villa Aurora brochure · lens: Spring reopening'),
    ).toBeTruthy()
    expect(screen.getByText('OPEN').getAttribute('href')).toBe(
      '/campaigns/c1/assets/a1?lens=c1',
    )
  })

  it('leads its source row with the asset’s mark, and none untyped (CON-509)', async () => {
    const read = (type?: string) =>
      show({
        idea: {
          idea: { id: 'i1', title: 'The pool cut into the rock' },
          sourceAsset: { id: 'a1', title: 'Villa Aurora brochure', type },
          posts: [],
        },
      })
    const { unmount } = await read('PDF')
    expect(screen.getByRole('img', { name: 'PDF' })).toBeTruthy()
    unmount()
    await read(undefined)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('names the page an idea came from, and opens the asset there (CON-487)', async () => {
    await show({
      idea: {
        idea: { id: 'i1', title: 'The pool cut into the rock' },
        sourceAsset: {
          id: 'a1',
          title: 'Villa Aurora brochure',
          passage: { chunkId: 'c9', label: 'p. 12', page: 12 },
        },
        lens: { campaignId: 'c1', campaignName: 'Spring reopening' },
        posts: [],
      },
    })
    expect(
      screen.getByText(
        'Villa Aurora brochure · p. 12 · lens: Spring reopening',
      ),
    ).toBeTruthy()
    const href = screen.getByText('OPEN').getAttribute('href') ?? ''
    const url = new URL(href, 'http://app')
    expect(url.pathname).toBe('/campaigns/c1/assets/a1')
    expect(url.searchParams.get('lens')).toBe('c1')
    expect(url.searchParams.get('at')).toBe('p. 12')
  })

  it('says what a selection shares, and in amber where it splits', async () => {
    await show({
      common: {
        ideas: [
          { id: 'i1', title: 'A' },
          { id: 'i2', title: 'B' },
          { id: 'i3', title: 'C' },
        ],
        theme: 'the spa',
        angle: 'All three sell the water, not the rooms.',
        shared: [
          {
            kind: 'lenses',
            values: [
              { value: 'offers', label: 'offers', ideaIds: ['i1', 'i2', 'i3'] },
            ],
          },
          {
            kind: 'terms',
            values: [{ value: 'pool', label: 'pool', ideaIds: ['i1', 'i2'] }],
          },
        ],
        splits: [
          {
            field: 'platform',
            values: [{ value: 'linkedin', label: 'linkedin', ideaIds: ['i1'] }],
          },
        ],
      },
    })
    expect(screen.getByText('3 ideas, one thread')).toBeTruthy()
    expect(screen.getByText('the spa')).toBeTruthy()
    expect(
      screen.getByText('All three sell the water, not the rooms.'),
    ).toBeTruthy()
    expect(screen.getByText('offers · 3 of 3')).toBeTruthy()
    // The words they share are left to the model's reply.
    expect(screen.queryByText(/pool/)).toBeNull()
    expect(
      screen.getByText('Planned for LinkedIn · 1 of 3').className,
    ).toContain('text-warning-ink')
  })

  it('shows an edit before → after, per field', async () => {
    await show({
      edited: {
        idea: {
          id: 'i1',
          title: 'A pool in the rock',
          plan: { platformId: 'instagram', postType: 'carousel' },
        },
        changed: ['title', 'plan.platformId', 'plan.postType'],
        before: { title: 'The pool cut into the rock', plan: {} },
        undoId: 'u4',
      },
    })
    expect(screen.getByText('The pool cut into the rock').tagName).toBe('S')
    expect(screen.getAllByText('A pool in the rock')).toHaveLength(2)
    expect(screen.getByText('Nothing planned').tagName).toBe('S')
    expect(screen.getByText('Instagram · carousel')).toBeTruthy()
  })

  it('says a read-only idea wasn’t changed, and what can change', async () => {
    await renderWithProviders(<IdeaReadOnly />)
    expect(screen.getByText('This idea is read-only')).toBeTruthy()
    expect(
      screen.getByText(/only its campaign and plan can change/),
    ).toBeTruthy()
  })

  it('cuts a long similar list with “and N more”, and says similar isn’t duplicate', async () => {
    await show({
      similar: {
        ideaId: 'i0',
        title: 'The pool',
        items: Array.from({ length: 10 }, (_, i) => ({
          idea: { id: `i${i + 1}`, title: `Idea ${i + 1}` },
          why: ['same lens'],
        })),
      },
    })
    expect(screen.getByText('10 ideas like this one')).toBeTruthy()
    expect(screen.getByText('and 2 more')).toBeTruthy()
    expect(screen.getByText(/Similar isn’t duplicate/)).toBeTruthy()
  })
})

describe('review fixes', () => {
  it('offers no SHOW ON SCREEN without the filter it ran (a reloaded thread)', async () => {
    await show({
      found: { total: 2, ideas: [{ id: 'i1', title: 'The pool' }] },
    })
    expect(screen.queryByText('SHOW ON SCREEN')).toBeNull()
  })

  it('keeps UNDO on a compile that names no ideas', async () => {
    await show({ compiled: { ...compiled, builtFrom: [] } })
    fireEvent.click(screen.getByText('UNDO'))
    expect(undo).toHaveBeenCalledWith('campaign:c1', 't1', 'u3')
  })

  it('shows a phase in a plan, and a note’s new words', async () => {
    await show({
      edited: {
        idea: { id: 'i1', title: 'A pool', plan: { phaseId: 'build-up' } },
        changed: ['note', 'plan.phaseId'],
        note: 'Lead with the water.',
        before: { title: 'A pool', note: 'Lead with rooms.', plan: {} },
      },
    })
    expect(screen.getByText('phase build up')).toBeTruthy()
    expect(screen.getByText('Lead with rooms.').tagName).toBe('S')
    expect(screen.getByText('Lead with the water.')).toBeTruthy()
  })
})

describe('in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words the cards', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show({ deleted: { done: 3, failed: 0 }, compiled })
    expect(screen.getByText('3 ideas eliminadas')).toBeTruthy()
    expect(screen.getByText('Hecha con 2 ideas')).toBeTruthy()
    expect(screen.queryByText('3 ideas deleted')).toBeNull()
    expect(screen.queryByText('Built from 2 ideas')).toBeNull()
  })

  it('words the passage an idea came from (CON-487)', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show({
      idea: {
        idea: { id: 'i1', title: 'La piscina' },
        sourceAsset: {
          id: 'a1',
          title: 'Folleto',
          passage: { label: 'p. 12', page: 12 },
        },
        lens: { campaignId: 'c1', campaignName: 'Primavera' },
        posts: [],
      },
    })
    expect(screen.getByText('Folleto · p. 12 · lente: Primavera')).toBeTruthy()
    expect(screen.queryByText(/lens:/)).toBeNull()
  })
})
