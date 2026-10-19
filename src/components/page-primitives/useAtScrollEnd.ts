import { useEffect, useState, type RefObject } from 'react'

/**
 * Whether a `ScrollArea` is scrolled to its end — or has nothing to scroll.
 *
 * Watches the viewport's scroll and the content's size, so a page of rows
 * arriving, a band folding or a row opening all re-answer without a scroll.
 * Takes the `ScrollArea`'s root and finds the Radix viewport inside it.
 */
export function useAtScrollEnd(rootRef: RefObject<HTMLElement | null>) {
  const [atEnd, setAtEnd] = useState(false)
  useEffect(() => {
    const viewport = rootRef.current?.querySelector<HTMLElement>(
      '[data-radix-scroll-area-viewport]',
    )
    if (!viewport) return
    const measure = () =>
      setAtEnd(
        viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1,
      )
    measure()
    viewport.addEventListener('scroll', measure, { passive: true })
    const content = viewport.firstElementChild
    const resized =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    resized?.observe(viewport)
    if (content) resized?.observe(content)
    return () => {
      viewport.removeEventListener('scroll', measure)
      resized?.disconnect()
    }
  }, [rootRef])
  return atEnd
}
