import { describe, expect, it } from 'vitest'
import {
  calendarPlaceOf,
  defaultPostsPlace,
  postsPlaceLink,
  postsPlaceOf,
  rememberVisit,
  sanitizePostsPlaces,
  type PostsPlace,
} from './postsPlace'

const place = (over: Partial<PostsPlace> = {}): PostsPlace => ({
  view: 'week',
  anchor: '2026-09-14',
  granularity: 'week',
  ...over,
})

describe('rememberVisit', () => {
  it('starts from today for a campaign with no history', () => {
    const next = rememberVisit(undefined, {
      view: 'month',
      anchor: '2026-09-14',
    })
    expect(next).toEqual({
      view: 'month',
      anchor: '2026-09-14',
      granularity: 'month',
    })
  })

  it('keeps the calendar’s date and granularity through the list', () => {
    const calendar = rememberVisit(undefined, {
      view: 'month',
      anchor: '2026-09-14',
    })
    const list = rememberVisit(calendar, { view: 'list' })
    expect(list).toEqual({
      view: 'list',
      anchor: '2026-09-14',
      granularity: 'month',
    })
  })

  it('returns the previous object when nothing moved', () => {
    const prev = place()
    expect(rememberVisit(prev, { view: 'week', anchor: '2026-09-14' })).toBe(
      prev,
    )
  })

  it('is not identity-stable when the anchor moves', () => {
    const prev = place()
    expect(
      rememberVisit(prev, { view: 'week', anchor: '2026-09-21' }),
    ).not.toBe(prev)
  })
})

describe('the two readers', () => {
  it('postsPlaceOf returns the list where that is where the user was', () => {
    const places = { c1: place({ view: 'list', granularity: 'month' }) }
    expect(postsPlaceOf(places, 'c1').view).toBe('list')
  })

  it('calendarPlaceOf never returns the list', () => {
    const places = { c1: place({ view: 'list', granularity: 'month' }) }
    expect(calendarPlaceOf(places, 'c1')).toEqual({
      anchor: '2026-09-14',
      view: 'month',
    })
  })

  it('falls back to this week for an unknown campaign', () => {
    const today = defaultPostsPlace()
    expect(postsPlaceOf({}, 'nope')).toEqual(today)
    expect(calendarPlaceOf({}, 'nope')).toEqual({
      anchor: today.anchor,
      view: 'week',
    })
  })
})

describe('postsPlaceLink', () => {
  it('routes the list to the list route, with no anchor', () => {
    expect(postsPlaceLink('c1', place({ view: 'list' }))).toEqual({
      to: '/campaigns/$campaignId/list',
      params: { campaignId: 'c1' },
    })
  })

  it('routes a calendar view to the anchored route', () => {
    expect(
      postsPlaceLink('c1', place({ view: 'month', granularity: 'month' })),
    ).toEqual({
      to: '/campaigns/$campaignId/calendar/$anchor/$view',
      params: { campaignId: 'c1', anchor: '2026-09-14', view: 'month' },
    })
  })
})

describe('sanitizePostsPlaces', () => {
  it('drops an entry whose anchor is not a real day', () => {
    expect(
      sanitizePostsPlaces({
        bad: { view: 'week', anchor: '2026-02-31', granularity: 'week' },
        worse: { view: 'week', anchor: 'tomorrow', granularity: 'week' },
        fine: place(),
      }),
    ).toEqual({ fine: place() })
  })

  it('drops an entry whose view this build does not know', () => {
    expect(sanitizePostsPlaces({ c1: { ...place(), view: 'gantt' } })).toEqual(
      {},
    )
  })

  it('repairs a bad granularity rather than dropping the week', () => {
    expect(
      sanitizePostsPlaces({ c1: { ...place(), granularity: 'quarter' } }),
    ).toEqual({ c1: place() })
  })

  it('gives a list entry with no granularity the week', () => {
    expect(
      sanitizePostsPlaces({ c1: { view: 'list', anchor: '2026-09-14' } }),
    ).toEqual({ c1: place({ view: 'list' }) })
  })

  it('survives anything that is not a map', () => {
    expect(sanitizePostsPlaces(null)).toEqual({})
    expect(sanitizePostsPlaces('week')).toEqual({})
    expect(sanitizePostsPlaces({ c1: 42 })).toEqual({})
  })
})
