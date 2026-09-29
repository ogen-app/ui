import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import * as api from '@/services/api/series'
import { seriesPlan } from '@/lib/seriesPlan'
import { planLine, rhythmLine, supplyLine } from './format'
import type { ContentSeries } from './types'
import type { Campaign } from '@/types/campaigns'

/**
 * Two things about Series that an ordinary English test cannot tell you.
 *
 * **That the flag is free.** With `series` off the feature must not merely
 * render nothing — it must not *ask* for anything. The card sits on the
 * campaign's Strategy page, which is an ordinary screen people open all day, so
 * an unconditional query there would open a request for a card that cannot be
 * shown. Today the stub answers from `localStorage` and the cost is
 * invisible; it appears on the day the real endpoint is swapped in, which is
 * the worst moment to discover it. Same guard, and the same reasoning, as
 * `HelpTrigger`'s.
 *
 * **That the screens are actually converted.** In English a literal in a
 * component and a catalogue entry are the same string, so only rendering in
 * another language can tell them apart — hence the Spanish cases below, which
 * assert both that the Spanish copy is there and that the English words that
 * would have been literals are not. Spanish being gated off in `i18n/config.ts`
 * does not matter: the gate is on the entry points that choose a locale, never
 * on i18next.
 */

vi.mock('@/config/featureFlags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/featureFlags')>()
  return { ...actual, useFeatureFlag: vi.fn(() => false) }
})

const { useFeatureFlag } = await import('@/config/featureFlags')
const { useCampaignSeries, useSeriesLibrary } =
  await import('@/hooks/useSeries')
const { SeriesSection } = await import('./SeriesSection')
const { CampaignSeriesCard } = await import('./CampaignSeriesCard')

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.mocked(useFeatureFlag).mockReturnValue(false)
})

describe('with the flag off', () => {
  it('asks the library for nothing', async () => {
    const list = vi.spyOn(api, 'listSeries')

    const { result } = renderHook(() => useSeriesLibrary(), { wrapper })

    expect(list).not.toHaveBeenCalled()
    // Not merely "no data" — the query never runs, so nothing is pending
    // either. A screen branching on `isPending` must not sit on a spinner for
    // a feature that is switched off.
    expect(result.current.fetchStatus).toBe('idle')
  })

  it("asks a campaign's page for nothing", () => {
    const get = vi.spyOn(api, 'getCampaignSeries')

    renderHook(() => useCampaignSeries('c1'), { wrapper })

    expect(get).not.toHaveBeenCalled()
  })

  it('still runs when a caller overrides the default', async () => {
    // The override exists so a harness and these tests can exercise the query
    // without switching the build's flag. If it stopped working the guard
    // above would be untestable, and an untested guard is the one that rots.
    vi.spyOn(api, 'listSeries').mockResolvedValue([])

    const { result } = renderHook(() => useSeriesLibrary({ enabled: true }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

const DIGEST: ContentSeries = {
  id: 's1',
  name: 'Resumen semanal',
  promise: 'La semana en un minuto.',
  recipe: 'Empieza por lo más importante.',
  supply: 'self',
  formatId: 'digest',
  defaultRhythm: { times: 1, per: 'week' },
  scope: { kind: 'workspace' },
  usage: { drafts: 2, published: 5 },
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('in Spanish', () => {
  beforeAll(async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
  })

  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('draws a series card from the catalogue', () => {
    vi.mocked(useFeatureFlag).mockReturnValue(true)

    render(<SeriesSection series={[DIGEST]} />)

    expect(
      screen.getByText('Una vez por semana', { exact: false }),
    ).toBeInTheDocument()
    expect(screen.getByText('Aporta su propio tema')).toBeInTheDocument()
    expect(screen.getByText('AÑADIR SERIE')).toBeInTheDocument()
    // The words that would still be here if any of this were a literal.
    expect(
      screen.queryByText('Once a week', { exact: false }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('ADD SERIES')).not.toBeInTheDocument()
  })

  it('offers the starters in Spanish on an empty library', () => {
    vi.mocked(useFeatureFlag).mockReturnValue(true)

    render(<SeriesSection series={[]} />)

    expect(screen.getByText('Tres para empezar')).toBeInTheDocument()
    expect(screen.getByText('Resumen semanal de noticias')).toBeInTheDocument()
    expect(screen.queryByText('Weekly news digest')).not.toBeInTheDocument()
  })

  /**
   * The pure formatters, which only come out in Spanish because they take `t`
   * rather than closing over a label map — the rule `analytics/format.ts` is
   * the worked example for. A module-level constant here would have frozen
   * English at import and gone on serving it after the switch.
   */
  it('produces its words in the active language', () => {
    expect(rhythmLine(i18next.t, null)).toBe('Ocasional')
    expect(rhythmLine(i18next.t, { times: 3, per: 'month' })).toBe(
      '3 veces al mes',
    )
    expect(supplyLine(i18next.t, 'idea')).toBe('Espera una idea')
  })

  /**
   * The card CON-305 moved onto Strategy. Worth its own case because the move
   * gave it a heading, a hint line and the house row styling it did not have as
   * a band — new copy, which in English is indistinguishable from a literal.
   */
  it("draws a campaign's series card from the catalogue", async () => {
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    vi.spyOn(api, 'listSeries').mockResolvedValue([DIGEST])
    vi.spyOn(api, 'getCampaignSeries').mockResolvedValue({
      campaignId: 'c1',
      runs: [{ seriesId: DIGEST.id, rhythm: { times: 1, per: 'week' } }],
    })

    await renderWithProviders(
      <CampaignSeriesCard
        campaign={
          {
            id: 'c1',
            start_date: '2026-01-01T00:00:00Z',
            end_date: '2026-01-28T00:00:00Z',
          } as Campaign
        }
      />,
    )

    // Four weeks of a weekly series, per row — the arithmetic the share line
    // under the post goal sums, and the only number this card states.
    expect(await screen.findByText('4 publicaciones')).toBeInTheDocument()
    expect(screen.getByText('Aporta su propio tema')).toBeInTheDocument()
    expect(screen.getByText('ESCRIBIR UNA')).toBeInTheDocument()
    // The words that would still be here if any of this were a literal.
    expect(screen.queryByText('4 posts')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Supplies its own subject'),
    ).not.toBeInTheDocument()
  })

  it('states the plan in Spanish, including the oversubscribed case', () => {
    const over = seriesPlan({
      postsPerPeriod: 2,
      cadence: 'month',
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-01-28T00:00:00Z',
      runs: [{ seriesId: 's1', rhythm: { times: 1, per: 'week' } }],
    })

    const line = planLine(i18next.t, over)
    expect(line).toContain('reclaman 4')
    expect(line).not.toContain('claim')
  })
})
