import { describe, expect, it } from 'vitest'
import { awaiting, fetched } from './fetched'

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

describe('awaiting', () => {
  it('waits while the first request is in flight', () => {
    expect(awaiting({ status: 'pending', fetchStatus: 'fetching' })).toBe(true)
  })

  it('waits while a retry is paused', () => {
    // The state the whole helper exists for: `isLoading` is false here, and
    // `isError` is false too, so the screens that read those drew their empty
    // state over a bank that had never been read.
    expect(awaiting({ status: 'pending', fetchStatus: 'paused' })).toBe(true)
  })

  it('does not wait on a query nobody enabled', () => {
    // Pending for ever and never going to be asked — the answer is whatever
    // the screen shows without it, which is why `isPending` alone is wrong.
    expect(awaiting({ status: 'pending', fetchStatus: 'idle' })).toBe(false)
  })

  it('does not wait once there is an answer, or a failure', () => {
    expect(awaiting({ status: 'success', fetchStatus: 'idle' })).toBe(false)
    expect(awaiting({ status: 'error', fetchStatus: 'idle' })).toBe(false)
  })

  it('does not wait through a refetch of something already shown', () => {
    // There is data on screen; drawing a loader over it would be a step back.
    expect(awaiting({ status: 'success', fetchStatus: 'fetching' })).toBe(false)
  })
})
