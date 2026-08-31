import { describe, expect, it } from 'vitest'
import {
  buildPostPerformanceView,
  readMaturity,
  readMetrics,
  readPublication,
  type PostFacts,
} from '@/lib/postAnalyticsView'
import type { AnalyticsMetrics, PostAnalyticsSnapshot } from '@/types/analytics'

/**
 * What the mapper does with the wire, and — more to the point — what it
 * refuses to invent.
 *
 * Three rules are load-bearing enough to be argued with here rather than read
 * out of a component: a zero from a platform that cannot measure the thing is
 * an absence, `error_message` is the only signal worth branching on, and
 * nothing claims a post has finished earning.
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
  title: 'How we cut our render time in half',
  platform: 'linkedin',
  format: 'Text post',
  publishedAt: '2026-08-30T06:00:00Z',
  campaign: 'Launch',
  socialAccountId: 'our-account-1',
}

const NOW = new Date('2026-08-30T12:00:00Z')

function snapshot(
  over: Partial<PostAnalyticsSnapshot> = {},
): PostAnalyticsSnapshot {
  return {
    post_id: 'p1',
    publisher: 'zernio',
    publisher_post_id: 'z1',
    sync_status: 'synced',
    metrics_last_updated: '2026-08-30T11:00:00Z',
    last_refreshed_at: '2026-08-30T11:30:00Z',
    analytics: ZERO,
    platform_analytics: [{ platform: 'linkedin', analytics: ZERO }],
    ...over,
  }
}

describe('readMetrics', () => {
  it('drops a zero the platform cannot measure, and keeps one it can', () => {
    // LinkedIn has no saves and does report clicks. Both arrive as `0` — the
    // wire has no way to tell them apart, which is the whole reason the
    // capability table exists.
    const metrics = readMetrics({ ...ZERO, likes: 12 }, 'linkedin')

    expect(metrics.map((m) => m.measure)).toContain('clicks')
    expect(metrics.map((m) => m.measure)).not.toContain('saves')
  })

  it('keeps a non-zero even where the table says the platform never reports it', () => {
    // The table only ever removes zeros. A wrong entry can suppress a genuine
    // zero; it can never hide a number, which is what makes it safe to ship a
    // table built from reading rather than from observation.
    const metrics = readMetrics({ ...ZERO, saves: 9 }, 'linkedin')

    expect(metrics.find((m) => m.measure === 'saves')?.value).toBe(9)
  })

  it('sums interactions from the parts the platform does report', () => {
    const metrics = readMetrics(
      { ...ZERO, likes: 84, comments: 12, shares: 6, saves: 0 },
      'linkedin',
    )

    // Saves are not counted in, because LinkedIn never reported them — and the
    // roll-up survives the missing part rather than withdrawing over it.
    expect(metrics.find((m) => m.measure === 'interactions')?.value).toBe(102)
  })

  it('carries no comparison, because nothing serves one per post', () => {
    const metric = readMetrics({ ...ZERO, reach: 4200 }, 'linkedin').find(
      (m) => m.measure === 'reach',
    )

    expect(metric?.typical).toBeUndefined()
    expect(metric?.expected).toBeUndefined()
  })
})

describe('readPublication', () => {
  it('takes the account and the permalink off the row — they are nowhere else', () => {
    const publication = readPublication(
      snapshot({
        platform_analytics: [
          {
            platform: 'linkedin',
            account_username: 'ogen',
            platform_post_url: 'https://linkedin.com/x',
            analytics: ZERO,
          },
        ],
      }),
      FACTS,
    )

    expect(publication.account).toBe('ogen')
    expect(publication.permalink).toBe('https://linkedin.com/x')
    expect(publication.health.state).toBe('reporting')
  })

  it('branches on error_message and reconnects our account, never Zernio’s', () => {
    const publication = readPublication(
      snapshot({
        platform_analytics: [
          {
            platform: 'linkedin',
            account_id: 'zernio-acct-1',
            sync_status: 'error',
            error_message: 'analytics scope missing',
            reauthorize_url: 'https://zernio.example/reauth',
            analytics: ZERO,
          },
        ],
      }),
      FACTS,
    )

    expect(publication.health).toEqual({
      state: 'not_reporting',
      message: 'analytics scope missing',
      // Ours. `account_id` is the publisher's, and our connections screen has
      // never heard of it.
      reconnectAccountId: 'our-account-1',
    })
  })

  it('keeps the identity when the row is missing entirely', () => {
    const publication = readPublication(
      snapshot({ platform_analytics: [] }),
      FACTS,
    )

    expect(publication.platform).toBe('linkedin')
    expect(publication.account).toBeNull()
    expect(publication.health.state).toBe('reporting')
  })
})

describe('readMaturity', () => {
  it('is unpublished with no date', () => {
    expect(readMaturity(null, NOW)).toBe('unpublished')
  })

  it('counts while the post is inside the accrual window', () => {
    expect(readMaturity('2026-08-30T06:00:00Z', NOW)).toBe('counting')
  })

  it('never claims a post has finished earning', () => {
    // `final` would need the workspace's maturation curve, which lives on
    // `/analytics/learnings` and not here. `settling` stays true at any age.
    expect(readMaturity('2026-01-01T00:00:00Z', NOW)).toBe('settling')
  })
})

describe('buildPostPerformanceView', () => {
  it('says how long the figures cover, and when we last looked', () => {
    const view = buildPostPerformanceView(
      snapshot({ analytics: { ...ZERO, reach: 4200 } }),
      FACTS,
      NOW,
    )

    expect(view.measuredOver).toBe('6 hours')
    expect(view.lastRefreshedAt).toBe('1 hour ago')
    expect(view.maturity).toBe('counting')
  })

  it('leaves every comparison absent — none of them has a source', () => {
    const view = buildPostPerformanceView(snapshot(), FACTS, NOW)

    expect(view.percentile).toBeNull()
    expect(view.sample).toBeUndefined()
    expect(view.insight).toBeNull()
    // No endpoint reads the snapshot history, so a post has figures and no
    // shape. The measure cards see this and say so rather than drawing a line.
    expect(view.series).toEqual([])
  })

  it('measures nothing on a post that has not gone out', () => {
    const view = buildPostPerformanceView(
      snapshot({ analytics: { ...ZERO, reach: 4200 } }),
      { ...FACTS, publishedAt: null },
      NOW,
    )

    expect(view.maturity).toBe('unpublished')
    expect(view.metrics).toEqual([])
    expect(view.measuredOver).toBeUndefined()
  })
})
