import { useEffect } from 'react'
import type { RefObject } from 'react'
import { findScrollParent } from '@/lib/scrollParent'
import { stickyColumns } from '@/lib/stickyColumns'

/** Where the columns sit side by side — Tailwind's `lg`. */
const SIDE_BY_SIDE = '(min-width: 64rem)'
/** The left column's sticky `top` (`lg:top-4`). */
const TOP = 16
/** Kept clear at the bottom: the page's 80px bottom fade, and a margin. */
const BOTTOM = 96

/**
 * Lays out a pinned column beside a longer one that is read (CON-373), as
 * `stickyColumns` describes: the pinned one held while the other is read,
 * then the read one held by its foot while the pinned one shows the rest of
 * itself. Which side each is on is the caller's: the asset page pins its left
 * column, `PageColumns` its right.
 *
 * Measured, not scrolled: a `ResizeObserver` re-reads the heights whenever
 * either column or the scroll area changes size — an idea opening, a lens or
 * a tab switching, a cover loading, the window resizing — and the result is
 * plain sticky positioning. Nothing runs while the page scrolls.
 *
 * Tabbing into the left column's foot while it is still pinned below the
 * screen would land focus out of sight (the page can scroll, the pinned
 * column does not move with it), so focus there scrolls to the end of the
 * page, where the foot shows.
 */
export function useStickyColumns(
  rowRef: RefObject<HTMLElement | null>,
  leftRef: RefObject<HTMLElement | null>,
  rightRef: RefObject<HTMLElement | null>,
  {
    enabled = true,
    sideBySide,
  }: {
    enabled?: boolean
    /**
     * Whether the two columns are side by side right now. Defaults to the
     * window being `lg`; a layout that switches on its own width (a container
     * query) says so from the row instead.
     */
    sideBySide?: (row: HTMLElement) => boolean
  } = {},
) {
  useEffect(() => {
    if (!enabled) return
    const row = rowRef.current
    const left = leftRef.current
    const right = rightRef.current
    if (!row || !left || !right) return
    if (typeof ResizeObserver === 'undefined' || !window.matchMedia) return

    const scroller = findScrollParent(row)
    const wide = window.matchMedia(SIDE_BY_SIDE)
    const isWide = () => (sideBySide ? sideBySide(row) : wide.matches)
    const viewport = () => scroller?.clientHeight ?? window.innerHeight

    const apply = () => {
      const { rightTop, rowMinHeight } = isWide()
        ? stickyColumns({
            viewport: viewport(),
            top: TOP,
            bottom: BOTTOM,
            left: left.offsetHeight,
            right: right.offsetHeight,
          })
        : { rightTop: null, rowMinHeight: null }
      right.style.position = rightTop === null ? '' : 'sticky'
      right.style.top = rightTop === null ? '' : `${rightTop}px`
      row.style.minHeight = rowMinHeight === null ? '' : `${rowMinHeight}px`
    }

    const onFocus = (e: FocusEvent) => {
      const target = e.target
      if (!(target instanceof HTMLElement) || !isWide()) return
      requestAnimationFrame(() => {
        const visibleBottom =
          (scroller?.getBoundingClientRect().top ?? 0) + viewport() - BOTTOM
        if (target.getBoundingClientRect().bottom <= visibleBottom) return
        const end = scroller ?? document.scrollingElement
        end?.scrollTo({ top: end.scrollHeight })
      })
    }

    const observer = new ResizeObserver(apply)
    observer.observe(left)
    observer.observe(right)
    if (scroller) observer.observe(scroller)
    window.addEventListener('resize', apply)
    wide.addEventListener('change', apply)
    left.addEventListener('focusin', onFocus)
    apply()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', apply)
      wide.removeEventListener('change', apply)
      left.removeEventListener('focusin', onFocus)
      right.style.position = ''
      right.style.top = ''
      row.style.minHeight = ''
    }
  }, [rowRef, leftRef, rightRef, enabled, sideBySide])
}
