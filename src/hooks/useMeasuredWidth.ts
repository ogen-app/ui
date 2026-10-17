import { useCallback, useState } from 'react'

/**
 * The element's width, measured on mount and kept up to date.
 *
 * Ours rather than `@visx/responsive`'s `ParentSize`, which measures from a div
 * it positions absolutely and updates only from a `ResizeObserver`. Two things
 * went wrong with that here: the absolute div is out of flow, so a container
 * sized by its children collapsed to nothing — and a plot mounted *after* the
 * first paint, which is every plot drawn by switching the selected measure,
 * never received an observation at all and stayed blank for good.
 *
 * The synchronous first read on attach is the part that matters: it lands
 * before paint, so the chart is drawn the frame its card is, and it does
 * not depend on an element whose size never changes being reported anyway.
 */
export function useMeasuredWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0)

  // A callback ref rather than an object one, so an element that replaces the
  // first — a list drawn where its loader was — is measured too. It measures
  // on attach, before paint, and returns its own cleanup (React 19).
  const ref = useCallback((node: T | null) => {
    if (!node) return
    setWidth(node.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}
