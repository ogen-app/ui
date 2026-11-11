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
  it('cites the period, the platforms and the campaign it read', async () => {
    await show({
      frequency: {
        applied: { platforms: ['instagram'] },
        data: [
          { platform: 'instagram', perWeek: 2, rate: 3.2, weeks: 4 },
          { platform: 'instagram', perWeek: 3, rate: 4.1, weeks: 12 },
        ],
      },
      followers: {
        applied: { ...march, campaign: undefined },
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
      },
    })
    expect(screen.getByText('3 posts a week do best')).toBeTruthy()
    expect(
      screen.getByText('Instagram · every connected account, all time'),
    ).toBeTruthy()
    expect(screen.getAllByText('4,812')).toHaveLength(2)
    expect(
      screen.getByText(
        'Instagram · workspace-wide: followers belong to accounts',
      ),
    ).toBeTruthy()
  })

  it('names a windowed read’s campaign, and spells out every platform', async () => {
    await show({
      overview: {
        applied: { ...march, platforms: [] },
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
      screen.getByText('Spring reopening', { selector: 'h3' }),
    ).toBeTruthy()
    expect(
      screen.getByText('Mar 1 – Mar 31 · Every platform · Spring reopening'),
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
      screen.getByText('Every platform · every connected account, all time'),
    ).toBeTruthy()
  })

  it('compares two periods with the server’s change, a fall in amber', async () => {
    await show({
      compare: {
        first: march,
        second: { ...march, from: '2026-04-01', to: '2026-04-30' },
        metrics: [
          {
            metric: 'reach',
            label: 'Cumulative reach',
            first: 100,
            second: 150,
            change: 50,
            changePct: 50,
          },
          {
            metric: 'posts_published',
            label: 'Posts',
            first: 12,
            second: 9,
            change: -3,
            changePct: -25,
          },
        ],
      },
    })
    expect(
      screen.getByText('Mar 1 – Mar 31 against Apr 1 – Apr 30'),
    ).toBeTruthy()
    expect(screen.getByText('+50%').className).not.toContain('text-warning')
    expect(screen.getByText('−25%').className).toContain('text-warning')
    expect(screen.getByText('Instagram · Spring reopening')).toBeTruthy()
  })
})

describe('more like these', () => {
  it('shows the trail, then the ideas and their sources', async () => {
    await show({
      more: {
        campaignId: 'c1',
        grounding: [],
        trail: [
          {
            postId: 'p1',
            title: 'The thermal pool at dusk',
            ideas: [
              {
                id: 'i1',
                title: 'The pool cut into the rock',
                asset: { id: 'a1', title: 'Villa Aurora brochure' },
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
    expect(screen.getByText('Where 1 post came from')).toBeTruthy()
    expect(
      screen.getByText(
        'Idea: The pool cut into the rock, from Villa Aurora brochure',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Planned 1 idea')).toBeTruthy()
    // The idea says what it cites, and the line links the asset.
    expect(screen.getByText('From Villa Aurora brochure')).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: 'Villa Aurora brochure' })
        .getAttribute('href'),
    ).toBe('/assets/a1')
    expect(screen.getByText('OPEN').getAttribute('href')).toBe(
      '/campaigns/c1/ideas',
    )
  })

  it('says when no trail was recorded, and that its ideas are not grounded', async () => {
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
        ideas: [
          {
            id: 'n2',
            title: 'The rooftop at the hour it opens',
            grounding: { mode: 'exploratory', sources: [] },
          },
        ],
      },
    })
    expect(screen.getByText('No trail recorded')).toBeTruthy()
    // On the idea's row, and on the sources line under the card.
    expect(screen.getAllByText('Not grounded')).toHaveLength(2)
  })

  it('says nothing of sources when no idea says how it was grounded', async () => {
    await show({
      more: {
        grounding: [],
        trail: [],
        ideas: [{ id: 'n3', title: 'Pasted, not cited' }],
      },
    })
    expect(screen.getByText('Pasted, not cited')).toBeTruthy()
    expect(screen.queryByText('Sources')).toBeNull()
    expect(screen.queryByText('Not grounded')).toBeNull()
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
      },
    })
    expect(screen.getByText('La mitad de la interacción en 6-12h')).toBeTruthy()
    expect(
      screen.getByText(
        'Todas las plataformas · todas las cuentas conectadas, desde siempre',
      ),
    ).toBeTruthy()
    expect(screen.queryByText('Half the engagement by 6-12h')).toBeNull()
    expect(screen.queryByText(/Every platform/)).toBeNull()
  })
})
