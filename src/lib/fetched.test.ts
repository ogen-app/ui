import { describe, expect, it } from 'vitest'
import { fetched } from './fetched'

describe('fetched', () => {
  it('is pending while there is nothing and nothing has gone wrong', () => {
    expect(fetched({ data: undefined, isError: false })).toEqual({
      status: 'pending',
    })
  })

  it('is an error when the fetch failed with nothing to show', () => {
    expect(fetched({ data: undefined, isError: true })).toEqual({
      status: 'error',
    })
  })

  it('is ready with the data', () => {
    expect(fetched({ data: [1, 2], isError: false })).toEqual({
      status: 'ready',
      data: [1, 2],
    })
  })

  it('keeps the last good answer when a refetch fails', () => {
    expect(fetched({ data: ['a'], isError: true })).toEqual({
      status: 'ready',
      data: ['a'],
    })
  })

  it('treats an empty answer as an answer', () => {
    // The distinction the screen is built on: no documents and no *reply* are
    // different findings, and `[]` is the first one.
    expect(fetched({ data: [], isError: false })).toEqual({
      status: 'ready',
      data: [],
    })
  })
})
