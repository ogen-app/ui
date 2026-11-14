import { fireEvent, render, screen } from '@testing-library/react'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAssistantStore } from '@/stores/assistantStore'
import { outsideCampaign } from '@/lib/campaignTarget'
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
    period: { label: 'April', target: 20, planned: 14, left: 6 },
  },
  calendar: { total: 2 },
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
  it('cites the figures a reply leaned on in one line', () => {
    render(<StateCitation state={state} />)
    expect(screen.getByText('Read from the campaign')).toBeTruthy()
    expect(
      screen.getByText('April 14 of 20 · 2 conflicts · 4 of 8 sources ready'),
    ).toBeTruthy()
  })

  it('says nothing with nothing to cite', () => {
    const { container } = render(<StateCitation state={{}} />)
    expect(container.textContent).toBe('')
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
        <StateCitation state={state} />
      </>,
    )
    expect(screen.getByText('Facebook ya no está en la campaña')).toBeTruthy()
    expect(screen.getByText('sin publicaciones')).toBeTruthy()
    expect(screen.getByText('Leído de la campaña')).toBeTruthy()
    expect(screen.queryByText('Facebook is off the campaign')).toBeNull()
  })
})
