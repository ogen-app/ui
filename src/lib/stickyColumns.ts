/** What `stickyColumns` measures, in pixels. */
export type ColumnHeights = {
  /** The scroll area's visible height. */
  viewport: number
  /** Room kept above a pinned column — its sticky `top`. */
  top: number
  /** Room kept below a column held by its foot (the page's bottom fade). */
  bottom: number
  /** The pinned column's height. */
  left: number
  /** The reading column's height. */
  right: number
}

/**
 * How two columns scroll in one page (CON-373): the left pinned at `top`
 * while the right is read, then — once the right's foot reaches the bottom of
 * the screen — the right held there while the left moves up by what it
 * overflows, so its own foot comes into view. Nothing scrolls inside a column.
 *
 * The left column is `position: sticky; top` in CSS already. When it is too
 * tall for the screen and the right is the longer, the right is pinned by its
 * foot (a negative sticky `top`) and the row is made taller by the overflow,
 * which is the scroll that reveals the left column's foot. In every other
 * case — the left fits, or the right is the shorter — nothing is needed: a
 * left column that fits stays pinned, and a page whose right column is the
 * shorter scrolls as one.
 */
export function stickyColumns({
  viewport,
  top,
  bottom,
  left,
  right,
}: ColumnHeights): { rightTop: number | null; rowMinHeight: number | null } {
  const overflow = Math.max(0, left - (viewport - top - bottom))
  if (overflow === 0 || right <= left)
    return { rightTop: null, rowMinHeight: null }
  return { rightTop: viewport - bottom - right, rowMinHeight: right + overflow }
}
