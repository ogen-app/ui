import { describe, expect, it } from 'vitest'
import {
  assetViewFromSearch,
  assetViewQuery,
  matchesAssetView,
  searchFromAssetViewQuery,
  EMPTY_FILTER,
  boundStart,
  effectiveGroup,
  effectiveSort,
  isGrouping,
  isSort,
  filterFromSearch,
  parseAssetListSearch,
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
        updated: '7d',
        updated_before: 'yesterday',
        sort: 'relevance',
        group: 'shelf',
        lang: 'es',
        text: 'x',
      }),
    ).toEqual({
      kind: 'pdf',
      status_not: 'failed',
      tag: 't1,t2',
      ideas: 'undecided',
      updated: '7d',
      sort: 'relevance',
    })
    // A day under the bounds' names; a preset under its own, never as a bound.
    expect(
      parseAssetListSearch({
        updated_after: '7d',
        updated_before: '2026-10-08',
      }),
    ).toEqual({ updated_before: '2026-10-08' })
  })

  it('reads a numeric title as text', () => {
    expect(parseAssetListSearch({ title: 2024 })).toEqual({ title: '2024' })
  })

  it('keeps the sort, the grouping and the open group in the address', () => {
    expect(
      parseAssetListSearch({
        text: 'bees',
        sort: 'title',
        group: 'none',
        view: 'v1',
      }),
    ).toEqual({ text: 'bees', sort: 'title', group: 'none', view: 'v1' })
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
    const search = searchFromFilter(filter)
    expect(search).toEqual({
      kind: 'pdf',
      tag_not: 't1,none',
      updated_after: '2026-10-01',
      updated_before: '2026-10-08',
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
    // The preset as the server names it: it is read in `tz` there.
    expect(toRequestParams(filter, ctx)).toEqual({
      kind: 'pdf',
      updated: '7d',
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
    // Newest first otherwise, and a stored Best match without a search falls
    // back to it.
    expect(effectiveSort(EMPTY_FILTER, 'relevance')).toBe('-created_at')
    expect(effectiveSort(EMPTY_FILTER, null)).toBe('-created_at')
  })
})

describe('sorting', () => {
  it('offers each field one way and back, and no longer most undecided first', () => {
    expect(isSort('-ideas_undecided')).toBe(false)
    expect(isSort('-created_at')).toBe(true)
  })
})

describe('grouping', () => {
  it('is the address’s when it names one, else the device’s', () => {
    expect(
      assetViewFromSearch(
        { group: 'tag' },
        { sort: null, group: 'kind' },
        null,
      ),
    ).toEqual({ sort: '-created_at', group: 'tag' })
    expect(
      assetViewFromSearch({}, { sort: 'title', group: 'kind' }, null),
    ).toEqual({ sort: 'title', group: 'kind' })
    expect(searchFromFilter(pdfs)).toEqual({ kind: 'pdf' })
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

describe('smart groups', () => {
  it('store the filter, the sort and the grouping, canonically', () => {
    expect(
      assetViewQuery(
        { tag: 't2,t1', kind: 'pdf', updated: '7d', view: 'v1' },
        { sort: 'title', group: 'created' },
      ),
    ).toBe('group=created&kind=pdf&sort=title&tag=t1,t2&updated=7d')
    // Not grouped is stored as no grouping.
    expect(
      assetViewQuery({ kind: 'pdf' }, { sort: '-created_at', group: 'none' }),
    ).toBe('kind=pdf&sort=-created_at')
  })

  it('open as the address, and tell an edited page from a saved one', () => {
    const query = 'kind=pdf&sort=title'
    const search = searchFromAssetViewQuery(query)
    expect(search).toEqual({ kind: 'pdf', sort: 'title', group: 'none' })
    expect(
      matchesAssetView(search, { sort: 'title', group: 'none' }, query),
    ).toBe(true)
    expect(
      matchesAssetView(
        { ...search, tag: 't1' },
        { sort: 'title', group: 'none' },
        query,
      ),
    ).toBe(false)
    expect(
      matchesAssetView(search, { sort: 'title', group: 'tag' }, query),
    ).toBe(false)
  })
})
