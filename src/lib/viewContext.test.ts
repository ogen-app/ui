import { describe, expect, it } from 'vitest'
import {
  MAX_SELECTION_IDS,
  buildViewContext,
  listFilter,
  locationFor,
  trailingWindow,
} from './viewContext'

describe('locationFor', () => {
  it('names the screen from the deepest route', () => {
    expect(locationFor('/ideas/', {})).toEqual({ screen: 'ideas' })
    expect(
      locationFor('/campaigns/$campaignId/list', { campaignId: 'c1' }),
    ).toEqual({
      screen: 'campaign.list',
    })
  })

  it('reads a detail screen’s entity off its param', () => {
    expect(
      locationFor('/campaigns/$campaignId/assets/$assetId', {
        campaignId: 'c1',
        assetId: 'a1',
      }),
    ).toEqual({ screen: 'campaign.asset', focus: { kind: 'asset', id: 'a1' } })
    expect(
      locationFor('/foundation/voices/$voiceId', { voiceId: 'v1' }),
    ).toEqual({
      screen: 'foundation.voice',
      focus: { kind: 'voice', id: 'v1' },
    })
  })

  it('knows no screen for a route the server doesn’t', () => {
    expect(locationFor('/plans/', {})).toEqual({ screen: null })
  })
})

describe('buildViewContext', () => {
  const campaign = { kind: 'campaign', campaignId: 'c1' } as const

  it('always names the thread’s scope, wherever the user is', () => {
    const view = buildViewContext(campaign, { screen: 'ideas' }, null)
    expect(view).toEqual({
      version: 1,
      screen: 'ideas',
      scope: { kind: 'campaign', id: 'c1' },
    })
  })

  it('falls back to the thread’s own screen', () => {
    expect(buildViewContext(campaign, { screen: null }, null).screen).toBe(
      'campaign.overview',
    )
  })

  it('caps a selection and keeps its true count', () => {
    const ids = Array.from({ length: 250 }, (_, i) => `i${i}`)
    const view = buildViewContext(
      campaign,
      { screen: 'campaign.ideas' },
      {
        selection: { kind: 'idea', ids },
      },
    )
    expect(view.selection).toEqual({
      kind: 'idea',
      ids: ids.slice(0, MAX_SELECTION_IDS),
      count: 250,
    })
  })

  it('sends the screen alone when the chip was dismissed', () => {
    const view = buildViewContext(
      campaign,
      { screen: 'asset', focus: { kind: 'asset', id: 'a1' } },
      { selection: { kind: 'asset', ids: ['a1'] }, filter: 'type=PDF' },
      true,
    )
    expect(view).toEqual({
      version: 1,
      screen: 'asset',
      scope: { kind: 'campaign', id: 'c1' },
    })
  })
})

describe('listFilter', () => {
  it('keeps the question and drops what only orders a page', () => {
    expect(
      listFilter({
        pile: 'waiting',
        source_asset: 'a1',
        sort: 'fit',
        group: 'source',
        cursor: 'x',
        limit: '50',
        facets: 'source',
      }),
    ).toBe('pile=waiting&source_asset=a1')
  })
})

describe('trailingWindow', () => {
  it('ends today and spans the days asked for', () => {
    expect(trailingWindow(7, ['linkedin'], new Date(2026, 3, 15))).toEqual({
      from: '2026-04-09',
      to: '2026-04-15',
      platforms: ['linkedin'],
    })
  })
})
