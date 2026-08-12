import { describe, expect, it } from 'vitest'

import {
  campaignAnalytics,
  formatEngagementRate,
  formatMetric,
} from './campaignAnalytics.ts'
import type { AnalyticsMetrics, PostAnalyticsItem } from '@/types/analytics'
import type { Post, PostStatus } from '@/types/posts'

function metrics(over: Partial<AnalyticsMetrics> = {}): AnalyticsMetrics {
  return {
    impressions: 0,
    reach: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    clicks: 0,
    views: 0,
    engagement_rate: 0,
    ...over,
  }
}

function item(
  postId: string,
  over: Partial<AnalyticsMetrics> = {},
  refreshedAt = '2026-08-01T00:00:00Z',
): PostAnalyticsItem {
  return {
    post_id: postId,
    publisher_post_id: `z-${postId}`,
    // Deliberately wrong: the analytics row's title is denormalised at sweep
    // time, and nothing may read it in place of the post's own.
    title: 'stale title',
    publisher: 'zernio',
    platform: 'linkedin',
    published_at: '2026-07-30T09:00:00Z',
    sync_status: 'ok',
    metrics_last_updated: refreshedAt,
    last_refreshed_at: refreshedAt,
    analytics: metrics(over),
  }
}

function post(id: string, status: PostStatus = 'published'): Post {
  return { id, status, title: `post ${id}` } as Post
}

describe('campaignAnalytics', () => {
  it('ignores measured posts that belong to another campaign', () => {
    const result = campaignAnalytics(
      [item('a', { impressions: 100 }), item('elsewhere', { impressions: 900 })],
      [post('a')],
    )
    expect(result.measured).toBe(1)
    expect(result.totals.impressions).toBe(100)
  })

  it('sums the count metrics and averages the rate', () => {
    const result = campaignAnalytics(
      [
        item('a', { impressions: 100, likes: 5, engagement_rate: 0.02 }),
        item('b', { impressions: 300, likes: 1, engagement_rate: 0.06 }),
      ],
      [post('a'), post('b')],
    )
    expect(result.totals.impressions).toBe(400)
    expect(result.totals.likes).toBe(6)
    expect(result.engagementRate).toBeCloseTo(0.04)
  })

  it('pairs each row back with the campaign’s own post, not the snapshot copy', () => {
    const [top] = campaignAnalytics([item('a')], [post('a')]).ranked
    expect(top.post.title).toBe('post a')
  })

  it('ranks by engagement rate, best first', () => {
    const result = campaignAnalytics(
      [
        item('a', { engagement_rate: 0.01 }),
        item('b', { engagement_rate: 0.09 }),
        item('c', { engagement_rate: 0.05 }),
      ],
      [post('a'), post('b'), post('c')],
    )
    expect(result.ranked.map((r) => r.post.id)).toEqual(['b', 'c', 'a'])
  })

  it('reports the newest refresh across the campaign', () => {
    const result = campaignAnalytics(
      [
        item('a', {}, '2026-08-01T00:00:00Z'),
        item('b', {}, '2026-08-03T00:00:00Z'),
        item('c', {}, '2026-08-02T00:00:00Z'),
      ],
      [post('a'), post('b'), post('c')],
    )
    expect(result.lastRefreshedAt).toBe('2026-08-03T00:00:00Z')
  })

  it('counts coverage against published posts only', () => {
    // Two published, one still a draft; only one of the two was measured.
    const result = campaignAnalytics(
      [item('a')],
      [post('a'), post('b'), post('c', 'draft')],
    )
    expect(result.coverage).toEqual({
      measured: 1,
      published: 2,
      complete: false,
    })
  })

  it('is complete when every published post has numbers', () => {
    const result = campaignAnalytics([item('a'), item('b')], [post('a'), post('b')])
    expect(result.coverage.complete).toBe(true)
  })

  it('holds a campaign with nothing measured at zero rather than NaN', () => {
    const result = campaignAnalytics([], [post('a')])
    expect(result.measured).toBe(0)
    expect(result.engagementRate).toBe(0)
    expect(result.lastRefreshedAt).toBeNull()
    expect(result.totals.impressions).toBe(0)
  })
})

describe('formatting', () => {
  it('shows the rate as a percent, since the server sends a fraction', () => {
    expect(formatEngagementRate(0.0312)).toBe('3.1%')
    expect(formatEngagementRate(0)).toBe('0.0%')
  })

  it('abbreviates once a raw count stops being readable', () => {
    expect(formatMetric(940)).toBe('940')
    expect(formatMetric(9_999)).toBe('9,999')
    expect(formatMetric(12_300)).toBe('12.3K')
    expect(formatMetric(4_500_000)).toBe('4.5M')
  })
})
