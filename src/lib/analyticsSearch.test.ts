import { describe, expect, it } from 'vitest'
import {
  searchFromWindow,
  searchPlatforms,
  validateAnalyticsSearch,
} from './analyticsSearch'

describe('validateAnalyticsSearch', () => {
  it('keeps a range over a span, and only a whole one', () => {
    expect(
      validateAnalyticsSearch({
        window: '7d',
        from: '2026-03-01',
        to: '2026-03-31',
      }),
    ).toEqual({ from: '2026-03-01', to: '2026-03-31' })
    expect(
      validateAnalyticsSearch({ window: '7d', from: '2026-03-01' }),
    ).toEqual({
      window: '7d',
    })
    expect(
      validateAnalyticsSearch({ from: '2026-04-01', to: '2026-03-01' }),
    ).toEqual({})
  })

  it('drops what the endpoints would refuse', () => {
    expect(
      validateAnalyticsSearch({
        window: 'forever',
        platform: 'LinkedIn,,<x>',
        campaign_id: ' ',
      }),
    ).toEqual({ platform: 'linkedin' })
  })

  it('reads the platforms as a list', () => {
    expect(searchPlatforms({ platform: 'linkedin,instagram' })).toEqual([
      'linkedin',
      'instagram',
    ])
    expect(searchPlatforms({})).toEqual([])
  })
})

describe('searchFromWindow', () => {
  it('writes a window as the address', () => {
    expect(
      searchFromWindow({
        from: '2026-03-01',
        to: '2026-03-31',
        platforms: ['instagram'],
        campaignId: 'c1',
      }),
    ).toEqual({
      from: '2026-03-01',
      to: '2026-03-31',
      platform: 'instagram',
      campaign_id: 'c1',
    })
  })

  it('keeps the period a preset when its dates did not move', () => {
    expect(
      searchFromWindow(
        { from: '2026-10-13', to: '2026-11-09', platforms: ['linkedin'] },
        { window: '28d' },
      ),
    ).toEqual({ window: '28d', platform: 'linkedin' })
  })

  it('says every platform and the whole workspace by leaving them out', () => {
    expect(
      searchFromWindow({ from: '2026-03-01', to: '2026-03-31', platforms: [] }),
    ).toEqual({
      from: '2026-03-01',
      to: '2026-03-31',
    })
  })
})
