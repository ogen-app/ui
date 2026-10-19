import { describe, expect, it } from 'vitest'
import {
  EMPTY_IDEA_FILTER,
  ideaFilterFromSearch,
  ideaTokensOf,
  ideaViewFromSearch,
  parseIdeaListSearch,
  searchFromIdeaFilter,
  toIdeaRequestParams,
  withIdeaToken,
  withoutIdeaToken,
} from './ideaFilter'

const NOW = new Date(2026, 9, 17, 12)
const ctx = {
  scopeCampaign: null,
  pile: 'waiting' as const,
  sort: 'waiting' as const,
  group: 'none' as const,
  now: NOW,
  timeZone: 'Europe/Kyiv',
}

describe('parseIdeaListSearch', () => {
  it('keeps what the endpoint takes and drops what it would refuse', () => {
    expect(
      parseIdeaListSearch({
        fit: 'high,bogus',
        kind: 'pdf',
        origin: 'written',
        campaign_id: 'c1,none',
        created: '7d',
        created_after: '2026-10-01',
        text: '  bees ',
        pile: 'yes',
        sort: 'fit',
        group: 'source',
        colour: 'red',
      }),
    ).toEqual({
      fit: 'high',
      kind: 'pdf',
      campaign_id: 'c1,none',
      created: '7d',
      text: 'bees',
      pile: 'yes',
      sort: 'fit',
      group: 'source',
    })
  })

  it('leaves the defaults out of the address', () => {
    expect(parseIdeaListSearch({ pile: 'waiting', sort: 'waiting' })).toEqual(
      {},
    )
    expect(ideaViewFromSearch({})).toEqual({
      pile: 'waiting',
      sort: 'waiting',
      group: 'created',
    })
    // Grouped by date added unless told not to group.
    expect(parseIdeaListSearch({ group: 'created' })).toEqual({})
    expect(ideaViewFromSearch({ group: 'none' }).group).toBe('none')
  })
})

describe('the filter and its address', () => {
  it('round-trips, a preset staying a preset', () => {
    const search = { fit: 'high,medium', author_not: 'u1', created: '30d' }
    const filter = ideaFilterFromSearch(search)
    expect(filter.createdAfter).toBe('30d')
    expect(searchFromIdeaFilter(filter)).toEqual(search)
  })

  it('reads a custom range as one token, and replaces it whole', () => {
    const filter = withIdeaToken(EMPTY_IDEA_FILTER, {
      field: 'created',
      negated: false,
      values: ['2026-10-01', '2026-10-08'],
    })
    expect(ideaTokensOf(filter)).toEqual([
      {
        field: 'created',
        negated: false,
        values: ['2026-10-01', '2026-10-08'],
      },
    ])
    const preset = withIdeaToken(filter, {
      field: 'created',
      negated: false,
      values: ['7d'],
    })
    expect(preset.createdBefore).toBeNull()
    expect(
      withoutIdeaToken(filter, ideaTokensOf(filter)[0]).createdAfter,
    ).toBeNull()
  })
})

describe('toIdeaRequestParams', () => {
  it('asks in the endpoint’s own names, presets left to the server', () => {
    const filter = ideaFilterFromSearch({
      fit: 'high',
      campaign_id: 'c1',
      created: '7d',
      text: 'wax',
    })
    expect(toIdeaRequestParams(filter, { ...ctx, group: 'source' })).toEqual({
      fit: 'high',
      campaign_id: 'c1',
      created: '7d',
      text: 'wax',
      pile: 'waiting',
      sort: 'waiting',
      group: 'source',
      tz: 'Europe/Kyiv',
    })
  })

  it('scopes a campaign’s page rather than filtering it', () => {
    const filter = ideaFilterFromSearch({ campaign_id: 'c2' })
    const params = toIdeaRequestParams(filter, { ...ctx, scopeCampaign: 'c1' })
    expect(params.campaign_id).toBeUndefined()
    expect(params.scope_campaign).toBe('c1')
  })

  it('turns "before last 7 days" into the day that window starts', () => {
    const filter = withIdeaToken(EMPTY_IDEA_FILTER, {
      field: 'created',
      negated: true,
      values: ['7d'],
    })
    expect(toIdeaRequestParams(filter, ctx).created_before).toBe('2026-10-11')
  })
})

describe('smart group queries', () => {
  it('store the grouping as it is, and open a group stored without one ungrouped', async () => {
    const { ideaViewQuery, searchFromViewQuery, matchesView } =
      await import('./ideaFilter')
    expect(ideaViewQuery({ fit: 'high' })).toBe('fit=high&group=created')
    expect(ideaViewQuery({ fit: 'high', group: 'none' })).toBe('fit=high')
    expect(searchFromViewQuery('fit=high')).toEqual({
      fit: 'high',
      group: 'none',
    })
    expect(searchFromViewQuery('fit=high&group=created')).toEqual({
      fit: 'high',
    })
    expect(matchesView({ fit: 'high', group: 'none' }, 'fit=high')).toBe(true)
    expect(matchesView({ fit: 'high' }, 'fit=high')).toBe(false)
  })
})
