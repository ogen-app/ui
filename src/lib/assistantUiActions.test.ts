import { describe, expect, it } from 'vitest'
import {
  connectSearch,
  destinationFor,
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

  it('goes from a campaign’s Analytics tab to the dashboard, narrowed to it', () => {
    const action = {
      type: 'set_window' as const,
      screen: 'campaign.analytics' as const,
      campaignId: 'c1',
      window,
    }
    expect(destinationFor(action)).toEqual({ to: '/analytics', params: {} })
    expect(windowCampaign(action)).toBe('c1')
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

  it('goes nowhere without its campaign', () => {
    expect(
      destinationFor({ type: 'open_add_source', screen: 'campaign.assets' }),
    ).toBeNull()
  })
})
