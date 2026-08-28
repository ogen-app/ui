import { describe, expect, it } from 'vitest'
import type { PostSummary } from '@/types/posts'
import {
  activityFeed,
  dailyReports,
  dayKey,
  isExceptionEntry,
  isUnread,
  parseDayKey,
  postEvents,
  reportForDay,
  unreadCount,
} from './activityFeed.ts'

/**
 * Local times, written as local times. The day boundary these rules keep is
 * the reader's own, so a fixture pinned to a UTC instant would pass or fail by
 * whichever machine ran it.
 */
function at(y: number, m: number, d: number, h = 12, min = 0): string {
  return new Date(y, m - 1, d, h, min).toISOString()
}

function makePost(overrides: Partial<PostSummary> = {}): PostSummary {
  return {
    id: 'p1',
    campaign_id: 'c1',
    status: 'draft',
    scheduled_at: null,
    published_at: null,
    platform_id: 'linkedin',
    platform_post_type: 'post',
    campaign_type_phase_id: null,
    media_urls: [],
    created_at: at(2026, 8, 1, 9),
    updated_at: at(2026, 8, 1, 9),
    ...overrides,
  }
}

const NOW = new Date(2026, 7, 19, 18, 0) // 2026-08-19, local

describe('dayKey', () => {
  it('reads the local calendar day, not the UTC one', () => {
    // 23:30 local on the 19th is the 20th in UTC anywhere west of Greenwich.
    expect(dayKey(new Date(2026, 7, 19, 23, 30))).toBe('2026-08-19')
    expect(dayKey(new Date(2026, 7, 19, 0, 30))).toBe('2026-08-19')
  })
})

describe('parseDayKey', () => {
  it('round-trips a key it produced', () => {
    const date = parseDayKey('2026-08-19')!
    expect(dayKey(date)).toBe('2026-08-19')
    expect(date.getHours()).toBe(0)
  })

  it('rejects malformed and impossible dates rather than rolling them over', () => {
    expect(parseDayKey('nonsense')).toBeNull()
    expect(parseDayKey('2026-8-19')).toBeNull()
    // Would silently become 2026-03-03 under a plain `new Date(...)`.
    expect(parseDayKey('2026-02-31')).toBeNull()
  })
})

describe('postEvents', () => {
  it('counts a post on both the day it was created and the day it published', () => {
    const events = postEvents(
      makePost({
        status: 'published',
        created_at: at(2026, 8, 17, 10),
        published_at: at(2026, 8, 19, 9),
      }),
      'c1',
    )
    expect(events.map((e) => [e.kind, dayKey(e.at)])).toEqual([
      ['created', '2026-08-17'],
      ['published', '2026-08-19'],
    ])
  })

  it('dates a failure by when the post was due, not when the row was touched', () => {
    const [, failure] = postEvents(
      makePost({
        status: 'failed',
        scheduled_at: at(2026, 8, 18, 9),
        updated_at: at(2026, 8, 19, 16),
      }),
      'c1',
    )
    expect(failure.kind).toBe('failed')
    expect(dayKey(failure.at)).toBe('2026-08-18')
  })

  it('falls back to updated_at when a failure has no scheduled date', () => {
    const [, failure] = postEvents(
      makePost({ status: 'failed', scheduled_at: null, updated_at: at(2026, 8, 19, 16) }),
      'c1',
    )
    expect(dayKey(failure.at)).toBe('2026-08-19')
  })

  it('says nothing about a post that has not happened yet', () => {
    const scheduled = postEvents(
      makePost({ status: 'scheduled', scheduled_at: at(2026, 8, 25, 9) }),
      'c1',
    )
    // Created, and nothing else: a future publish date is a level.
    expect(scheduled.map((e) => e.kind)).toEqual(['created'])
  })

  it('ignores a published post with no published_at rather than inventing one', () => {
    const events = postEvents(makePost({ status: 'published', published_at: null }), 'c1')
    expect(events.map((e) => e.kind)).toEqual(['created'])
  })

  it('survives unparseable timestamps', () => {
    const events = postEvents(
      makePost({ status: 'published', created_at: 'not a date', published_at: '' }),
      'c1',
    )
    expect(events).toEqual([])
  })
})

describe('dailyReports', () => {
  const summaries: Record<string, PostSummary[]> = {
    c1: [
      makePost({
        id: 'a',
        status: 'published',
        created_at: at(2026, 8, 18, 10),
        published_at: at(2026, 8, 19, 9),
      }),
      makePost({
        id: 'b',
        status: 'published',
        platform_id: 'instagram',
        created_at: at(2026, 8, 19, 8),
        published_at: at(2026, 8, 19, 11),
      }),
      makePost({
        id: 'c',
        status: 'failed',
        created_at: at(2026, 8, 19, 8),
        scheduled_at: at(2026, 8, 19, 14),
      }),
    ],
    c2: [
      makePost({
        id: 'd',
        campaign_id: 'c2',
        status: 'published',
        created_at: at(2026, 8, 19, 7),
        published_at: at(2026, 8, 19, 16),
      }),
    ],
  }

  it('groups by local day, newest first, and skips days with nothing', () => {
    const reports = dailyReports(summaries, NOW)
    expect(reports.map((r) => r.date)).toEqual(['2026-08-19', '2026-08-18'])
  })

  it('counts every outcome and totals them', () => {
    const [today] = dailyReports(summaries, NOW)
    expect(today.counts).toEqual({ published: 3, failed: 1, not_published: 0, created: 3 })
    expect(today.total).toBe(7)
  })

  it('breaks published down by channel, biggest first', () => {
    const [today] = dailyReports(summaries, NOW)
    expect(today.publishedByChannel).toEqual([
      { platformId: 'linkedin', count: 2 },
      { platformId: 'instagram', count: 1 },
    ])
  })

  it('breaks the day down per campaign, busiest first', () => {
    const [today] = dailyReports(summaries, NOW)
    expect(today.campaigns.map((c) => [c.campaignId, c.total])).toEqual([
      ['c1', 5],
      ['c2', 2],
    ])
  })

  it('timestamps the report with the last thing that happened on the day', () => {
    const [today] = dailyReports(summaries, NOW)
    expect(new Date(today.lastEventAt).getTime()).toBe(new Date(at(2026, 8, 19, 16)).getTime())
  })

  it('drops events dated in the future', () => {
    const skewed = {
      c1: [
        makePost({
          id: 'z',
          status: 'published',
          created_at: at(2026, 8, 19, 9),
          published_at: at(2026, 9, 30, 9),
        }),
      ],
    }
    expect(dailyReports(skewed, NOW).map((r) => r.date)).toEqual(['2026-08-19'])
  })

  it('returns nothing for an empty workspace', () => {
    expect(dailyReports({}, NOW)).toEqual([])
  })

  it('reportForDay picks one day out and answers null for a quiet one', () => {
    expect(reportForDay(summaries, '2026-08-18', NOW)?.counts.created).toBe(1)
    expect(reportForDay(summaries, '2026-08-01', NOW)).toBeNull()
  })
})

describe('activityFeed', () => {
  const summaries: Record<string, PostSummary[]> = {
    c1: [
      makePost({
        id: 'a',
        status: 'published',
        created_at: at(2026, 8, 19, 8),
        published_at: at(2026, 8, 19, 9),
      }),
      makePost({
        id: 'b',
        status: 'failed',
        created_at: at(2026, 8, 18, 8),
        scheduled_at: at(2026, 8, 19, 14),
      }),
      makePost({
        id: 'c',
        status: 'not_published',
        created_at: at(2026, 8, 17, 8),
        scheduled_at: at(2026, 8, 17, 10),
      }),
    ],
  }

  it('carries exceptions individually and rolls the rest into the day report', () => {
    const feed = activityFeed(summaries, NOW)
    expect(feed.map((e) => e.kind)).toEqual([
      // 19th: the failure at 14:00, then the day's report (last event 14:00).
      'failed',
      'report',
      // 18th: only a post being created, so the report alone.
      'report',
      // 17th: the post that was never published, then that day's report.
      'not_published',
      'report',
    ])
  })

  it('never lists a successful publish on its own', () => {
    const published = activityFeed(summaries, NOW).filter(isExceptionEntry)
    expect(published.some((e) => e.postId === 'a')).toBe(false)
  })

  it('names the post an exception is about, so the row can link to it', () => {
    const failure = activityFeed(summaries, NOW).find((e) => e.kind === 'failed')
    expect(failure).toMatchObject({ postId: 'b', campaignId: 'c1', platformId: 'linkedin' })
  })
})

describe('unreadCount', () => {
  const summaries: Record<string, PostSummary[]> = {
    c1: [
      makePost({
        id: 'a',
        status: 'failed',
        created_at: at(2026, 8, 10, 8),
        scheduled_at: at(2026, 8, 19, 14),
      }),
      makePost({
        id: 'b',
        status: 'failed',
        created_at: at(2026, 8, 10, 8),
        scheduled_at: at(2026, 8, 12, 14),
      }),
    ],
  }
  const feed = activityFeed(summaries, NOW)

  it('counts everything after the last visit', () => {
    expect(unreadCount(feed, at(2026, 8, 19, 12), NOW)).toBe(2) // the failure + today's report
  })

  it('counts only today when nothing has been stored yet', () => {
    // The 12th's failure and report are older than today, so a first visit
    // does not open on a badge counting the whole history.
    expect(unreadCount(feed, null, NOW)).toBe(2)
  })

  it('counts nothing once the feed has been marked read', () => {
    expect(unreadCount(feed, NOW.toISOString(), NOW)).toBe(0)
  })

  it('agrees with isUnread entry by entry', () => {
    const lastSeen = at(2026, 8, 19, 12)
    expect(feed.filter((e) => isUnread(e, lastSeen, NOW))).toHaveLength(
      unreadCount(feed, lastSeen, NOW),
    )
  })
})
