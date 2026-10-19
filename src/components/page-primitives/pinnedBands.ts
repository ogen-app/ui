import { useEffect, useLayoutEffect, type RefObject } from 'react'
import { findScrollParent } from '@/lib/scrollParent'

/**
 * Group bands that pin under the page header, for a list that scrolls with
 * its page in the post page's frame (CON-392): `PageHeader` sticky inside one
 * `ScrollArea`, its 80px fade over whatever scrolls under it. The Assets and
 * Ideas lists both read this way.
 *
 * A band pins at the foot of that fade (`BAND_TOP`). While pinned it carries
 * a cap of page background up behind the header, so no row shows through the
 * fade's transparent half — only while pinned, or it would cover the last
 * rows of the group above it. The band is the page's own colour with one
 * hairline under it: the page continuing, not a strip of a second grey.
 */

/**
 * Where a band pins: the foot of the page header, whose 80px fade (24px over
 * the title, the 40px row, 16px under) the list scrolls under.
 */
export const BAND_TOP = 80

/** A band's classes: sticky at `BAND_TOP`, the cap shown while pinned. */
export const PINNED_BAND =
  "sticky top-20 border-b border-quaternary bg-background before:absolute before:inset-x-0 before:bottom-full before:hidden before:h-20 before:bg-background before:content-[''] data-pinned:before:block"

/**
 * The page's scroller: the `ScrollArea`'s viewport, found by what it is
 * rather than by its overflow — Radix sets that only once its bar mounts,
 * which on a warm cache is after the list's rows.
 */
export function scrollerOf(el: HTMLElement | null): HTMLElement | null {
  return (
    el?.closest<HTMLElement>('[data-radix-scroll-area-viewport]') ??
    findScrollParent(el)
  )
}

/**
 * Marks the bands stuck at `BAND_TOP` as pinned (`data-pinned`). Bands are
 * siblings in one list, so a later one stacks over an earlier one at the same
 * line rather than pushing it off — each stuck band carries the cap, and the
 * top one is what shows. A pixel's slack for zoom and fractional layout.
 */
function markPinned(list: HTMLElement) {
  const scroller = scrollerOf(list)
  if (!scroller) return
  const top = scroller.getBoundingClientRect().top + BAND_TOP
  for (const band of list.querySelectorAll<HTMLElement>('[data-band]')) {
    const at = band.getBoundingClientRect().top
    band.toggleAttribute('data-pinned', at <= top + 1)
  }
}

/**
 * Keeps the list's pinned band marked: on any scroll, and again whenever the
 * bands themselves change (`deps` — a new grouping, a fold, the next page),
 * since those move bands without a scroll event. Marked on the element rather
 * than held in state: it changes on every scroll, and all it switches is the
 * cap behind the header.
 */
export function usePinnedBands(
  listRef: RefObject<HTMLElement | null>,
  attached: unknown,
  deps: readonly unknown[],
) {
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    let frame = 0
    // On the document, in the capture phase: a scroll event does not bubble,
    // and the page's scroller may not be one yet when this runs.
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        markPinned(list)
      })
    }
    document.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
    })
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true })
      if (frame) cancelAnimationFrame(frame)
    }
    // `attached`: the list element exists — it mounts with its first rows.
  }, [listRef, attached])
  useLayoutEffect(() => {
    if (listRef.current) markPinned(listRef.current)
    // The caller names what moves its bands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
