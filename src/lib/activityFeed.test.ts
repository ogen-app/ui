import { describe, expect, it } from 'vitest'
import type { PostSummary } from '@/types/posts'
import {
  activityFeed,
  dailyReports,
  dayKey,
  isNotificationEntry,
  parseDayKey,
  postEvents,
  reportForDay,
} from './activityFeed.ts'
import type { AppNotification } from '@/types/notifications'

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
      makePost({
        status: 'failed',
        scheduled_at: null,
        updated_at: at(2026, 8, 19, 16),
      }),
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
    const events = postEvents(
      makePost({ status: 'published', published_at: null }),
      'c1',
    )
    expect(events.map((e) => e.kind)).toEqual(['created'])
  })

  it('survives unparseable timestamps', () => {
    const events = postEvents(
      makePost({
        status: 'published',
        created_at: 'not a date',
        published_at: '',
      }),
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
    expect(today.counts).toEqual({
      published: 3,
      failed: 1,
      not_published: 0,
      created: 3,
    })
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
    expect(new Date(today.lastEventAt).getTime()).toBe(
      new Date(at(2026, 8, 19, 16)).getTime(),
    )
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

  const failure: AppNotification = {
    id: 'n1',
    seq: 12,
    level: 'error',
    type: 'post.publish_failed',
    title: 'Post failed to publish',
    body: '',
    entity_type: 'post',
    entity_id: 'b',
    action_url: '',
    data: { platform: 'linkedin' },
    read_at: null,
    created_at: at(2026, 8, 19, 14),
    expires_at: null,
  }

  it('carries recorded entries individually and rolls the rest into the day report', () => {
    const feed = activityFeed({ summaries, notifications: [failure] }, NOW)
    expect(feed.map((e) => e.kind)).toEqual([
      // 19th: the recorded failure at 14:00, then the day's report.
      'notification',
      'report',
      // 18th: only a post being created, so the report alone.
      'report',
      // 17th: nothing was recorded, so the report alone — the derived
      // exception Phase 1 would have shown here is gone on purpose.
      'report',
    ])
  })

  it('does not re-derive an outcome the server already recorded', () => {
    // Every post in the fixture has an outcome, and only one notification was
    // written. A feed reading both would show three exception rows and one
    // record; this shows the record.
    const feed = activityFeed({ summaries, notifications: [failure] }, NOW)
    expect(feed.filter(isNotificationEntry)).toHaveLength(1)
  })

  it('carries the row whole, so the screen decides how to say it', () => {
    const feed = activityFeed({ summaries, notifications: [failure] }, NOW)
    const entry = feed.filter(isNotificationEntry)[0]
    expect(entry.notification.type).toBe('post.publish_failed')
    expect(entry.notification.entity_id).toBe('b')
    // Prefixed: entry ids share one namespace with report and task entries.
    expect(entry.id).toBe('notification:n1')
  })

  it('drops a row dated in the future', () => {
    // A clock skew must not park an entry above today's, permanently first and
    // never reachable by scrolling.
    const feed = activityFeed(
      {
        summaries,
        notifications: [
          { ...failure, id: 'n2', created_at: at(2026, 8, 25, 9) },
        ],
      },
      NOW,
    )
    expect(feed.filter(isNotificationEntry)).toHaveLength(0)
  })

  it('is the reports alone when nothing has been recorded yet', () => {
    // The state a fresh notifications table is in, and the state the feed is
    // in for anyone whose workspace has never produced one.
    const feed = activityFeed({ summaries }, NOW)
    expect(new Set(feed.map((e) => e.kind))).toEqual(new Set(['report']))
  })
})
