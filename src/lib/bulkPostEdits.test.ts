import { describe, expect, it } from 'vitest'
import type { Post, PostStatus } from '@/types/posts'
import { toLocalParts } from './postSchedule.ts'
import {
  describeResult,
  planClearDate,
  planDelete,
  planSetDate,
  planSetTime,
} from './bulkPostEdits.ts'

function post(
  id: string,
  status: PostStatus,
  scheduled_at: string | null,
): Post {
  return {
    id,
    campaign_id: 'c1',
    platform_id: 'p1',
    platform_post_type: 'text-post',
    social_account_id: '',
    title: id,
    content: '',
    media_urls: [],
    scheduled_at,
    published_at: null,
    published_url: '',
    status,
    cta_type: '' as Post['cta_type'],
    cta_url: '',
    target_audience_notes: '',
    used_asset_ids: [],
    campaign_type_phase_id: null,
    created_by: '',
    created_at: '',
    updated_at: '',
    campaign: null,
    platform: null,
    used_assets: [],
    campaign_type_phase: null,
  }
}

/** Local-midnight-safe ISO for a day at a given time, as the app builds them. */
function at(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString()
}

describe('planSetDate', () => {
  it('moves the day and keeps each post’s own time', () => {
    const plan = planSetDate(
      [
        post('a', 'draft', at('2026-08-10', '14:30')),
        post('b', 'draft', at('2026-08-11', '07:05')),
      ],
      '2026-09-01',
    )
    expect(plan.changes).toHaveLength(2)
    expect(toLocalParts(plan.changes[0].scheduled_at)).toEqual({
      dateStr: '2026-09-01',
      timeStr: '14:30',
    })
    expect(toLocalParts(plan.changes[1].scheduled_at)).toEqual({
      dateStr: '2026-09-01',
      timeStr: '07:05',
    })
  })

  it('gives an unscheduled post the default hour rather than midnight', () => {
    const plan = planSetDate([post('a', 'draft', null)], '2026-09-01')
    expect(toLocalParts(plan.changes[0].scheduled_at).timeStr).toBe('09:00')
  })

  // The one that matters: a scheduled post's date belongs to the Zernio
  // submission, so rewriting it here would move the shown date and nothing else.
  it('refuses scheduled and published posts, and says which', () => {
    const plan = planSetDate(
      [
        post('a', 'draft', null),
        post('b', 'scheduled', at('2026-08-10', '09:00')),
        post('c', 'published', at('2026-08-01', '09:00')),
      ],
      '2026-09-01',
    )
    expect(plan.changes.map((c) => c.post.id)).toEqual(['a'])
    expect(plan.skipped).toEqual(
      expect.arrayContaining([
        { count: 1, reason: 'already scheduled' },
        { count: 1, reason: 'already published' },
      ]),
    )
  })

  it('leaves out posts that are already on that date', () => {
    const plan = planSetDate(
      [post('a', 'draft', at('2026-09-01', '09:00'))],
      '2026-09-01',
    )
    expect(plan.changes).toHaveLength(0)
    expect(plan.skipped).toEqual([])
  })
})

describe('planSetTime', () => {
  it('moves the time and keeps the day', () => {
    const plan = planSetTime(
      [post('a', 'draft', at('2026-08-10', '14:30'))],
      '08:15',
    )
    expect(toLocalParts(plan.changes[0].scheduled_at)).toEqual({
      dateStr: '2026-08-10',
      timeStr: '08:15',
    })
  })

  // Setting a time must not schedule something that wasn't scheduled — that's
  // a different, much larger action than the one the user asked for.
  it('skips posts with no date instead of inventing one', () => {
    const plan = planSetTime([post('a', 'draft', null)], '08:15')
    expect(plan.changes).toHaveLength(0)
    expect(plan.skipped).toEqual([{ count: 1, reason: 'have no date yet' }])
  })
})

describe('planClearDate', () => {
  it('clears editable posts and leaves scheduled ones alone', () => {
    const plan = planClearDate([
      post('a', 'draft', at('2026-08-10', '09:00')),
      post('b', 'scheduled', at('2026-08-10', '09:00')),
    ])
    expect(plan.changes).toEqual([
      expect.objectContaining({ scheduled_at: null }),
    ])
    expect(plan.changes[0].post.id).toBe('a')
    expect(plan.skipped).toEqual([{ count: 1, reason: 'already scheduled' }])
  })

  it('ignores posts that have no date to clear', () => {
    expect(planClearDate([post('a', 'draft', null)]).changes).toHaveLength(0)
  })
})

describe('planDelete', () => {
  it('splits deletable posts from the rest', () => {
    const { deletable, blocked } = planDelete([
      post('a', 'draft', null),
      post('b', 'failed', null),
      post('c', 'scheduled', null),
      post('d', 'published', null),
    ])
    expect(deletable.map((p) => p.id)).toEqual(['a', 'b'])
    expect(blocked).toBe(2)
  })
})

describe('describeResult', () => {
  it('reads as one line covering both halves', () => {
    expect(describeResult(3, [{ count: 2, reason: 'already scheduled' }])).toBe(
      '3 posts updated · 2 already scheduled',
    )
  })

  it('says nothing about skips when there were none', () => {
    expect(describeResult(1, [])).toBe('1 post updated')
  })
})
