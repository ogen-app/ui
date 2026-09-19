import { describe, expect, it } from 'vitest'
import {
  activityFeed,
  dayKey,
  isNotificationEntry,
  parseDayKey,
} from './activityFeed.ts'
import type { AppNotification } from '@/types/notifications'
import type { ActivityReportSummary } from '@/types/activity'

/**
 * Local times, written as local times. The day boundary these rules keep is
 * the reader's own — the same one sent to the server as `tz` — so a fixture
 * pinned to a UTC instant would pass or fail by whichever machine ran it.
 */
function at(y: number, m: number, d: number, h = 12, min = 0): string {
  return new Date(y, m - 1, d, h, min).toISOString()
}

function report(
  date: string,
  over: Partial<ActivityReportSummary> = {},
): ActivityReportSummary {
  return {
    date,
    published_total: 1,
    failed_total: 0,
    created_total: 0,
    campaigns_created_total: 0,
    ...over,
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

describe('activityFeed', () => {
  const reports = [
    report('2026-08-19', { published_total: 2, failed_total: 1 }),
    report('2026-08-18', { created_total: 3 }),
    report('2026-08-17'),
  ]

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

  it('carries recorded entries individually and one report per day', () => {
    const feed = activityFeed({ reports, notifications: [failure] }, NOW)
    expect(feed.map((e) => e.kind)).toEqual([
      // 19th: the recorded failure at 14:00, then the day's report.
      'notification',
      'report',
      // 18th and 17th: nothing was recorded, so the report alone — the derived
      // exceptions Phase 1 would have shown here are gone on purpose.
      'report',
      'report',
    ])
  })

  it('places a report at its own local midnight, so it closes its day', () => {
    // The row the server sends carries a date and no time. Midnight is what
    // puts the summary *under* the entries it summarises rather than above
    // them — the position it held when this file still computed the report and
    // stamped it with the day's last event.
    const feed = activityFeed({ reports, notifications: [failure] }, NOW)
    const first = feed[1]
    expect(first.kind).toBe('report')
    expect(dayKey(new Date(first.at))).toBe('2026-08-19')
    expect(new Date(first.at).getHours()).toBe(0)
  })

  it('does not re-derive an outcome the server already recorded', () => {
    // The 19th's report counts a failure, and one notification was written
    // about it. A feed reading both would say it twice.
    const feed = activityFeed({ reports, notifications: [failure] }, NOW)
    expect(feed.filter(isNotificationEntry)).toHaveLength(1)
  })

  it('carries the row whole, so the screen decides how to say it', () => {
    const feed = activityFeed({ reports, notifications: [failure] }, NOW)
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
        reports,
        notifications: [
          { ...failure, id: 'n2', created_at: at(2026, 8, 25, 9) },
        ],
      },
      NOW,
    )
    expect(feed.filter(isNotificationEntry)).toHaveLength(0)
  })

  it('drops a report for a day that has not happened here yet', () => {
    // The server cuts days by the zone it was sent, and a request in flight
    // across midnight — or a clock the two ends disagree about — can name
    // tomorrow. Same rule as a future notification, for the same reason.
    const feed = activityFeed({ reports: [report('2026-08-20')] }, NOW)
    expect(feed).toHaveLength(0)
  })

  it('ignores a row whose date it cannot read', () => {
    const feed = activityFeed({ reports: [report('19-08-2026')] }, NOW)
    expect(feed).toHaveLength(0)
  })

  it('is the reports alone when nothing has been recorded yet', () => {
    // The state a fresh notifications table is in, and the state the feed is
    // in for anyone whose workspace has never produced one.
    const feed = activityFeed({ reports }, NOW)
    expect(new Set(feed.map((e) => e.kind))).toEqual(new Set(['report']))
  })

  it('is empty when neither half has anything', () => {
    expect(activityFeed({}, NOW)).toEqual([])
  })
})
