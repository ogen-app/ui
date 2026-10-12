import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { FadingScroll } from './FadingScroll'

/** jsdom does no layout, so the scroller's geometry is set by hand. */
function sized(el: HTMLElement, { scrollHeight = 1000, clientHeight = 600 }) {
  Object.defineProperty(el, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  })
  Object.defineProperty(el, 'clientHeight', {
    configurable: true,
    value: clientHeight,
  })
}

function faders(container: HTMLElement) {
  const [top, bottom] = Array.from(
    container.querySelectorAll<HTMLElement>('[aria-hidden]'),
  ).filter((el) => el.parentElement === container.firstElementChild)
  return { top, bottom }
}

describe('FadingScroll', () => {
  it('fades the bottom while more is below, and the top once scrolled', () => {
    const { container } = render(
      <FadingScroll className="max-h-[600px]">
        <p>Long reading</p>
      </FadingScroll>,
    )
    const scroller = container.querySelector<HTMLElement>('.overflow-y-auto')!
    sized(scroller, {})

    fireEvent.scroll(scroller)
    expect(faders(container).top).toHaveClass('opacity-0')
    expect(faders(container).bottom).toHaveClass('opacity-100')

    scroller.scrollTop = 400
    fireEvent.scroll(scroller)
    expect(faders(container).top).toHaveClass('opacity-100')
    expect(faders(container).bottom).toHaveClass('opacity-0')
  })

  it('has no fades when the reading fits', () => {
    const { container } = render(
      <FadingScroll>
        <p>Short</p>
      </FadingScroll>,
    )
    const scroller = container.querySelector<HTMLElement>('.overflow-y-auto')!
    sized(scroller, { scrollHeight: 300, clientHeight: 300 })
    fireEvent.scroll(scroller)
    expect(faders(container).top).toHaveClass('opacity-0')
    expect(faders(container).bottom).toHaveClass('opacity-0')
  })
})
