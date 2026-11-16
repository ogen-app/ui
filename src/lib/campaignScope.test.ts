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
    expect(whereOf('/workspace-settings')).toEqual({
      place: 'settings',
      scope: null,
    })
    expect(whereOf('/campaigns')).toEqual({ place: 'overview', scope: null })
  })

  it('reads the campaigns list asking for a campaign as the asking place', () => {
    expect(whereOf('/campaigns', 'posts')).toEqual({
      place: 'posts',
      scope: null,
    })
    expect(whereOf('/campaigns', 'nonsense')).toEqual({
      place: 'overview',
      scope: null,
    })
  })

  it('gives a page no campaign narrows no scope', () => {
    expect(whereOf('/foundation/voices')).toEqual({
      place: 'foundation',
      scope: undefined,
    })
    expect(whereOf('/profile')).toEqual({ place: null, scope: undefined })
  })
})

describe('placeLink', () => {
  it('leads a filtered row to its campaign twin', () => {
    expect(placeLink('posts', 'c1', off)).toEqual({
      to: '/campaigns/$campaignId/list',
      params: { campaignId: 'c1' },
    })
  })

  it('asks for a campaign where there is no all-campaigns page', () => {
    expect(placeLink('strategy', null, off)).toEqual({
      to: '/campaigns',
      search: { pick: 'strategy' },
    })
    expect(placeLink('calendar', null, off)).toEqual({
      to: '/campaigns',
      search: { pick: 'calendar' },
    })
    expect(placeLink('calendar', null, on)).toEqual({ to: '/calendar' })
  })

  it('leaves the workspace-only rows unfiltered', () => {
    expect(placeLink('foundation', 'c1', off)).toEqual({ to: '/foundation' })
  })
})

describe('scopeLink', () => {
  it('keeps the place and changes the filter', () => {
    expect(scopeLink(whereOf('/campaigns', 'posts'), 'c1', off)).toEqual({
      to: '/campaigns/$campaignId/list',
      params: { campaignId: 'c1' },
    })
    expect(scopeLink(whereOf('/campaigns/c1/ideas'), null, off)).toEqual({
      to: '/ideas',
    })
  })

  it('stays put on a page no campaign narrows', () => {
    expect(scopeLink(whereOf('/foundation'), 'c1', off)).toBeNull()
  })
})
