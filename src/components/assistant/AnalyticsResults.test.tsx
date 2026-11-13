import { screen } from '@testing-library/react'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { AnalyticsResults as Results } from '@/types/assistant'
import { AnalyticsResults } from './AnalyticsResults'

vi.mock('@/hooks/usePlatforms', () => ({
  usePlatformCatalog: () => ({
    resolve: (slug: string) =>
      ({ instagram: { name: 'Instagram' }, linkedin: { name: 'LinkedIn' } })[
        slug
      ],
  }),
}))

const march = {
  from: '2026-03-01',
  to: '2026-03-31',
  platforms: ['instagram'],
  campaign: { id: 'c1', name: 'Spring reopening' },
}

function show(results: Results) {
  return renderWithProviders(<AnalyticsResults results={results} />)
}

describe('an analytics read', () => {
  it('cites a cadence over its weeks, and the followers over the window', async () => {
    await show({
      frequency: {
        applied: { platforms: ['instagram'] },
        data: [],
        summary: {
          cadence: {
            weeks: [
              { weekStart: '2026-03-02', posts: 2, current: false },
              { weekStart: '2026-03-09', posts: 3, current: true },
            ],
            perWeek: 2.8,
            lastMonth: 4,
            platforms: [{ platform: 'instagram', perWeek: 2.8 }],
          },
        },
      },
      followers: {
        applied: { ...march, preset: '30d', campaign: undefined },
        data: [
          {
            id: 'a1',
            platform: 'instagram',
            username: 'villa',
            followers: 4812,
            growth: 286,
            growthPct: 6.3,
            series: [4526, 4812],
          },
        ],
        summary: {
          date: '2026-03-15',
          gain: 57,
          postTitle: 'Thermal pool reel',
        },
      },
    })
    expect(screen.getByText('2.8 posts a week')).toBeTruthy()
    expect(screen.getByText('4 last month')).toBeTruthy()
    expect(
      screen.getByText(
        'Last 2 weeks · Instagram · All campaigns · posts published through Ogen',
      ),
    ).toBeTruthy()
    expect(screen.getByText('4,812')).toBeTruthy()
    expect(screen.getByText('+286')).toBeTruthy()
    expect(screen.getByText('+57 · Thermal pool reel')).toBeTruthy()
    expect(
      screen.getByText('Last 30 days · Instagram · All campaigns'),
    ).toBeTruthy()
  })

  it('names the overview by its campaign and platforms, against the days before', async () => {
    await show({
      overview: {
        applied: march,
        data: {
          window: { from: march.from, to: march.to, days: 31 },
          updated_at: '',
          cards: [
            {
              metric: 'reach',
              label: 'Cumulative reach',
              value: 31400,
              delta_pct: -12,
              direction: 'down',
              baseline: 'insufficient_history',
              sparkline: [],
            },
          ],
          series: {} as never,
          insights: [],
        },
      },
    })
    expect(
      screen.getByText('Spring reopening on Instagram', { selector: 'h3' }),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Mar 1 – Mar 31 · Instagram · Spring reopening · against the 31 days before',
      ),
    ).toBeTruthy()
    expect(screen.getByText('−12%').className).toContain('text-warning')
  })

  it('says why a read has no figures, and still cites it', async () => {
    await show({
      bestTimes: {
        applied: { platforms: [] },
        unavailable: 'addon_required',
      },
    })
    expect(
      screen.getByText('Needs the publisher’s Analytics add-on'),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'All time · All platforms · All campaigns · hours in UTC',
      ),
    ).toBeTruthy()
  })

  it('ranks the best times as counts, with the runner-up and the weakest', async () => {
    await show({
      bestTimes: {
        applied: { platforms: [] },
        data: [],
        summary: {
          best: { day: 3, hour: 18, interactions: 42, posts: 9 },
          runnerUp: { day: 1, hour: 18, interactions: 35, posts: 6 },
          weakest: { day: 6, hour: 7, interactions: 4, posts: 3 },
          tooFew: false,
          minPosts: 3,
        },
      },
    })
    expect(screen.getByText('Thursday at 18:00')).toBeTruthy()
    expect(screen.getByText('then Tuesday at 18:00')).toBeTruthy()
    expect(screen.getByText('42 avg interactions')).toBeTruthy()
    expect(screen.getByText('weakest · 3 posts')).toBeTruthy()
  })

  it('says there are too few posts to draw a decay', async () => {
    await show({ decay: { applied: { platforms: [] }, data: [] } })
    expect(
      screen.getByText('Too few posts to draw how engagement builds yet.'),
    ).toBeTruthy()
  })

  it('heads a sorted list by its end and platform, and names its platform', async () => {
    await show({
      posts: {
        applied: { platforms: ['linkedin'] },
        data: {
          total: 14,
          sortBy: 'engagement',
          order: 'asc',
          items: [
            {
              postId: 'p1',
              title: 'Rooftop at dusk',
              platform: 'linkedin',
              publishedAt: '2026-03-04',
              reach: 900,
              rate: 0.012,
            },
          ],
        },
      },
    })
    expect(screen.getByText('1 lowest on LinkedIn')).toBeTruthy()
    expect(
      screen.getByText(
        'All time · LinkedIn · All campaigns · sorted by engagement rate',
      ),
    ).toBeTruthy()
    expect(screen.getByText('OPEN').getAttribute('href')).toBe(
      '/analytics?platform=linkedin',
    )
  })

  it('compares two periods: points for a rate, a count for posts', async () => {
    await show({
      compare: {
        first: march,
        second: { ...march, from: '2026-04-01', to: '2026-04-30' },
        metrics: [
          {
            metric: 'reach',
            label: 'Cumulative reach',
            unit: 'count',
            first: 100,
            second: 150,
            change: 50,
            changePct: 50,
          },
          {
            metric: 'engagement_rate',
            label: 'Engagement rate',
            unit: 'rate',
            first: 3.6,
            second: 4.2,
            change: 0.6,
            changePct: 16.7,
          },
          {
            metric: 'posts_published',
            label: 'Posts',
            unit: 'count',
            first: 12,
            second: 9,
            change: -3,
            changePct: -25,
          },
        ],
      },
    })
    expect(screen.getByText('April beat March')).toBeTruthy()
    expect(screen.getByText('on 2 of 3')).toBeTruthy()
    // A whole calendar month heads its column by name.
    expect(screen.getByText('March', { selector: 'span' })).toBeTruthy()
    expect(screen.getByText('+50%').className).not.toContain('text-warning')
    expect(screen.getByText('+0.6 pt')).toBeTruthy()
    expect(screen.getByText('−3').className).toContain('text-warning')
    expect(
      screen.getByText(
        'Mar 1 – Mar 31 vs Apr 1 – Apr 30 · Instagram · Spring reopening',
      ),
    ).toBeTruthy()
    expect(screen.getByText(/31 days against 30/)).toBeTruthy()
  })

  it('calls a comparison level when rises and falls balance, unchanged ones counting for neither', async () => {
    const metric = (name: string, change: number) => ({
      metric: name,
      label: name,
      unit: 'count' as const,
      first: 10,
      second: 10 + change,
      change,
      changePct: change * 10,
    })
    await show({
      compare: {
        first: march,
        second: { ...march, from: '2026-04-01', to: '2026-04-30' },
        metrics: [
          metric('reach', 1),
          metric('interactions', -1),
          metric('followers', 0),
        ],
      },
    })
    expect(screen.getByText('April level with March')).toBeTruthy()
    expect(screen.getByText('up on 1, down on 1')).toBeTruthy()
  })
})

describe('more like these', () => {
  it('shows the trail a level a row, then the ideas and one sources line', async () => {
    await show({
      more: {
        campaignId: 'c1',
        filter: 'origin=more_like_these&run=r1',
        grounding: [],
        trail: [
          {
            postId: 'p1',
            title: 'The thermal pool at dusk',
            rate: 0.052,
            ideas: [
              {
                id: 'i1',
                title: 'The pool cut into the rock',
                analysis: { id: 'an1' },
                asset: {
                  id: 'a1',
                  title: 'Villa Aurora brochure',
                  type: 'PDF',
                },
                passages: ['p. 12'],
              },
            ],
            assets: [],
            noTrail: false,
          },
        ],
        ideas: [
          {
            id: 'n1',
            title: 'Six rooms, one pool',
            grounding: {
              mode: 'grounded',
              sources: [
                {
                  id: 'a1',
                  title: 'Villa Aurora brochure',
                  analysisId: 'an1',
                  ideaId: 'i1',
                },
              ],
            },
          },
        ],
      },
    })
    expect(screen.getByText('Where the examples came from')).toBeTruthy()
    expect(screen.getByText('The pool cut into the rock')).toBeTruthy()
    expect(screen.getByText('Workspace analysis')).toBeTruthy()
    expect(screen.getByText('Villa Aurora brochure · p. 12')).toBeTruthy()
    expect(screen.getByText('Planned 1 idea')).toBeTruthy()
    // One sources line for the card; no per-idea repeat.
    expect(screen.queryByText('From Villa Aurora brochure')).toBeNull()
    expect(
      screen
        .getByRole('link', { name: 'Villa Aurora brochure' })
        .getAttribute('href'),
    ).toBe('/assets/a1')
    expect(screen.getByText('OPEN').getAttribute('href')).toContain(
      '/campaigns/c1/ideas',
    )
  })

  it('cites a post as a source by name, without linking it', async () => {
    await show({
      more: {
        grounding: [],
        trail: [],
        ideas: [
          {
            id: 'n2',
            title: 'The rooftop at the hour it opens',
            grounding: {
              mode: 'grounded',
              sources: [{ id: 'p2', title: 'Opening day', kind: 'post' }],
            },
          },
        ],
      },
    })
    expect(screen.getByText('Opening day')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Opening day' })).toBeNull()
  })

  it('draws no DONE card when it saved no ideas, and keeps the trail', async () => {
    await show({
      more: {
        grounding: [],
        trail: [
          {
            postId: 'p2',
            title: 'Opening day on the rooftop',
            ideas: [],
            assets: [],
            noTrail: true,
          },
        ],
        ideas: [],
      },
    })
    expect(screen.queryByText(/Planned/)).toBeNull()
    // A confirmed offer collapses to a line, so the result keeps the trail.
    expect(screen.getByText('No trail recorded')).toBeTruthy()
  })
})

describe('in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words the cards and their citations', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show({
      decay: {
        applied: { platforms: [] },
        data: [
          { label: '0-6h', pct: 45, posts: 9 },
          { label: '6-12h', pct: 70, posts: 9 },
        ],
        summary: {
          halfLife: { hours: 7, bucket: '6-12h' },
          platforms: [],
        },
      },
    })
    expect(
      screen.getByText('La mitad de la interacción llega en 7 horas'),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Desde siempre · Todas las plataformas · Todas las campañas',
      ),
    ).toBeTruthy()
    expect(screen.queryByText(/Half the engagement/)).toBeNull()
    expect(screen.queryByText(/All platforms/)).toBeNull()
  })
})
