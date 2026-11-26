import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EMPTY_POST_FILTER,
  POST_FILTER_MODEL,
  parseCalendarSearch,
  parseCampaignPostListSearch,
  parsePostListSearch,
  postFilterFromSearch,
  postGroupingFromSearch,
  postRequestParams,
  postTokensOf,
  searchFromPostFilter,
  withPostToken,
  withoutPostToken,
} from './postFilter'

// The search is behind `posts-text-search`; on here unless a test says.
const flags = vi.hoisted(() => ({ textSearch: true }))
vi.mock('@/config/featureFlags', () => ({
  isFeatureEnabled: (flag: string) =>
    flag === 'posts-text-search' ? flags.textSearch : false,
}))

describe('parsePostListSearch (CON-472)', () => {
  it('keeps what the endpoint takes and drops what it would refuse', () => {
    expect(
      parsePostListSearch({
        status: 'draft,bogus',
        status_not: 'published',
        platform: 'sq-ig',
        post_type: 'carousel',
        scheduled: 'yes',
        scheduled_after: '2026-04-21',
        scheduled_before: 'next tuesday',
        colour: 'red',
      }),
    ).toEqual({
      status: 'draft',
      status_not: 'published',
      platform: 'sq-ig',
      post_type: 'carousel',
      scheduled: 'yes',
      scheduled_after: '2026-04-21',
    })
  })

  it('refuses a day that doesn’t exist rather than reading it as another', () => {
    expect(
      parsePostListSearch({
        scheduled_after: '2026-02-31',
        scheduled_before: '2026-03-01',
      }),
    ).toEqual({ scheduled_before: '2026-03-01' })
  })

  it('drops "without a date" beside a date range, which the endpoint refuses', () => {
    expect(
      parsePostListSearch({ scheduled: 'no', scheduled_after: '2026-04-21' }),
    ).toEqual({ scheduled_after: '2026-04-21' })
  })
})

describe('the filter, its tokens and its request', () => {
  it('round-trips, and reads a range as one token', () => {
    const search = {
      status: 'draft,failed',
      platform_not: 'sq-x',
      scheduled_after: '2026-04-21',
      scheduled_before: '2026-04-28',
    }
    const filter = postFilterFromSearch(search)
    expect(searchFromPostFilter(filter)).toEqual(search)
    expect(postTokensOf(filter)).toEqual([
      { field: 'status', negated: false, values: ['draft', 'failed'] },
      { field: 'platform', negated: true, values: ['sq-x'] },
      { field: 'date', negated: false, values: ['2026-04-21', '2026-04-28'] },
    ])
  })

  it('sends the zone only with a date, so an unfiltered read asks what it did', () => {
    expect(postRequestParams(EMPTY_POST_FILTER, 'Europe/Kyiv')).toEqual({})
    expect(
      postRequestParams(
        withPostToken(EMPTY_POST_FILTER, {
          field: 'date',
          negated: true,
          values: ['2026-05-01'],
        }),
        'Europe/Kyiv',
      ),
    ).toEqual({ scheduled_before: '2026-05-01', tz: 'Europe/Kyiv' })
  })

  it('lets the newer of "without a date" and a date range win', () => {
    const dated = withPostToken(EMPTY_POST_FILTER, {
      field: 'date',
      negated: false,
      values: ['2026-04-21', '2026-04-28'],
    })
    const undated = withPostToken(dated, {
      field: 'scheduled',
      negated: false,
      values: ['no'],
    })
    expect(undated).toMatchObject({
      scheduled: 'no',
      after: null,
      before: null,
    })
    expect(
      withPostToken(undated, {
        field: 'date',
        negated: false,
        values: ['2026-04-21'],
      }),
    ).toMatchObject({ scheduled: null, after: '2026-04-21' })
  })

  it('takes both "with" and "without a date" as no filter', () => {
    expect(
      withPostToken(EMPTY_POST_FILTER, {
        field: 'scheduled',
        negated: false,
        values: ['yes', 'no'],
      }).scheduled,
    ).toBeNull()
  })

  it('removes a clause whole', () => {
    const filter = postFilterFromSearch({
      status: 'draft',
      status_not: 'failed',
    })
    expect(
      withoutPostToken(filter, { field: 'status', negated: true }).status,
    ).toEqual({ any: ['draft'], not: [] })
  })
})

describe('the workspace’s campaign field and the grouping', () => {
  it('asks the workspace endpoint for campaigns, kept and left out', () => {
    const search = parsePostListSearch({
      campaign_id: 'c1,c2',
      campaign_id_not: 'c3',
    })
    expect(postRequestParams(postFilterFromSearch(search), 'UTC')).toEqual({
      campaign_id: 'c1,c2',
      campaign_id_not: 'c3',
    })
  })

  it('drops the campaign on a campaign’s own pages, which the address names', () => {
    expect(
      parseCampaignPostListSearch({
        campaign_id: 'c1',
        status: 'draft',
        group: 'campaign',
      }),
    ).toEqual({ status: 'draft' })
  })

  it('keeps a grouping it knows, outside the request', () => {
    const search = parsePostListSearch({ group: 'status', status: 'draft' })
    expect(postGroupingFromSearch(search)).toBe('status')
    expect(postRequestParams(postFilterFromSearch(search), 'UTC')).toEqual({
      status: 'draft',
    })
    expect(postGroupingFromSearch(parsePostListSearch({ group: 'tag' }))).toBe(
      'none',
    )
  })
})

describe('the search (CON-534)', () => {
  beforeEach(() => {
    flags.textSearch = true
  })

  it('keeps one trimmed phrase, cut to what the server takes', () => {
    expect(parsePostListSearch({ text: '  pricing page ' })).toEqual({
      text: 'pricing page',
    })
    expect(parsePostListSearch({ text: '   ' })).toEqual({})
    expect(parsePostListSearch({ text: 'a'.repeat(250) }).text).toHaveLength(
      200,
    )
  })

  it('is a clause of its own, last, and goes to the endpoint as it is', () => {
    const filter = postFilterFromSearch(
      parseCampaignPostListSearch({ status: 'draft', text: '50% off_now' }),
    )
    expect(postTokensOf(filter)).toEqual([
      { field: 'status', negated: false, values: ['draft'] },
      { field: 'text', negated: false, values: ['50% off_now'] },
    ])
    expect(postRequestParams(filter, 'UTC')).toEqual({
      status: 'draft',
      text: '50% off_now',
    })
    expect(withoutPostToken(filter, { field: 'text', negated: false })).toEqual(
      { ...filter, text: '' },
    )
  })

  it('is typed into Add as a search', () => {
    expect(POST_FILTER_MODEL.kindOf('text')).toBe('search')
    expect(POST_FILTER_MODEL.freeText).toEqual(['text'])
    expect(
      withPostToken(EMPTY_POST_FILTER, {
        field: 'text',
        negated: false,
        values: [' launch '],
      }).text,
    ).toBe('launch')
  })

  it('is all a calendar carries', () => {
    expect(
      parseCalendarSearch({
        text: 'pricing',
        status: 'draft',
        group: 'status',
      }),
    ).toEqual({ text: 'pricing' })
    expect(parseCalendarSearch({ status: 'draft' })).toEqual({})
  })

  it('is dropped from the address with the flag off', () => {
    flags.textSearch = false
    expect(parsePostListSearch({ text: 'pricing', status: 'draft' })).toEqual({
      status: 'draft',
    })
    expect(parseCalendarSearch({ text: 'pricing' })).toEqual({})
    expect(POST_FILTER_MODEL.freeText).toEqual([])
  })
})
