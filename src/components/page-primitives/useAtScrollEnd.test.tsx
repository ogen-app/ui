import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useAtScrollEnd } from './useAtScrollEnd'

/** A viewport whose geometry the test sets: jsdom lays nothing out. */
function Harness() {
  const ref = useRef<HTMLDivElement>(null)
  const atEnd = useAtScrollEnd(ref)
  return (
    <div ref={ref}>
      <div data-radix-scroll-area-viewport data-testid="viewport">
        <div />
      </div>
      <p>{atEnd ? 'end' : 'more'}</p>
    </div>
  )
}

function geometry(el: HTMLElement, top: number) {
  Object.defineProperties(el, {
    scrollTop: { value: top, configurable: true },
    clientHeight: { value: 500, configurable: true },
    scrollHeight: { value: 1500, configurable: true },
  })
}

describe('useAtScrollEnd', () => {
  it('answers at the end of the scroll, and not before', () => {
    render(<Harness />)
    const viewport = screen.getByTestId('viewport')
    geometry(viewport, 0)
    act(() => void fireEvent.scroll(viewport))
    expect(screen.getByText('more')).toBeInTheDocument()

    geometry(viewport, 1000)
    act(() => void fireEvent.scroll(viewport))
    expect(screen.getByText('end')).toBeInTheDocument()

    geometry(viewport, 400)
    act(() => void fireEvent.scroll(viewport))
    expect(screen.getByText('more')).toBeInTheDocument()
  })
})
