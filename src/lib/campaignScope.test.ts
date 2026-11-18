import { describe, expect, it } from 'vitest'
import { placeLink, scopeLink, whereOf } from './campaignScope'

const off = { workspaceCalendar: false }
const on = { workspaceCalendar: true }

describe('whereOf', () => {
  it('reads a campaign route as that campaign, on its section', () => {
    expect(whereOf('/campaigns/c1/ideas')).toEqual({
      place: 'ideas',
      scope: 'c1',
    })
    expect(whereOf('/campaigns/c1/list')).toEqual({
      place: 'posts',
      scope: 'c1',
    })
    expect(whereOf('/campaigns/c1/posts/p9')).toEqual({
      place: 'posts',
      scope: 'c1',
    })
    expect(whereOf('/campaigns/c1')).toEqual({ place: 'overview', scope: 'c1' })
  })

  it('reads a workspace route as all campaigns', () => {
    expect(whereOf('/ideas')).toEqual({ place: 'ideas', scope: null })
    expect(whereOf('/posts')).toEqual({ place: 'posts', scope: null })
    expect(whereOf('/workspace-settings')).toEqual({
      place: 'settings',
      scope: null,
    })
    expect(whereOf('/campaigns')).toEqual({ place: 'overview', scope: null })
  })

  it('reads the Foundation as Strategy for all campaigns', () => {
    expect(whereOf('/foundation')).toEqual({ place: 'strategy', scope: null })
    expect(whereOf('/foundation/voices/v1')).toEqual({
      place: 'strategy',
      scope: null,
    })
    expect(whereOf('/campaigns/c1/strategy')).toEqual({
      place: 'strategy',
      scope: 'c1',
    })
  })

  it('reads the campaigns list asking for a campaign as the asking place', () => {
    expect(whereOf('/campaigns', 'calendar')).toEqual({
      place: 'calendar',
      scope: null,
    })
    // Strategy has a page of its own for all campaigns now, so it never asks.
    expect(whereOf('/campaigns', 'strategy')).toEqual({
      place: 'overview',
      scope: null,
    })
    // Posts has a page of its own for all campaigns, so it never asks.
    expect(whereOf('/campaigns', 'posts')).toEqual({
      place: 'overview',
      scope: null,
    })
    expect(whereOf('/campaigns', 'nonsense')).toEqual({
      place: 'overview',
      scope: null,
    })
  })

  it('gives a page no campaign narrows no scope', () => {
    expect(whereOf('/tasks')).toEqual({ place: 'inbox', scope: undefined })
    expect(whereOf('/profile')).toEqual({ place: null, scope: undefined })
  })
})

describe('placeLink', () => {
  it('leads a filtered row to its campaign twin', () => {
    expect(placeLink('posts', 'c1', off)).toEqual({
      to: '/campaigns/$campaignId/list',
      params: { campaignId: 'c1' },
    })
    expect(placeLink('posts', null, off)).toEqual({ to: '/posts' })
  })

  it('leads Strategy for all campaigns to the Foundation', () => {
    expect(placeLink('strategy', null, off)).toEqual({ to: '/foundation' })
    expect(placeLink('strategy', 'c1', off)).toEqual({
      to: '/campaigns/$campaignId/strategy',
      params: { campaignId: 'c1' },
    })
    // The Foundation is the workspace's however many campaigns it has.
    expect(
      placeLink('strategy', null, { ...off, soleCampaignId: 'c1' }),
    ).toEqual({ to: '/foundation' })
  })

  it('asks for a campaign where there is no all-campaigns page', () => {
    expect(placeLink('calendar', null, off)).toEqual({
      to: '/campaigns',
      search: { pick: 'calendar' },
    })
    expect(placeLink('calendar', null, on)).toEqual({ to: '/calendar' })
  })

  it('asks nothing of a workspace with one campaign', () => {
    const sole = { workspaceCalendar: true, soleCampaignId: 'c1' }
    expect(placeLink('posts', null, sole)).toEqual({
      to: '/campaigns/$campaignId/list',
      params: { campaignId: 'c1' },
    })
    // A place with an all-campaigns page keeps it.
    expect(placeLink('ideas', null, sole)).toEqual({ to: '/ideas' })
    expect(placeLink('calendar', null, sole)).toEqual({ to: '/calendar' })
  })

  it('leaves the workspace-only rows unfiltered', () => {
    expect(placeLink('inbox', 'c1', off)).toEqual({ to: '/tasks' })
  })
})

describe('scopeLink', () => {
  it('keeps the place and changes the filter', () => {
    expect(scopeLink(whereOf('/posts'), 'c1', off)).toEqual({
      to: '/campaigns/$campaignId/list',
      params: { campaignId: 'c1' },
    })
    expect(scopeLink(whereOf('/campaigns/c1/ideas'), null, off)).toEqual({
      to: '/ideas',
    })
  })

  it('moves between the Foundation and a campaign’s strategy', () => {
    expect(scopeLink(whereOf('/foundation/facts'), 'c1', off)).toEqual({
      to: '/campaigns/$campaignId/strategy',
      params: { campaignId: 'c1' },
    })
    expect(scopeLink(whereOf('/campaigns/c1/strategy'), null, off)).toEqual({
      to: '/foundation',
    })
  })

  it('stays put on a page no campaign narrows', () => {
    expect(scopeLink(whereOf('/tasks'), 'c1', off)).toBeNull()
  })
})
