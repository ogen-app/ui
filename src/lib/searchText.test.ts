import { describe, expect, it } from 'vitest'

import { searchTextOf } from './searchText'

describe('searchText', () => {
  it('keeps text as it is', () => {
    expect(searchTextOf('pro')).toBe('pro')
    expect(searchTextOf('return')).toBe('return')
  })

  it('reads an all-digit value the router parsed as a number back as text', () => {
    // `?workspace=123` — still that workspace's id, not a reason to fail.
    expect(searchTextOf(123)).toBe('123')
  })

  it('drops anything else rather than failing the route', () => {
    expect(searchTextOf(undefined)).toBeUndefined()
    expect(searchTextOf(true)).toBeUndefined()
    expect(searchTextOf({ a: 1 })).toBeUndefined()
    expect(searchTextOf(['pro'])).toBeUndefined()
  })
})
