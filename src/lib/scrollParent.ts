/**
 * The nearest ancestor that actually scrolls vertically; null for the window.
 *
 * A `ScrollArea`'s viewport counts whatever its overflow says at the time:
 * Radix sets it to `scroll` only once it has measured the content, after the
 * first effects have run, so a caller looking on mount would otherwise skip
 * the viewport and find nothing.
 */
export function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    if (node.hasAttribute('data-radix-scroll-area-viewport')) return node
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
  }
  return null
}
