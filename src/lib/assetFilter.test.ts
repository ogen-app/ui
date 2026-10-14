import { describe, expect, it } from 'vitest'
import {
  EMPTY_FILTER,
  boundStart,
  effectiveGroup,
  effectiveSort,
  isGrouping,
  filterFromSearch,
  parseAssetListSearch,
  parseFieldPrefix,
  searchFromFilter,
  toRequestParams,
  tokensOf,
  withToken,
  withoutToken,
  type AssetFilter,
} from './assetFilter'

const ctx = {
  scopeCampaign: null,
  sort: '-updated_at' as const,
  // Monday 13 October 2026, mid-afternoon local time.
  now: new Date(2026, 9, 13, 15, 30),
  timeZone: 'Europe/Kyiv',
}

const pdfs: AssetFilter = withToken(EMPTY_FILTER, {
  field: 'kind',
  negated: false,
  values: ['pdf'],
})

describe('the URL', () => {
  it('keeps what the endpoint takes and drops what it would refuse', () => {
    expect(
      parseAssetListSearch({
        kind: 'pdf,bogus',
        status_not: 'failed',
        tag: 't1, t2,t1',
        ideas: 'undecided',
        updated_after: '7d',
        updated_before: 'yesterday',
        sort: 'relevance',
        lang: 'es',
        text: 'x',
      }),
    ).toEqual({
      kind: 'pdf',
      status_not: 'failed',
      tag: 't1,t2',
      ideas: 'undecided',
      updated_after: '7d',
    })
  })

  it('reads a numeric title as text', () => {
    expect(parseAssetListSearch({ title: 2024 })).toEqual({ title: '2024' })
  })

  it('keeps relevance only beside text', () => {
    expect(parseAssetListSearch({ text: 'bees', sort: 'relevance' }).sort).toBe(
      'relevance',
    )
  })

  it('round-trips a filter through the search params', () => {
    const filter = withToken(
      withToken(pdfs, { field: 'tag', negated: true, values: ['t1', 'none'] }),
      {
        field: 'updated',
        negated: false,
        values: ['2026-10-01', '2026-10-08'],
      },
    )
    const search = searchFromFilter(filter, 'title')
    expect(search).toEqual({
      kind: 'pdf',
      tag_not: 't1,none',
      updated_after: '2026-10-01',
      updated_before: '2026-10-08',
      sort: 'title',
    })
    expect(filterFromSearch(parseAssetListSearch(search))).toEqual(filter)
  })
})

describe('tokens', () => {
  it('hold one token per field and operator, in field order', () => {
    const filter = withToken(
      withToken(pdfs, { field: 'title', negated: false, values: ['q3'] }),
      { field: 'kind', negated: true, values: ['csv'] },
    )
    expect(tokensOf(filter)).toEqual([
      { field: 'title', negated: false, values: ['q3'] },
      { field: 'kind', negated: false, values: ['pdf'] },
      { field: 'kind', negated: true, values: ['csv'] },
    ])
  })

  it('edits a field by replacing its token, not adding another', () => {
    const both = withToken(pdfs, {
      field: 'kind',
      negated: false,
      values: ['pdf', 'web'],
    })
    expect(tokensOf(both)).toEqual([
      { field: 'kind', negated: false, values: ['pdf', 'web'] },
    ])
  })

  it('reads two days as one range token, and a single bound as in or before', () => {
    const range = withToken(EMPTY_FILTER, {
      field: 'updated',
      negated: false,
      values: ['2026-10-01', '2026-10-08'],
    })
    expect(tokensOf(range)).toHaveLength(1)

    const week = withToken(range, {
      field: 'updated',
      negated: false,
      values: ['7d'],
    })
    // Replacing half of a range replaces the range.
    expect(week.updatedBefore).toBeNull()
    expect(tokensOf(week)).toEqual([
      { field: 'updated', negated: false, values: ['7d'] },
    ])

    const before = withToken(week, {
      field: 'updated',
      negated: true,
      values: ['2026-09-01'],
    })
    expect(tokensOf(before)).toHaveLength(2)
    expect(withoutToken(before, tokensOf(before)[1]).updatedBefore).toBeNull()
  })
})

describe('the request', () => {
  it('turns presets into the start of a local day', () => {
    expect(boundStart('1d', ctx.now)).toEqual(new Date(2026, 9, 13))
    expect(boundStart('7d', ctx.now)).toEqual(new Date(2026, 9, 7))
    expect(boundStart('30d', ctx.now)).toEqual(new Date(2026, 8, 14))
    expect(boundStart('month', ctx.now)).toEqual(new Date(2026, 9, 1))
    expect(boundStart('2026-10-01', ctx.now)).toEqual(new Date(2026, 9, 1))
  })

  it('asks with the filter, the scope, the sort and the time zone', () => {
    const filter = withToken(pdfs, {
      field: 'updated',
      negated: false,
      values: ['7d'],
    })
    expect(toRequestParams(filter, ctx)).toEqual({
      kind: 'pdf',
      updated_after: new Date(2026, 9, 7).toISOString(),
      sort: '-updated_at',
      group: 'created',
      tz: 'Europe/Kyiv',
    })
  })

  it('never sends a campaign filter on a campaign’s own page', () => {
    const filter = withToken(pdfs, {
      field: 'campaign',
      negated: false,
      values: ['c2'],
    })
    expect(toRequestParams(filter, { ...ctx, scopeCampaign: 'c1' })).toEqual({
      kind: 'pdf',
      scope_campaign: 'c1',
      sort: '-updated_at',
      group: 'created',
      tz: 'Europe/Kyiv',
    })
  })

  it('sorts by relevance while searching inside the documents, unless told otherwise', () => {
    const text = withToken(EMPTY_FILTER, {
      field: 'text',
      negated: false,
      values: ['bees'],
    })
    expect(effectiveSort(text, undefined)).toBe('relevance')
    expect(effectiveSort(text, 'title')).toBe('title')
    // Most undecided first otherwise — the list is read for what is left.
    expect(effectiveSort(EMPTY_FILTER, 'relevance')).toBe('-ideas_undecided')
  })
})

describe('the old syntax', () => {
  it('jumps to a field’s value step', () => {
    expect(parseFieldPrefix('tag:gar')).toEqual({
      field: 'tag',
      negated: false,
      rest: 'gar',
    })
    expect(parseFieldPrefix('-status:')).toEqual({
      field: 'status',
      negated: true,
      rest: '',
    })
    expect(parseFieldPrefix('type:pdf')?.field).toBe('kind')
    expect(parseFieldPrefix('https://acme.com')).toBeNull()
    expect(parseFieldPrefix('bees')).toBeNull()
  })
})

describe('grouping', () => {
  it('is not part of the address — it is a per-device preference', () => {
    expect(parseAssetListSearch({ group: 'tag' })).toEqual({})
    expect(searchFromFilter(pdfs, 'title')).toEqual({
      kind: 'pdf',
      sort: 'title',
    })
  })

  it('asks the server to group by date added unless told otherwise, and sends nothing for none', () => {
    expect(toRequestParams(pdfs, ctx).group).toBe('created')
    expect(toRequestParams(pdfs, { ...ctx, group: 'tag' }).group).toBe('tag')
    expect(toRequestParams(pdfs, { ...ctx, group: 'none' })).not.toHaveProperty(
      'group',
    )
  })

  it('has no campaign grouping on a campaign’s own page', () => {
    expect(effectiveGroup('campaign', 'c1')).toBe('created')
    expect(effectiveGroup('campaign', null)).toBe('campaign')
    expect(effectiveGroup(undefined, null)).toBe('created')
  })

  it('no longer knows the ideas grouping a stored preference may still hold', () => {
    expect(isGrouping('ideas')).toBe(false)
    expect(isGrouping('created')).toBe(true)
    expect(isGrouping('none')).toBe(true)
  })
})
