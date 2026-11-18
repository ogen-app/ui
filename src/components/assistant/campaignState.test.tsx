import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAssistantStore } from '@/stores/assistantStore'
import { outsideCampaign } from '@/lib/campaignTarget'
import {
  targetedBefore,
  useAssistantRemovalStore,
} from '@/stores/assistantRemovalStore'
import type { CampaignState } from '@/types/assistant'
import { ResultCard } from './ResultCard'
import { OfferOutcome } from './OfferOutcome'
import { ProposalCard } from './ProposalCard'
import { SourcesCard, StateCitation } from './CampaignStateLines'

vi.mock('@/hooks/usePlatforms', () => ({
  usePlatformCatalog: () => ({ resolve: () => undefined }),
}))

const undo = { states: {}, onUndo: () => {} }

describe('removing a platform (CON-483)', () => {
  it('says what is off the campaign, and that nothing was on it', () => {
    render(
      <ResultCard
        undo={undo}
        details={{
          platforms: {
            removed: 'Facebook',
            postsLeft: { posts: 0, scheduled: 0 },
            kept: [],
            unscheduled: 0,
            undoId: 'u1',
          },
        }}
      />,
    )
    expect(screen.getByText('REMOVED')).toBeTruthy()
    expect(screen.getByText('Facebook is off the campaign')).toBeTruthy()
    expect(screen.getByText('no posts on it')).toBeTruthy()
    expect(screen.getByText('UNDO')).toBeTruthy()
  })

  it('names the posts it left, flagged, and what it unscheduled first', () => {
    render(
      <ResultCard
        details={{
          platforms: {
            removed: 'reel',
            postsLeft: { posts: 3, scheduled: 1 },
            kept: [
              {
                id: 'p1',
                title: 'A pool in the rock',
                platform: 'Instagram',
                postType: 'reel',
                status: 'draft',
              },
            ],
            unscheduled: 1,
          },
        }}
      />,
    )
    expect(screen.getByText('A pool in the rock')).toBeTruthy()
    expect(screen.getByText('Instagram · reel')).toBeTruthy()
    expect(screen.getByText('and 2 more')).toBeTruthy()
    expect(
      screen.getByText(
        '3 unpublished posts stay where they are, flagged in Quality.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        '1 post unscheduled first. UNDO puts the platform back, not the schedule.',
      ),
    ).toBeTruthy()
  })

  it('says what a removal left even when the change also added', () => {
    render(
      <ResultCard
        details={{
          platforms: {
            added: 'Threads',
            removed: 'LinkedIn',
            postsLeft: { posts: 1, scheduled: 0 },
            kept: [
              {
                id: 'p1',
                title: 'Wedding packages',
                platform: 'LinkedIn',
                status: 'draft',
              },
            ],
            unscheduled: 1,
          },
        }}
      />,
    )
    expect(screen.getByText('added Threads · removed LinkedIn')).toBeTruthy()
    expect(screen.getByText('Wedding packages')).toBeTruthy()
    expect(
      screen.getByText(
        '1 unpublished post stays where it is, flagged in Quality.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        '1 post unscheduled first. UNDO puts the platform back, not the schedule.',
      ),
    ).toBeTruthy()
  })

  it('says what an addition put on', () => {
    render(
      <ResultCard
        details={{ platforms: { added: 'Threads', kept: [], unscheduled: 0 } }}
      />,
    )
    expect(screen.getByText('ADDED')).toBeTruthy()
    expect(screen.getByText('Threads is on the campaign')).toBeTruthy()
  })
})

describe('ideas saved instead', () => {
  it('say the days they target, with UNDO and OPEN', async () => {
    const onUndo = vi.fn()
    await renderWithProviders(
      <ResultCard
        campaignId="c1"
        undo={{ states: {}, onUndo }}
        details={{
          generatedPosts: {
            ideaCount: 12,
            warnings: [],
            windowStart: '2026-04-01',
            windowEnd: '2026-04-30',
            undoId: 'u9',
          },
        }}
      />,
    )
    expect(screen.getByText('+12 ideas on the Ideas tab')).toBeTruthy()
    expect(screen.getByText(/^targeting Apr 1/)).toBeTruthy()
    expect(screen.getByText('OPEN').getAttribute('href')).toBe(
      '/campaigns/c1/ideas',
    )
    fireEvent.click(screen.getByText('UNDO'))
    expect(onUndo).toHaveBeenCalledWith('u9')
  })
})

describe('the budget guard', () => {
  it('draws a replace as one card, both sides by name', async () => {
    await renderWithProviders(
      <OfferOutcome
        threadId="campaign:c1"
        turnId="t1"
        undoStates={{}}
        disabled={false}
        outcome={{
          reoffered: false,
          notMade: [],
          replaced: {
            deleted: 12,
            kept: 0,
            draftedCount: 12,
            drafted: [
              { id: 'n1', title: 'A pool in the rock', platform: 'Instagram' },
            ],
            removed: [
              {
                id: 'o1',
                title: 'Wedding packages, 2026',
                platform: 'LinkedIn',
                fitPct: 31,
              },
            ],
            period: { label: 'April', target: 20, planned: 20, left: 0 },
          },
        }}
      />,
    )
    expect(screen.getByText('REPLACED')).toBeTruthy()
    expect(
      screen.getByText('12 drafted, 12 weaker drafts removed'),
    ).toBeTruthy()
    expect(screen.getByText('April stays at 20')).toBeTruthy()
    expect(screen.getByText('DRAFTED · 12')).toBeTruthy()
    expect(screen.getByText('REMOVED · 12')).toBeTruthy()
    expect(screen.getByText('LinkedIn · fit 31')).toBeTruthy()
    expect(screen.getAllByText('and 11 more')).toHaveLength(2)
    // The drafts are deleted for good: no UNDO.
    expect(screen.queryByText('UNDO')).toBeNull()
  })

  it('shows a draft’s fit once its scoring lands, and nothing on a failure (CON-511)', async () => {
    const { noteFreshScore, useFreshScoreStore } =
      await import('@/stores/freshScoreStore')
    useFreshScoreStore.setState({ scores: {} })
    await renderWithProviders(
      <OfferOutcome
        threadId="campaign:c1"
        turnId="t1"
        undoStates={{}}
        disabled={false}
        outcome={{
          reoffered: false,
          notMade: [],
          replaced: {
            deleted: 1,
            kept: 0,
            draftedCount: 1,
            drafted: [{ id: 'n1', title: 'A pool', platform: 'Instagram' }],
            removed: [{ id: 'o1', title: 'Old', platform: 'LinkedIn' }],
          },
        }}
      />,
    )
    expect(screen.getByText('Instagram')).toBeTruthy()
    act(() => noteFreshScore('n1', 82))
    expect(screen.getByText('Instagram · fit 82')).toBeTruthy()
  })

  it('keeps what it drafted, and the drafting’s warnings, when it deleted nothing', async () => {
    await renderWithProviders(
      <OfferOutcome
        threadId="campaign:c1"
        turnId="t1"
        undoStates={{}}
        disabled={false}
        draftWarnings={['One post came out short.']}
        outcome={{
          reoffered: false,
          notMade: [],
          replaced: {
            deleted: 0,
            kept: 2,
            draftedCount: 2,
            drafted: [
              { id: 'n1', title: 'A pool in the rock', platform: 'Instagram' },
            ],
            removed: [],
          },
        }}
      />,
    )
    expect(screen.getByText('NOTHING DELETED')).toBeTruthy()
    expect(screen.getByText('2 drafted, nothing deleted')).toBeTruthy()
    expect(screen.getByText('A pool in the rock')).toBeTruthy()
    expect(screen.getByText('One post came out short.')).toBeTruthy()
    expect(
      screen.getByText(
        '2 kept: they changed since the offer, or weren’t needed.',
      ),
    ).toBeTruthy()
  })

  it('says a removal put off until its scheduled posts are out', async () => {
    await renderWithProviders(
      <OfferOutcome
        threadId="campaign:c1"
        turnId="t1"
        undoStates={{}}
        disabled={false}
        outcome={{
          reoffered: false,
          notMade: [],
          later: { removed: 'LinkedIn', until: '2026-04-22T09:00:00Z' },
        }}
      />,
    )
    expect(screen.getByText('NOTHING REMOVED')).toBeTruthy()
    expect(
      screen.getByText('LinkedIn stays until its scheduled posts are out'),
    ).toBeTruthy()
  })

  it('shows each option’s cost, the recommended one’s why and the footnote', () => {
    useAssistantStore.setState({ confirmProposal: vi.fn(async () => {}) })
    render(
      <ProposalCard
        threadId="t"
        disabled={false}
        proposal={{
          id: 'pr1',
          tool: 'updateCampaignPlatforms',
          summary: 'LinkedIn has 3 posts in this campaign',
          status: 'pending',
          recommended: 'unschedule',
          options: [
            {
              id: 'unschedule',
              title: 'Unschedule 1, then remove',
              description: '“Three nights” goes back to ready to publish.',
              why: 'No post publishes where the campaign no longer is.',
            },
            {
              id: 'later',
              title: 'Remove later',
              description: 'Keep LinkedIn until Tue 22.',
            },
          ],
          card: {
            rows: [],
            sources: [],
            footnote: 'A post already scheduled to LinkedIn would publish…',
          },
        }}
      />,
    )
    expect(screen.getByText('CHOOSE')).toBeTruthy()
    expect(
      screen.getByText('“Three nights” goes back to ready to publish.'),
    ).toBeTruthy()
    expect(
      screen.getByText('No post publishes where the campaign no longer is.'),
    ).toBeTruthy()
    expect(
      screen.getByText('A post already scheduled to LinkedIn would publish…'),
    ).toBeTruthy()
  })

  it('marks the posts a removal leaves in amber on the offer', () => {
    render(
      <ProposalCard
        threadId="t"
        disabled={false}
        proposal={{
          id: 'pr1',
          tool: 'updateCampaignPlatforms',
          summary: 'Stop using Reels on Instagram',
          status: 'pending',
          options: [],
          card: {
            verb: 'Remove reel',
            rows: [
              {
                kind: 'posts',
                value: '3 unpublished posts are on reel',
                note: 'they stay, flagged “not a post type of this campaign”',
              },
            ],
            sources: [],
          },
        }}
      />,
    )
    expect(
      screen.getByText('they stay, flagged “not a post type of this campaign”')
        .className,
    ).toContain('text-warning-ink')
    expect(screen.getByText('Remove reel')).toBeTruthy()
  })
})

const state: CampaignState = {
  goal: {
    cadence: 'month',
    perPeriod: 20,
    target: 60,
    planned: 34,
    room: 26,
    unknown: false,
    period: {
      label: 'April',
      cadence: 'month',
      index: 2,
      start: '2026-04-01',
      end: '2026-04-30',
      target: 20,
      planned: 14,
      left: 6,
    },
  },
  calendar: { total: 2 },
  posts: 34,
  platforms: [
    { id: 'p1', name: 'Instagram' },
    { id: 'p2', name: 'LinkedIn' },
  ],
  sources: {
    wholeBank: false,
    attached: 8,
    notReady: 4,
    items: [
      { id: 'a1', title: 'Villa Aurora brochure 2026', status: 'ready' },
      { id: 'a2', title: 'Chef’s notes, March', status: 'analysing' },
      { id: 'a3', title: 'Wedding pricing.docx', status: 'unreadable' },
    ],
  },
}

describe('what it knows', () => {
  it('cites the parts the reply relied on, in its order (CON-511)', () => {
    render(
      <StateCitation
        state={state}
        cites={['period', 'calendar', 'sources', 'goal', 'posts', 'platforms']}
      />,
    )
    expect(screen.getByText('Read from the campaign')).toBeTruthy()
    expect(
      screen.getByText(
        'April 14 of 20 · 2 conflicts · 4 of 8 sources ready · 20 a month · 34 posts · Instagram and LinkedIn',
      ),
    ).toBeTruthy()
  })

  it('cites only what was relied on', () => {
    render(<StateCitation state={state} cites={['calendar']} />)
    expect(screen.getByText('2 conflicts')).toBeTruthy()
    expect(screen.queryByText(/April/)).toBeNull()
  })

  it('names a week by its days', () => {
    render(
      <StateCitation
        state={{
          goal: {
            ...state.goal!,
            cadence: 'week',
            period: {
              label: 'this week',
              cadence: 'week',
              index: 3,
              start: '2026-04-13',
              end: '2026-04-19',
              target: 5,
              planned: 4,
              left: 1,
            },
          },
        }}
        cites={['period']}
      />,
    )
    expect(screen.getByText(/^Apr 13\s?–\s?19 4 of 5$/)).toBeTruthy()
  })

  it('says nothing with nothing cited, or nothing it can say', () => {
    const { container } = render(<StateCitation state={state} cites={[]} />)
    expect(container.textContent).toBe('')
    const { container: none } = render(
      <StateCitation state={{}} cites={['goal', 'sources']} />,
    )
    expect(none.textContent).toBe('')
  })

  it('lists the sources and how each stands, with OPEN ASSETS', async () => {
    await renderWithProviders(<SourcesCard state={state} campaignId="c1" />)
    expect(screen.getByText('4 of 8 ready')).toBeTruthy()
    expect(screen.getByText('analysing').className).toContain(
      'text-warning-ink',
    )
    expect(screen.getByText('couldn’t be read')).toBeTruthy()
    expect(screen.getByText('OPEN ASSETS').getAttribute('href')).toBe(
      '/campaigns/c1/assets',
    )
  })
})

describe('Strategy’s memory of a removal', () => {
  it('undoes one removal and keeps striking the other', () => {
    const store = useAssistantRemovalStore.getState()
    store.mark('c1', {
      before: [
        { id: 'fb', post_types: ['image-post'] },
        { id: 'li', post_types: ['text-post'] },
      ],
      removed: 'Facebook',
      undoId: 'u1',
    })
    store.mark('c1', {
      before: [{ id: 'li', post_types: ['text-post'] }],
      removed: 'LinkedIn',
      undoId: 'u2',
    })
    useAssistantRemovalStore.getState().clear('c1', 'u2')
    const left = useAssistantRemovalStore.getState().removals.c1
    expect(left?.map((r) => r.removed)).toEqual(['Facebook'])
    expect(targetedBefore(left ?? [])).toEqual([
      { id: 'fb', post_types: ['image-post'] },
      { id: 'li', post_types: ['text-post'] },
    ])
    useAssistantRemovalStore.getState().clear('c1', 'u1')
    expect(useAssistantRemovalStore.getState().removals.c1).toBeUndefined()
  })
})

describe('a post outside its campaign', () => {
  const targets = [{ id: 'ig', post_types: ['image-post', 'carousel'] }]
  it('is outside a platform the campaign no longer has', () => {
    expect(
      outsideCampaign(
        { platform_id: 'li', platform_post_type: 'text-post', status: 'draft' },
        targets,
      ),
    ).toBe('platform')
  })
  it('is outside a post type the campaign no longer takes', () => {
    expect(
      outsideCampaign(
        { platform_id: 'ig', platform_post_type: 'reel', status: 'draft' },
        targets,
      ),
    ).toBe('postType')
  })
  it('isn’t once published, unpicked or unrestricted', () => {
    expect(
      outsideCampaign(
        { platform_id: 'li', platform_post_type: '', status: 'published' },
        targets,
      ),
    ).toBeNull()
    expect(
      outsideCampaign(
        { platform_id: 'ig', platform_post_type: '', status: 'draft' },
        targets,
      ),
    ).toBeNull()
    expect(
      outsideCampaign(
        { platform_id: 'ig', platform_post_type: 'reel', status: 'draft' },
        [{ id: 'ig', post_types: [] }],
      ),
    ).toBeNull()
    expect(
      outsideCampaign(
        { platform_id: 'li', platform_post_type: '', status: 'draft' },
        [],
      ),
    ).toBeNull()
  })
})

describe('in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words the removal and the citation', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    render(
      <>
        <ResultCard
          details={{
            platforms: {
              removed: 'Facebook',
              postsLeft: { posts: 0, scheduled: 0 },
              kept: [],
              unscheduled: 0,
            },
          }}
        />
        <StateCitation state={state} cites={['period']} />
      </>,
    )
    expect(screen.getByText('Facebook ya no está en la campaña')).toBeTruthy()
    expect(screen.getByText('sin publicaciones')).toBeTruthy()
    expect(screen.getByText('Leído de la campaña')).toBeTruthy()
    // The period in Spanish, from its data rather than the English label.
    expect(screen.getByText('abril 14 de 20')).toBeTruthy()
    expect(screen.queryByText('Facebook is off the campaign')).toBeNull()
  })
})
