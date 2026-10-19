import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryWrapper } from '@/test/queryWrapper'
import * as service from '@/services/api/analytics'
import { AnalyticsDashboard } from './AnalyticsDashboard'

/**
 * Which reads the campaign reaches (CON-288).
 *
 * The overview and the board take it; the lessons card must not, because the
 * server answers `/learnings?campaign_id=` with a 400 — a campaign page that
 * forwarded it would lose its third card to an error state on every visit.
 */

vi.mock('@/hooks/usePlatforms.ts', () => ({ usePlatformViews: () => [] }))

vi.mock('@/services/api/analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof service>()
  const noData = () =>
    Promise.resolve({ available: false, reason: 'no_data', data: null })
  return {
    ...actual,
    fetchAnalyticsOverview: vi.fn(noData),
    fetchPerformers: vi.fn(noData),
    fetchLearnings: vi.fn(noData),
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('AnalyticsDashboard', () => {
  it('narrows the overview and the board to the campaign, and not the lessons', async () => {
    render(<AnalyticsDashboard campaignId="c1" />, { wrapper: QueryWrapper })

    await waitFor(() => expect(service.fetchLearnings).toHaveBeenCalled())
    expect(service.fetchAnalyticsOverview).toHaveBeenCalledWith(
      expect.objectContaining({ campaignId: 'c1' }),
    )
    expect(service.fetchPerformers).toHaveBeenCalledWith(
      expect.objectContaining({ campaignId: 'c1' }),
    )
    expect(service.fetchLearnings).toHaveBeenCalledWith(
      expect.not.objectContaining({ campaignId: expect.anything() }),
    )
  })

  it('asks for the whole workspace without one', async () => {
    render(<AnalyticsDashboard campaignId={null} />, { wrapper: QueryWrapper })

    await waitFor(() =>
      expect(service.fetchAnalyticsOverview).toHaveBeenCalledWith(
        expect.objectContaining({ campaignId: null }),
      ),
    )
  })
})
