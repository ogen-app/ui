import { describe, expect, it } from 'vitest'
import type { AttentionItem } from '@/lib/campaignReadiness'
import type { CalendarFinding } from '@/types/assistant'
import type { Campaign } from '@/types/campaigns'
import {
  overviewModel,
  overviewPace,
  overviewStage,
  type OverviewInput,
  type OverviewPost,
} from './campaignOverview'

function campaign(over: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c1',
    name: 'Spring launch',
    description: '',
    target_persona: '',
    key_messages: '',
    tone_guidelines: '',
    brand_voice_id: null,
    brand_audience_id: null,
    use_assets: false,
    asset_ids: [],
    target_platforms: [],
    campaign_type_id: 't1',
    type_locked: false,
    archived_at: null,
    start_date: '2026-10-01T00:00:00Z',
    end_date: '2026-11-30T00:00:00Z',
    estimated_post_count: 12,
    goal_cadence: 'month',
    publishing_time: '09:00',
    timezone: '',
    publishing_days: [],
    spread_minutes: 15,
    language: 'en',
    budget: null,
    currency: 'EUR',
    tag_ids: [],
    tags: [],
    platforms: [],
    created_by: 'u1',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...over,
  }
}

function post(over: Partial<OverviewPost> & { id: string }): OverviewPost {
  return {
    campaign_id: 'c1',
    status: 'draft',
    scheduled_at: null,
    published_at: null,
    platform_id: 'p1',
    platform_post_type: '',
    campaign_type_phase_id: null,
    media_urls: [],
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...over,
  }
}

function input(over: Partial<OverviewInput> = {}): OverviewInput {
  return {
    campaign: campaign(),
    posts: [],
    platformViews: [],
    phases: null,
    attention: [],
    problems: null,
    total: null,
    now: new Date(2026, 10, 1, 12),
    ...over,
  }
}

const day = (m: number, d: number) => new Date(2026, m - 1, d, 12)

describe('overviewStage', () => {
  // Oct 1 – Nov 30: 61 days, so launch is the first 7 and closing the last 14.
  const c = campaign()
  it.each([
    [day(9, 30), 'planning'],
    [day(10, 1), 'launched'],
    [day(10, 7), 'launched'],
    [day(10, 8), 'running'],
    [day(11, 16), 'running'],
    [day(11, 17), 'closing'],
    [day(11, 30), 'closing'],
    [day(12, 1), 'ended'],
  ] as const)('%s is %s', (now, stage) => {
    expect(overviewStage(c, now)).toBe(stage)
  })

  it('is new without both dates', () => {
    expect(overviewStage(campaign({ end_date: null }), day(10, 5))).toBe('new')
  })

  it('gives a short campaign a middle', () => {
    // Nine days: a third is three, so days 1–3 launch, 7–9 close.
    const short = campaign({
      start_date: '2026-10-01T00:00:00Z',
      end_date: '2026-10-09T00:00:00Z',
    })
    expect(overviewStage(short, day(10, 3))).toBe('launched')
    expect(overviewStage(short, day(10, 4))).toBe('running')
    expect(overviewStage(short, day(10, 7))).toBe('closing')
  })
})

describe('overviewModel', () => {
  it('places today on the band', () => {
    const m = overviewModel(input({ now: day(10, 31) }))
    expect(m.band).toMatchObject({ day: 31, days: 61, startsIn: null })
  })

  it('counts the goal over the campaign', () => {
    const m = overviewModel(
      input({
        posts: [
          post({
            id: 'a',
            status: 'published',
            published_at: '2026-10-02T09:00:00Z',
          }),
          post({
            id: 'b',
            status: 'scheduled',
            scheduled_at: '2026-11-03T09:00:00Z',
          }),
        ],
      }),
    )
    // 12 a month over October and November.
    expect(m.band).toMatchObject({ goal: 24, published: 1, scheduled: 1 })
  })

  it('counts the last 30 days published and the next 30 scheduled', () => {
    // Now is Nov 1, noon.
    const m = overviewModel(
      input({
        posts: [
          post({
            id: 'old',
            status: 'published',
            published_at: '2026-10-01T09:00:00Z',
          }),
          post({
            id: 'new',
            status: 'published',
            published_at: '2026-10-20T09:00:00Z',
          }),
          post({
            id: 'soon',
            status: 'scheduled',
            scheduled_at: '2026-11-20T09:00:00Z',
          }),
          post({
            id: 'later',
            status: 'scheduled',
            scheduled_at: '2026-12-20T09:00:00Z',
          }),
        ],
      }),
    )
    expect(m.band?.recent).toEqual({ published: 1, scheduled: 1 })
    expect(m.band).toMatchObject({ published: 2, scheduled: 2 })
  })

  it('plans the pace before the start from the scheduled posts', () => {
    const m = overviewModel(
      input({
        now: day(9, 20),
        posts: [
          post({
            id: 'a',
            status: 'scheduled',
            scheduled_at: '2026-10-02T09:00:00Z',
          }),
          post({
            id: 'b',
            status: 'scheduled',
            scheduled_at: '2026-10-14T09:00:00Z',
          }),
        ],
      }),
    )
    // Two over Oct 1–14, two weeks.
    expect(m.band?.pace).toEqual({ perWeek: 1, planned: true })
  })

  it('lists one week, Monday first', () => {
    const m = overviewModel(input({ now: day(11, 4) })) // a Wednesday
    expect(m.week?.kind).toBe('this')
    expect(m.week?.days[0].date.getDay()).toBe(1)
    expect(m.week?.days[0].date.getDate()).toBe(2)
  })

  it('puts broken first, then risk, then to-do, and folds problems by code', () => {
    const rule = (id: string, severity: AttentionItem['severity']) =>
      ({ id, severity, label: id, actionLabel: 'Go', fix: 'posts' }) as const
    const problem = (key: string, code: string, blocks: boolean) =>
      ({
        key,
        code,
        severity: 'warning',
        message: `${code} on ${key}`,
        blocksPublishing: blocks,
        postIds: [],
        posts: [],
        fixes: [{ kind: 'change_type', title: 'Change type', postIds: [] }],
      }) satisfies CalendarFinding
    const m = overviewModel(
      input({
        attention: [
          rule('todo', 'todo'),
          rule('risk', 'risk'),
          rule('alert', 'alert'),
        ],
        problems: {
          problems: [
            problem('k1', 'no_image', true),
            problem('k2', 'no_image', true),
            problem('k3', 'too_long', false),
          ],
          dismissed: [],
        },
      }),
    )
    expect(m.needs?.map((r) => [r.mark, r.id, r.more])).toEqual([
      ['broken', 'alert', 0],
      ['broken', 'problem:k1', 1],
      ['risk', 'risk', 0],
      ['risk', 'problem:k3', 0],
      ['todo', 'todo', 0],
    ])
  })

  it('asks for a first post before launch when there is none', () => {
    const m = overviewModel(input({ now: day(9, 20) }))
    expect(m.stage).toBe('planning')
    expect(m.needsTitle).toBe('beforeLaunch')
    expect(m.needs?.map((r) => r.todo?.kind)).toContain('first-post')
  })

  it('wraps up an ended campaign with only what went wrong', () => {
    const m = overviewModel(
      input({
        now: day(12, 5),
        attention: [
          {
            id: 'failed',
            severity: 'alert',
            label: '',
            actionLabel: '',
            fix: 'posts',
          },
          {
            id: 'stale',
            severity: 'info',
            label: '',
            actionLabel: '',
            fix: 'posts',
          },
        ],
      }),
    )
    expect(m.needsTitle).toBe('wrapUp')
    expect(m.needs?.map((r) => r.id)).toEqual([
      'failed',
      'stage:read-results',
      'stage:archive',
    ])
  })

  it('shows nothing to do until the posts have been read', () => {
    expect(overviewModel(input({ posts: null })).needs).toBeNull()
  })
})

describe('overviewPace', () => {
  it('is published a week once started', () => {
    expect(
      overviewPace({
        published: 6,
        scheduled: 0,
        elapsedDays: 14,
        plannedDays: 1,
      }),
    ).toEqual({ perWeek: 3, planned: false })
  })

  it('never reads fewer than a week', () => {
    expect(
      overviewPace({
        published: 2,
        scheduled: 0,
        elapsedDays: 2,
        plannedDays: 1,
      }),
    ).toEqual({ perWeek: 2, planned: false })
  })

  it('has none in the first week with nothing published', () => {
    expect(
      overviewPace({
        published: 0,
        scheduled: 4,
        elapsedDays: 3,
        plannedDays: 1,
      }),
    ).toBeNull()
  })

  it('has none before the start with nothing scheduled', () => {
    expect(
      overviewPace({
        published: 0,
        scheduled: 0,
        elapsedDays: null,
        plannedDays: 1,
      }),
    ).toBeNull()
  })
})
