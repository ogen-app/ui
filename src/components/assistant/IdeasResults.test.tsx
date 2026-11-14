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
    expect(screen.getByText('The pool').getAttribute('href')).toBe(
      '/campaigns/c1/ideas?idea=i1',
    )
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
    expect(screen.getByText('2 drafts from 2 ideas')).toBeTruthy()
    expect(screen.getByText('1 not scheduled')).toBeTruthy()
    expect(screen.getByText('Instagram · not grounded').className).toContain(
      'text-warning-ink',
    )
    expect(screen.getByText('The rooftop').getAttribute('href')).toBe(
      '/campaigns/c2/posts/p2',
    )
    expect(screen.getByText('OPEN ALL').getAttribute('href')).toBe(
      '/campaigns/c2/list?status=draft',
    )
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
})
