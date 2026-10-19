import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { t } from '@/test/i18n'
import { buildNowView } from '@/lib/analyticsOverviewView'
import { AnalyticsModuleView } from './AnalyticsModule'
import type {
  AnalyticsOverview,
  OverviewMetric,
  OverviewSeries,
} from '@/types/analytics'

/**
 * The campaign Overview's Analytics card, now that its figures are the server's
 * answer for the campaign (CON-288) rather than one page of rows summed here.
 */

const SETTLED = {
  isPending: false,
  isError: false,
  isUnavailable: false,
  isEmpty: false,
}

const EMPTY_SERIES: OverviewSeries = { buckets: [], current: [], previous: [] }

function overview(): AnalyticsOverview {
  const card = (metric: OverviewMetric, value: number) => ({
    metric,
    label: metric,
    value,
    delta_pct: 0,
    direction: 'flat' as const,
    baseline: 'insufficient_history',
    sparkline: [],
  })
  return {
    window: { from: '2026-09-22', to: '2026-10-19', days: 28 },
    updated_at: '2026-10-19T09:00:00Z',
    cards: [
      card('reach', 18420),
      card('interactions', 932),
      card('engagement_rate', 0.031),
      card('followers', 5120),
      card('posts_published', 6),
    ],
    series: {
      reach: EMPTY_SERIES,
      interactions: EMPTY_SERIES,
      engagement_rate: EMPTY_SERIES,
      followers: EMPTY_SERIES,
      posts_published: EMPTY_SERIES,
    },
    insights: [],
    followers_scope: 'workspace',
  }
}

describe('AnalyticsModuleView', () => {
  it("shows the campaign's four figures and the window they cover", async () => {
    await renderWithProviders(
      <AnalyticsModuleView
        {...SETTLED}
        campaignId="c1"
        view={buildNowView(t, overview())}
      />,
    )

    expect(screen.getByText('Reach')).toBeInTheDocument()
    expect(screen.getByText('Interactions')).toBeInTheDocument()
    expect(screen.getByText('Engagement rate')).toBeInTheDocument()
    expect(screen.getByText('Posts published')).toBeInTheDocument()
    expect(screen.getByText('Last 28 days')).toBeInTheDocument()
  })

  it("leaves followers off — they are the workspace's, not the campaign's", async () => {
    await renderWithProviders(
      <AnalyticsModuleView
        {...SETTLED}
        campaignId="c1"
        view={buildNowView(t, overview())}
      />,
    )

    expect(screen.queryByText('Followers')).toBeNull()
  })

  it('says nothing has been measured rather than showing zeroes', async () => {
    await renderWithProviders(
      <AnalyticsModuleView {...SETTLED} campaignId="c1" isEmpty />,
    )

    expect(screen.getByText('Nothing measured yet')).toBeInTheDocument()
    expect(screen.queryByText('Reach')).toBeNull()
  })

  it('draws no card at all where nothing is being measured', async () => {
    await renderWithProviders(
      <AnalyticsModuleView {...SETTLED} campaignId="c1" isUnavailable />,
    )

    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.queryByText(/analytics/i)).toBeNull()
  })
})
