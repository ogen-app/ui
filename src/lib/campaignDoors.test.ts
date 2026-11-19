import { describe, expect, it } from 'vitest'
import type { OverviewPost } from '@/lib/campaignOverview'
import type { PlatformView } from '@/lib/platformDictionary'
import type { Campaign } from '@/types/campaigns'
import { overviewDoors, type DoorsInput, type DoorPlace } from './campaignDoors'

function campaign(over: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c1',
    name: 'Spring launch',
    start_date: '2026-10-01T00:00:00Z',
    end_date: '2026-11-30T00:00:00Z',
    estimated_post_count: 12,
    target_platforms: [{ id: 'p1' }],
    use_assets: false,
    asset_ids: [],
    ...over,
  } as Campaign
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

const connected = [
  { platform: { id: 'p1' }, connectedPublishers: [{}] },
] as unknown as PlatformView[]

function input(over: Partial<DoorsInput> = {}): DoorsInput {
  return {
    campaign: campaign(),
    posts: [],
    platformViews: connected,
    ideasWaiting: 0,
    now: new Date('2026-11-01T12:00:00Z'),
    ...over,
  }
}

const door = (doors: ReturnType<typeof overviewDoors>, place: DoorPlace) =>
  doors.find((d) => d.place === place)!

describe('overviewDoors', () => {
  it('opens every place in the rail’s order', () => {
    expect(overviewDoors(input()).map((d) => d.place)).toEqual([
      'strategy',
      'ideas',
      'assets',
      'posts',
      'calendar',
      'analytics',
      'settings',
    ])
  })

  it.each([
    [{ start_date: null }, 'strategy.noDates'],
    [{ estimated_post_count: null }, 'strategy.noGoal'],
    [{ target_platforms: [] }, 'strategy.noChannels'],
  ])('names the first thing Strategy is missing', (over, key) => {
    const d = door(
      overviewDoors(input({ campaign: campaign(over) })),
      'strategy',
    )
    expect(d).toMatchObject({ mark: 'todo', line: { key } })
  })

  it('wants an account to publish through, not just a channel', () => {
    const d = door(overviewDoors(input({ platformViews: [] })), 'strategy')
    expect(d).toMatchObject({
      mark: 'todo',
      line: { key: 'strategy.notConnected' },
    })
  })

  it('ticks Strategy once dates, goal and a connected channel are there', () => {
    const d = door(overviewDoors(input()), 'strategy')
    expect(d).toMatchObject({
      mark: 'set',
      line: { key: 'strategy.set', count: 1 },
    })
  })

  it('counts waiting ideas as something to do, and says when it can’t yet', () => {
    expect(
      door(overviewDoors(input({ ideasWaiting: 3 })), 'ideas'),
    ).toMatchObject({ mark: 'todo', line: { key: 'ideas.waiting', count: 3 } })
    expect(
      door(overviewDoors(input({ ideasWaiting: null })), 'ideas'),
    ).toMatchObject({ mark: null, line: { key: 'loading' } })
  })

  it('leaves documents unmarked when there are none — they are optional', () => {
    expect(door(overviewDoors(input()), 'assets')).toMatchObject({
      mark: null,
      line: { key: 'assets.none' },
    })
    const some = campaign({ use_assets: true, asset_ids: ['a', 'b'] })
    expect(
      door(overviewDoors(input({ campaign: some })), 'assets'),
    ).toMatchObject({ mark: 'set', line: { key: 'assets.some', count: 2 } })
    const all = campaign({ use_assets: true, asset_ids: [] })
    expect(
      door(overviewDoors(input({ campaign: all })), 'assets').line.key,
    ).toBe('assets.all')
  })

  it('counts posts and the drafts among them', () => {
    const posts = [
      post({ id: '1', status: 'draft' }),
      post({ id: '2', status: 'planned' }),
      post({ id: '3', status: 'published' }),
    ]
    expect(door(overviewDoors(input({ posts })), 'posts')).toMatchObject({
      mark: 'set',
      line: { key: 'posts.some', count: 3, drafts: 2 },
    })
    expect(door(overviewDoors(input()), 'posts').mark).toBe('todo')
  })

  it('counts every scheduled post, and names the next one still ahead', () => {
    const posts = [
      // A manual post past its time is still on the calendar.
      post({
        id: '1',
        status: 'scheduled_for_manual_publishing',
        scheduled_at: '2026-10-30T09:00:00Z',
      }),
      post({
        id: '2',
        status: 'scheduled',
        scheduled_at: '2026-11-04T09:00:00Z',
      }),
      post({
        id: '3',
        status: 'scheduled',
        scheduled_at: '2026-11-03T09:00:00Z',
      }),
    ]
    const d = door(overviewDoors(input({ posts })), 'calendar')
    expect(d).toMatchObject({
      mark: 'set',
      line: { key: 'calendar.next', count: 3 },
    })
    expect(d.line.at?.toISOString()).toBe('2026-11-03T09:00:00.000Z')
  })

  it('wants a schedule only once there are posts to schedule', () => {
    expect(door(overviewDoors(input()), 'calendar').mark).toBeNull()
    const posts = [post({ id: '1' })]
    expect(door(overviewDoors(input({ posts })), 'calendar')).toMatchObject({
      mark: 'todo',
      line: { key: 'calendar.none' },
    })
    const over = input({ posts, now: new Date('2026-12-15T12:00:00Z') })
    expect(door(overviewDoors(over), 'calendar')).toMatchObject({
      mark: null,
      line: { key: 'calendar.over' },
    })
  })

  it('waits on the posts for the three doors that count them', () => {
    const doors = overviewDoors(input({ posts: null }))
    for (const place of ['posts', 'calendar', 'analytics'] as const)
      expect(door(doors, place).line.key).toBe('loading')
  })
})
