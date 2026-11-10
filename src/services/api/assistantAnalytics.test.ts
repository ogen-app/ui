import { describe, expect, it } from 'vitest'
import { analyticsResults } from './assistantAnalytics'

const window = {
  from: '2026-03-01',
  to: '2026-03-31',
  platforms: ['instagram'],
  campaign: { id: 'c1', name: 'Spring reopening' },
}

describe('analyticsResults', () => {
  it('is absent when the pack recorded nothing', () => {
    expect(analyticsResults({})).toBeUndefined()
    expect(analyticsResults({ analytics: {} })).toBeUndefined()
  })

  it('keeps what each read applied', () => {
    const r = analyticsResults({
      analytics: {
        analyticsOverview: {
          applied: window,
          data: { cards: [], series: {}, insights: [] },
        },
      },
    })
    expect(r?.overview?.applied).toEqual({
      ...window,
      postId: undefined,
      note: undefined,
    })
    expect(r?.overview?.data?.cards).toEqual([])
  })

  it('reads an unavailable read as its reason', () => {
    const r = analyticsResults({
      analytics: {
        bestTimes: {
          applied: { note: 'the publisher’s figures' },
          data: { available: false, reason: 'addon_required' },
        },
      },
    })
    expect(r?.bestTimes?.unavailable).toBe('addon_required')
    expect(r?.bestTimes?.data).toBeUndefined()
    expect(r?.bestTimes?.applied.platforms).toEqual([])
  })

  it('moves the publisher’s Sunday-first weekdays onto a Monday-first grid', () => {
    const r = analyticsResults({
      analytics: {
        bestTimes: {
          applied: {},
          data: [
            { day_of_week: 0, hour: 9, avg_engagement: 342.5, post_count: 12 },
            { day_of_week: 1, hour: 18, avg_engagement: 510, post_count: 15 },
          ],
        },
      },
    })
    expect(r?.bestTimes?.data).toEqual([
      { day: 6, hour: 9, engagement: 342.5, posts: 12 },
      { day: 0, hour: 18, engagement: 510, posts: 15 },
    ])
  })

  it('reads decay in bucket order, and followers with their series', () => {
    const r = analyticsResults({
      analytics: {
        contentDecay: {
          applied: {},
          data: [
            {
              bucket_order: 1,
              bucket_label: '6-12h',
              avg_pct_of_final: 70,
              post_count: 9,
            },
            {
              bucket_order: 0,
              bucket_label: '0-6h',
              avg_pct_of_final: 45,
              post_count: 9,
            },
          ],
        },
        followerHistory: {
          applied: { from: '2026-03-01', to: '2026-03-31' },
          data: {
            accounts: [
              {
                account_id: 'a1',
                platform: 'instagram',
                username: 'villa',
                current_followers: 4812,
                growth: 286,
                growth_percentage: 6.3,
              },
            ],
            series: {
              a1: [
                { date: '2026-03-01', followers: 4526 },
                { date: '2026-03-31', followers: 4812 },
              ],
            },
            granularity: 'daily',
          },
        },
      },
    })
    expect(r?.decay?.data?.map((b) => b.label)).toEqual(['0-6h', '6-12h'])
    expect(r?.followers?.data?.[0]).toMatchObject({
      username: 'villa',
      followers: 4812,
      growth: 286,
      series: [4526, 4812],
    })
  })

  it('reads a comparison, with no percentage when the first period was zero', () => {
    const r = analyticsResults({
      analytics: {
        comparePeriods: {
          first: { from: '2026-03-01', to: '2026-03-31' },
          second: { from: '2026-04-01', to: '2026-04-30' },
          metrics: [
            {
              metric: 'reach',
              label: 'Reach',
              first: 100,
              second: 150,
              change: 50,
              changePct: 50,
            },
            {
              metric: 'posts_published',
              label: 'Posts',
              first: 0,
              second: 4,
              change: 4,
              changePct: null,
            },
          ],
        },
      },
    })
    expect(r?.compare?.second.from).toBe('2026-04-01')
    expect(r?.compare?.metrics.map((m) => m.changePct)).toEqual([50, null])
  })

  it('reads more like these as a trail, then ideas', () => {
    const r = analyticsResults({
      analytics: {
        moreLikeThese: {
          trail: [
            {
              postId: 'p1',
              title: 'The thermal pool at dusk',
              ideas: [
                {
                  id: 'i1',
                  title: 'The pool',
                  asset: { id: 'a1', title: 'Brochure' },
                },
              ],
              assets: [],
            },
            {
              postId: 'p2',
              title: 'Opening day',
              ideas: [],
              assets: [],
              noTrail: true,
            },
          ],
          grounding: [{ id: 'a2', title: 'Spa menu' }],
          campaignId: 'c1',
          ideas: [
            {
              id: 'n1',
              title: 'Six rooms, one pool',
              sources: ['Asset: Brochure'],
              groundingMode: 'grounded',
            },
            { id: '', title: 'dropped' },
          ],
        },
      },
    })
    expect(r?.more?.trail[0].ideas[0].asset?.title).toBe('Brochure')
    expect(r?.more?.trail[1].noTrail).toBe(true)
    expect(r?.more?.ideas).toEqual([
      {
        id: 'n1',
        title: 'Six rooms, one pool',
        angle: undefined,
        sources: ['Asset: Brochure'],
        grounded: true,
      },
    ])
  })

  it('reads the top posts’ lists as lists, whatever arrives', () => {
    const r = analyticsResults({
      analytics: {
        topPosts: {
          applied: {},
          data: { best: 'nope', worst: null, insights: null },
        },
        analyticsOverview: {
          applied: {},
          data: { cards: [{ metric: 'reach' }, null], series: {} },
        },
      },
    })
    expect(r?.topPosts?.data).toMatchObject({
      total_posts: 0,
      best: [],
      worst: [],
    })
    expect(r?.overview?.data?.cards).toEqual([])
  })
})
