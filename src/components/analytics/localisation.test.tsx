import { render, screen } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { buildPostPerformanceView } from '@/lib/postAnalyticsView'
import type { PostAnalyticsSnapshot } from '@/types/analytics'
import type { PostFacts } from '@/lib/postAnalyticsView'
import { PostAnalyticsSurface } from './PostPerformance'
import { formatCount, formatHours, measureCopy, periodPhrase } from './format'

/**
 * The surface in a language that is not English.
 *
 * The point of the conversion, asserted the only way it can honestly be: by
 * rendering in Spanish and reading what comes out. Every other test on these
 * surfaces runs in English, where a literal left in a component and a catalogue
 * entry are indistinguishable — this is the one that can tell them apart.
 *
 * Spanish is gated off in `i18n/config.ts` and this does not care: the gate is
 * on the entry points that *choose* a locale, never on `setLocale` or on
 * i18next itself, which is exactly so the machinery stays exercised while
 * nothing but English ships.
 */

const NOW = new Date('2026-08-22T08:00:00Z')

const FACTS: PostFacts = {
  title: 'Lo que aprendimos publicando en abierto',
  platform: 'linkedin',
  format: 'Imagen única',
  publishedAt: '2026-08-20T09:00:00Z',
  scheduledAt: null,
  campaign: 'Lanzamiento de otoño',
  socialAccountId: 'acc_1',
}

const SNAPSHOT: PostAnalyticsSnapshot = {
  post_id: 'post_1',
  publisher: 'zernio',
  publisher_post_id: 'z_1',
  sync_status: 'synced',
  metrics_last_updated: '2026-08-22T06:00:00Z',
  last_refreshed_at: '2026-08-22T07:00:00Z',
  analytics: {
    impressions: 5900,
    reach: 4210,
    likes: 96,
    comments: 12,
    shares: 4,
    saves: 31,
    clicks: 88,
    views: 0,
    engagement_rate: 0.034,
  },
  platform_analytics: [
    {
      platform: 'linkedin',
      account_username: 'ogen',
      platform_post_url: 'https://linkedin.com/feed/update/1',
      analytics: {
        impressions: 5900,
        reach: 4210,
        likes: 96,
        comments: 12,
        shares: 4,
        saves: 31,
        clicks: 88,
        views: 0,
        engagement_rate: 0.034,
      },
    },
  ],
}

beforeAll(async () => {
  await loadLocaleResources('es')
  await i18next.changeLanguage('es')
})

afterAll(async () => {
  await i18next.changeLanguage('en')
})

describe('the post surface in Spanish', () => {
  it('draws its headings and notes from the catalogue', () => {
    const view = buildPostPerformanceView(i18next.t, SNAPSHOT, FACTS, NOW)
    render(<PostAnalyticsSurface view={view} />)

    expect(screen.getByText('La publicación')).toBeInTheDocument()
    expect(screen.getByText('Resumen de rendimiento')).toBeInTheDocument()
    // The maturity note: 47 hours old, so still counting.
    expect(
      screen.getByText(/Sigue contando — cada cifra de arriba/),
    ).toBeInTheDocument()
  })

  it('names the measures and their comparisons in Spanish', () => {
    const view = buildPostPerformanceView(i18next.t, SNAPSHOT, FACTS, NOW)
    render(<PostAnalyticsSurface view={view} />)

    // The tile labels come from `analytics.measures`, the card headings from
    // the same place — so one assertion covers the split that the behavioural
    // table and the catalogue now sit either side of.
    expect(screen.getAllByText('Alcance').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tasa de interacción').length).toBeGreaterThan(0)
    // No typical to compare against on this endpoint, and it says so — on
    // every tile in the overview, and again beside every measure card's own
    // headline figure, which is why this is a floor rather than a count.
    expect(
      screen.getAllByText('aún no hay valor habitual').length,
    ).toBeGreaterThanOrEqual(view.metrics.length)
  })

  it('leaves no English behind on the card the user reads first', () => {
    const view = buildPostPerformanceView(i18next.t, SNAPSHOT, FACTS, NOW)
    const { container } = render(<PostAnalyticsSurface view={view} />)

    // The words that were literals in components before this pass. Any one of
    // them surviving a language switch means a `t()` was missed.
    for (const english of [
      'The post',
      'Performance overview',
      'Still counting',
      'no typical yet',
      'Running total',
      'Campaign',
    ]) {
      expect(container.textContent).not.toContain(english)
    }
  })
})

describe('numbers and spans follow the language too', () => {
  it('groups thousands the way the locale writes them', () => {
    // The trap this closes: `toLocaleString('en-US')` printed `12,400` in a
    // Spanish UI, where a comma is a decimal point — twelve point four.
    expect(formatCount(i18next.t, 4210)).toBe('4210')
    expect(formatCount(i18next.t, 12_400)).toBe('12,4 mil')
  })

  it('writes a span in the language, not in English units', () => {
    expect(formatHours(i18next.t, 19)).toBe('19 h')
    expect(formatHours(i18next.t, 82)).toBe('3 d 10 h')
  })

  it('reads a measure through the catalogue rather than the behaviour table', () => {
    expect(measureCopy(i18next.t, 'reach')).toEqual({
      label: 'Alcance',
      periodLabel: 'Alcance acumulado',
      hint: 'Cuentas distintas que vieron una publicación',
    })
    // The two whose labels already say where the number comes from carry an
    // empty hint, and it must not reach a `title` attribute as an empty string.
    expect(measureCopy(i18next.t, 'followers').hint).toBeUndefined()
  })

  it('decides "over" from the window length, not from the English label', () => {
    // The rule this replaced matched `/^last/` on the label, which is a rule
    // about English that a translated label silently fails.
    const period = { label: 'los últimos 28 días', from: '', to: '', days: 28 }
    expect(periodPhrase(i18next.t, period)).toBe('durante los últimos 28 días')

    const today = { label: 'hoy', from: '', to: '', days: 1 }
    expect(periodPhrase(i18next.t, today)).toBe('hoy')
  })
})
