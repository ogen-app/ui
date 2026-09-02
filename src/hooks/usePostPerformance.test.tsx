import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/services/api/errors'
import * as service from '@/services/api/postAnalytics'
import type { PostFacts } from '@/lib/postAnalyticsView'
import type { AnalyticsMetrics, PostAnalyticsSnapshot } from '@/types/analytics'
import type { PostStatus } from '@/types/posts'
import { usePostPerformance } from './usePostPerformance'

/**
 * Which answer the surface is given, for each of the five things the endpoint
 * can say.
 *
 * The two worth arguing about are the ones that arrive as failures and are not
 * failures: a 409 means analytics is *undefined* for this post until somebody
 * links it, and a 200 `pending` means the post is simply ahead of the sweep.
 * Collapsing either into `error` would put a red state on a screen where
 * nothing has gone wrong.
 *
 * And the gate, which is the one that costs real requests: a draft must never
 * reach the network, because the only answer waiting there is the 409.
 */

const ZERO: AnalyticsMetrics = {
  impressions: 0,
  reach: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  clicks: 0,
  views: 0,
  engagement_rate: 0,
}

const FACTS: PostFacts = {
  title: 'What we learned shipping in the open',
  platform: 'linkedin',
  format: 'Single image',
  publishedAt: '2026-08-20T09:00:00Z',
  campaign: 'Autumn launch',
  socialAccountId: 'acc_1',
}

const SNAPSHOT: PostAnalyticsSnapshot = {
  post_id: 'post_1',
  publisher: 'zernio',
  publisher_post_id: 'z_1',
  sync_status: 'synced',
  metrics_last_updated: '2026-08-22T06:00:00Z',
  last_refreshed_at: '2026-08-22T07:00:00Z',
  analytics: { ...ZERO, reach: 4210, impressions: 5900, likes: 96 },
  platform_analytics: [
    {
      platform: 'linkedin',
      account_username: 'ogen',
      platform_post_url: 'https://linkedin.com/feed/update/1',
      analytics: { ...ZERO, reach: 4210, impressions: 5900, likes: 96 },
    },
  ],
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function run(status: PostStatus) {
  return renderHook(() => usePostPerformance('post_1', status, FACTS), {
    wrapper,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usePostPerformance', () => {
  it('asks nothing of a post that has not gone out', async () => {
    const fetched = vi.spyOn(service, 'fetchPostAnalytics')
    const { result } = run('draft')

    expect(result.current).toEqual({ state: 'unpublished' })
    // The gate is the point: without it every draft anyone opens spends a
    // request to be told 409, and logs a red line saying so.
    expect(fetched).not.toHaveBeenCalled()
  })

  it('asks nothing of a scheduled post either', () => {
    const fetched = vi.spyOn(service, 'fetchPostAnalytics')
    const { result } = run('scheduled')

    // Zernio holds a submission; the network holds nothing. This is the case a
    // broader "is it submitted?" gate would have got wrong.
    expect(result.current).toEqual({ state: 'unpublished' })
    expect(fetched).not.toHaveBeenCalled()
  })

  it('builds the view from a snapshot', async () => {
    vi.spyOn(service, 'fetchPostAnalytics').mockResolvedValue(SNAPSHOT)
    const { result } = run('published')

    await waitFor(() => expect(result.current.state).toBe('measured'))
    if (result.current.state !== 'measured') throw new Error('not measured')
    expect(result.current.view.post.title).toBe(FACTS.title)
    expect(result.current.view.post.account).toBe('ogen')
    expect(
      result.current.view.metrics.find((m) => m.measure === 'reach')?.value,
    ).toBe(4210)
  })

  it('waits rather than failing while the sweep has not reached it', async () => {
    vi.spyOn(service, 'fetchPostAnalytics').mockResolvedValue({
      status: 'pending',
      post_id: 'post_1',
    })
    const { result } = run('published')

    await waitFor(() => expect(result.current.state).toBe('waiting'))
  })

  it('separates a post published by hand and never linked', async () => {
    vi.spyOn(service, 'fetchPostAnalytics').mockRejectedValue(
      new ApiError(409, 'post was not published via a publisher'),
    )
    const { result } = run('published')

    // Not an error: there is an action behind this one — give Ogen the URL.
    await waitFor(() => expect(result.current.state).toBe('unlinked'))
  })

  it('separates a deployment with no analytics database', async () => {
    vi.spyOn(service, 'fetchPostAnalytics').mockRejectedValue(
      new ApiError(503, 'post analytics is not available'),
    )
    const { result } = run('published')

    await waitFor(() => expect(result.current.state).toBe('unavailable'))
  })

  it('reports anything else as an error', async () => {
    vi.spyOn(service, 'fetchPostAnalytics').mockRejectedValue(
      new ApiError(404, 'not found'),
    )
    const { result } = run('published')

    await waitFor(() => expect(result.current.state).toBe('error'))
  })
})
