import { describe, expect, it } from 'vitest'
import {
  EMPTY_POST_FILTER,
  parsePostListSearch,
  postFilterFromSearch,
  postRequestParams,
  postTokensOf,
  searchFromPostFilter,
  withPostToken,
  withoutPostToken,
} from './postFilter'

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
