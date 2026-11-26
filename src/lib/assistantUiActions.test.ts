import { describe, expect, it } from 'vitest'
import {
  addSourceSearch,
  connectSearch,
  destinationFor,
  isDashboard,
  sameDestination,
  searchCampaign,
  searchFromFilter,
  windowCampaign,
} from './assistantUiActions'

describe('destinationFor', () => {
  it('finds a workspace screen', () => {
    expect(destinationFor({ type: 'navigate', screen: 'ideas' })).toEqual({
      to: '/ideas',
      params: {},
    })
  })

  it('needs the campaign for a campaign screen', () => {
    expect(
      destinationFor({
        type: 'navigate',
        screen: 'campaign.ideas',
        campaignId: 'c1',
      }),
    ).toEqual({
      to: '/campaigns/$campaignId/ideas',
      params: { campaignId: 'c1' },
    })
    expect(
      destinationFor({ type: 'navigate', screen: 'campaign.ideas' }),
    ).toBeNull()
  })

  it('opens a detail screen on its focus', () => {
    expect(
      destinationFor({
        type: 'navigate',
        screen: 'campaign.asset',
        campaignId: 'c1',
        focus: { kind: 'asset', id: 'a1' },
      }),
    ).toEqual({
      to: '/campaigns/$campaignId/assets/$assetId',
      params: { campaignId: 'c1', assetId: 'a1' },
    })
    expect(
      destinationFor({
        type: 'navigate',
        screen: 'foundation.voice',
        focus: { kind: 'voice', id: 'v1' },
      }),
    ).toEqual({ to: '/foundation/voices/$voiceId', params: { voiceId: 'v1' } })
  })
})

describe('searchFromFilter', () => {
  it('keeps the page’s own keys and drops what only the request carries', () => {
    expect(
      searchFromFilter(
        'source_asset=a1&pile=waiting&scope_campaign=c1&tz=Europe%2FRome&limit=50',
      ),
    ).toEqual({ source_asset: 'a1', pile: 'waiting' })
  })

  it('reads a repeated key as the pages’ comma list', () => {
    expect(searchFromFilter('platform=linkedin&platform=threads')).toEqual({
      platform: 'linkedin,threads',
    })
  })

  it('reads an empty filter as no filter', () => {
    expect(searchFromFilter('')).toEqual({})
  })
})

describe('a set_window', () => {
  const window = { from: '2026-03-01', to: '2026-03-31', platforms: [] }

  it('lands on the dashboard', () => {
    expect(
      destinationFor({ type: 'set_window', screen: 'analytics', window }),
    ).toEqual({ to: '/analytics', params: {} })
  })

  it('stays on a campaign’s Analytics tab, whose address names the campaign (CON-498)', () => {
    const action = {
      type: 'set_window' as const,
      screen: 'campaign.analytics' as const,
      campaignId: 'c1',
      window,
    }
    expect(destinationFor(action)).toEqual({
      to: '/campaigns/$campaignId/analytics',
      params: { campaignId: 'c1' },
    })
    expect(windowCampaign(action)).toBe('c1')
    expect(searchCampaign(action)).toBeUndefined()
  })

  it('lands another campaign’s window on that campaign’s tab, the whole workspace on the dashboard', () => {
    const tab = {
      type: 'set_window' as const,
      screen: 'campaign.analytics' as const,
      campaignId: 'c1',
      window: { ...window, campaignId: 'c1' },
    }
    const other = {
      ...tab,
      campaignId: 'c2',
      window: { ...window, campaignId: 'c2' },
    }
    const workspace = {
      type: 'set_window' as const,
      screen: 'analytics' as const,
      window,
    }
    expect(destinationFor(other)?.params).toEqual({ campaignId: 'c2' })
    expect(sameDestination(tab, other)).toBe(false)
    expect(sameDestination(tab, { ...tab, window })).toBe(true)
    expect(destinationFor(workspace)).toEqual({ to: '/analytics', params: {} })
    expect(sameDestination(tab, workspace)).toBe(false)
    expect(
      searchCampaign({ ...workspace, window: { ...window, campaignId: 'c2' } }),
    ).toBe('c2')
  })

  it('knows the dashboards', () => {
    expect(isDashboard('analytics')).toBe(true)
    expect(isDashboard('campaign.analytics')).toBe(true)
    expect(isDashboard('campaign.overview')).toBe(false)
  })

  it('lands a filter set on the calendar on the campaign’s posts list', () => {
    expect(
      destinationFor({
        type: 'set_filter',
        screen: 'campaign.calendar',
        campaignId: 'c1',
        filter: 'status=draft',
      }),
    ).toEqual({
      to: '/campaigns/$campaignId/list',
      params: { campaignId: 'c1' },
    })
  })

  it('keeps a search on the calendar and sends the rest to the list (CON-534)', () => {
    const calendar = {
      type: 'set_filter',
      screen: 'campaign.calendar',
      campaignId: 'c1',
    } as const
    expect(
      destinationFor({ ...calendar, filter: 'text=pricing&tz=UTC' }),
    ).toEqual({
      to: '/campaigns/$campaignId/calendar',
      params: { campaignId: 'c1' },
    })
    // Clearing it is the calendar's too.
    expect(destinationFor({ ...calendar, filter: '' })?.to).toBe(
      '/campaigns/$campaignId/calendar',
    )
    expect(
      destinationFor({ ...calendar, filter: 'text=pricing&status=draft' }),
    ).toEqual({
      to: '/campaigns/$campaignId/list',
      params: { campaignId: 'c1' },
    })
    expect(
      destinationFor({
        type: 'set_filter',
        screen: 'calendar',
        filter: 'status=draft',
      }),
    ).toEqual({ to: '/posts', params: {} })
    expect(
      destinationFor({
        type: 'set_filter',
        screen: 'calendar',
        filter: 'text=pricing',
      }),
    ).toEqual({ to: '/calendar', params: {} })
  })

  it('narrows to the window’s own campaign first', () => {
    expect(
      windowCampaign({
        type: 'set_window',
        screen: 'analytics',
        window: { ...window, campaignId: 'c2' },
      }),
    ).toBe('c2')
    expect(
      windowCampaign({ type: 'set_window', screen: 'analytics', window }),
    ).toBeUndefined()
  })
})

describe('an open_connect', () => {
  it('names the account to reconnect, with its platform', () => {
    expect(
      connectSearch({
        platform: 'instagram',
        accountId: 'a1',
        reconnect: true,
      }),
    ).toEqual({ reconnect: 'a1', platform: 'instagram' })
  })

  it('names the platform alone for a reconnect with no account (CON-480)', () => {
    expect(connectSearch({ platform: 'instagram', reconnect: true })).toEqual({
      platform: 'instagram',
    })
  })

  it('names the platform to connect a new account on', () => {
    expect(connectSearch({ platform: 'tiktok', reconnect: false })).toEqual({
      connect: 'tiktok',
    })
  })

  it('lands on Settings', () => {
    expect(
      destinationFor({
        type: 'open_connect',
        screen: 'settings',
        connect: { platform: 'tiktok', reconnect: false },
      }),
    ).toEqual({ to: '/workspace-settings', params: {} })
  })
})

describe('an open_add_source (CON-474)', () => {
  it('lands on the campaign’s Assets tab', () => {
    expect(
      destinationFor({
        type: 'open_add_source',
        screen: 'campaign.assets',
        campaignId: 'c1',
      }),
    ).toEqual({
      to: '/campaigns/$campaignId/assets',
      params: { campaignId: 'c1' },
    })
  })

  it('keeps the Assets tab’s filter when it is already open there', () => {
    expect(
      addSourceSearch('/campaigns/c1/assets', {
        pathname: '/campaigns/c1/assets/',
        search: { kind: 'PDF', sort: 'title' },
      }),
    ).toEqual({ kind: 'PDF', sort: 'title', add: 'source' })
  })

  it('brings no other page’s params along', () => {
    expect(
      addSourceSearch('/campaigns/c1/assets', {
        pathname: '/campaigns/c1/list',
        search: { status: 'draft' },
      }),
    ).toEqual({ add: 'source' })
    expect(
      addSourceSearch('/campaigns/c1/assets', {
        pathname: '/campaigns/c2/assets',
        search: { kind: 'PDF' },
      }),
    ).toEqual({ add: 'source' })
  })

  it('goes nowhere without its campaign', () => {
    expect(
      destinationFor({ type: 'open_add_source', screen: 'campaign.assets' }),
    ).toBeNull()
  })
})
