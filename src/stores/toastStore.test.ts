import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { toast, useToastStore } from './toastStore'

const titles = () => useToastStore.getState().toasts.map((t) => t.title)
const open = () => useToastStore.getState().toasts.filter((t) => t.open)

describe('the toast deck', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useToastStore.setState({ toasts: [] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('collapses a repeat of something already on screen', () => {
    // A bulk action fires one mutation per post, so a single refusal can
    // arrive thirty times over. Thirty cards would read as thirty problems.
    const first = toast.error('Unable to update post')
    const second = toast.error('Unable to update post')
    expect(second).toBe(first)
    expect(titles()).toEqual(['Unable to update post'])
  })

  it('treats a different description as a different toast', () => {
    toast.error('Unable to schedule', {
      description: 'Instagram needs an image',
    })
    toast.error('Unable to schedule', {
      description: 'The date is in the past',
    })
    expect(open()).toHaveLength(2)
  })

  it('lets the same message back once the first has gone', () => {
    toast.error('Unable to update post')
    vi.advanceTimersByTime(8_000)
    useToastStore.setState({ toasts: [] })
    toast.error('Unable to update post')
    expect(titles()).toEqual(['Unable to update post'])
  })

  it('dismisses the card at the back rather than dropping it', () => {
    // Dropping the record would unmount the element on the spot, so it would
    // pop out of existence instead of fading. It has to leave through the
    // same closed state everything else does.
    toast.info('one')
    toast.info('two')
    toast.info('three')

    expect(titles()).toEqual(['one', 'two', 'three'])
    expect(useToastStore.getState().toasts[0].open).toBe(false)
    expect(open().map((t) => t.title)).toEqual(['two', 'three'])
  })

  it('unmounts a dismissed card only after its exit animation', () => {
    toast.info('one')
    const [{ id }] = useToastStore.getState().toasts
    useToastStore.getState().dismiss(id)
    expect(titles()).toEqual(['one'])
    vi.advanceTimersByTime(300)
    expect(titles()).toEqual([])
  })
})
