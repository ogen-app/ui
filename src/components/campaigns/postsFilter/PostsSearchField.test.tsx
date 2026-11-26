import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PostsSearchField } from './PostsSearchField'

function field() {
  return screen.getByRole('searchbox') as HTMLInputElement
}

describe('the calendars’ search field (CON-534)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('writes the search once the typing rests, trimmed', () => {
    const onChange = vi.fn()
    render(<PostsSearchField value="" onChange={onChange} />)
    fireEvent.change(field(), { target: { value: 'pri' } })
    fireEvent.change(field(), { target: { value: 'pricing ' } })
    act(() => vi.advanceTimersByTime(299))
    expect(onChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('pricing')
  })

  it('writes at once on Enter, and clears on Escape', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <PostsSearchField value="" onChange={onChange} />,
    )
    fireEvent.change(field(), { target: { value: 'launch' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith('launch')
    rerender(<PostsSearchField value="launch" onChange={onChange} />)
    fireEvent.keyDown(field(), { key: 'Escape' })
    expect(onChange).toHaveBeenLastCalledWith('')
    expect(field().value).toBe('')
    act(() => vi.advanceTimersByTime(1000))
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('takes a search set elsewhere, and drops a write still waiting', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <PostsSearchField value="" onChange={onChange} />,
    )
    fireEvent.change(field(), { target: { value: 'draf' } })
    // The assistant's set_filter lands before the typing rests.
    rerender(<PostsSearchField value="pricing" onChange={onChange} />)
    expect(field().value).toBe('pricing')
    act(() => vi.advanceTimersByTime(1000))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps typing that arrives while its own write comes back', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <PostsSearchField value="" onChange={onChange} />,
    )
    fireEvent.change(field(), { target: { value: 'pri' } })
    act(() => vi.advanceTimersByTime(300))
    fireEvent.change(field(), { target: { value: 'pric' } })
    rerender(<PostsSearchField value="pri" onChange={onChange} />)
    expect(field().value).toBe('pric')
    act(() => vi.advanceTimersByTime(300))
    expect(onChange).toHaveBeenLastCalledWith('pric')
  })
})
