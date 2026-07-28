import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/** How much of a long instruction the bubble shows before it is folded away. */
const COLLAPSED_LINES = 5

/**
 * A user turn: a filled bubble pushed to the right of the column, with a tail
 * hanging off its bottom-right corner. Only the user gets a bubble — assistant
 * replies are plain text, so the bubbles mark where the conversation turns.
 *
 * A pasted brief can run for pages, and the reply under it is what the user
 * came back for, so anything past five lines folds under a fade. The bubble
 * keeps its own height honest — no scrollbar inside it — and hovering offers
 * the rest.
 */
export function UserMessage({ content }: { content: string }) {
  const textRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  // Both in px, so the open/close transition has two numbers to animate
  // between: `max-height: none` is not animatable.
  const [collapsed, setCollapsed] = useState(COLLAPSED_LINES * 21)
  const [full, setFull] = useState(0)

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el) return
    // Read the line height rather than assuming it: the bubble's type scale is
    // free to change without this quietly clamping at the wrong place.
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight)
    setCollapsed((Number.isFinite(lineHeight) ? lineHeight : 21) * COLLAPSED_LINES)
    // scrollHeight is the unclamped height even while max-height hides part of
    // it, which is exactly what the expanded state needs.
    setFull(el.scrollHeight)
  }, [content])

  // The panel is resizable and the bubble reflows with it: what fitted in five
  // lines at one width may not at another.
  useEffect(() => {
    const el = textRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setFull(el.scrollHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const overflowing = full > collapsed + 1
  // Open and *settled*: the clamp is dropped altogether once the animation has
  // played, so a later reflow can't be cut off by a stale pixel height.
  const [settled, setSettled] = useState(false)
  const maxHeight = expanded ? (settled ? undefined : full) : overflowing ? collapsed : undefined

  const toggle = () => {
    if (!expanded) {
      setSettled(false)
      setExpanded(true)
      return
    }
    // Pin the open height first: `max-height: none` → a number is a jump, not
    // a transition. Next frame the clamp comes back and animates down.
    setSettled(false)
    requestAnimationFrame(() => setExpanded(false))
  }

  return (
    <div className="flex justify-end pl-8">
      <div className="group relative max-w-[85%]">
        <div className="relative bg-assistant-bubble text-assistant-bubble-foreground px-4 py-3">
          <div
            ref={textRef}
            style={{ maxHeight }}
            onTransitionEnd={() => expanded && setSettled(true)}
            className="overflow-hidden text-sm/[1.5] whitespace-pre-wrap break-words transition-[max-height] duration-300 ease-out"
          >
            {content}
          </div>

          {overflowing && !expanded && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-assistant-bubble"
            />
          )}

          {/* Only on hover: at rest the fade already says there is more, and a
              permanent control in every long bubble would out-shout the reply.
              Collapsed it floats on the fade; open there is nothing to float
              on, so it takes a line of its own under the text. */}
          {overflowing && !expanded && (
            <div className="absolute inset-x-0 bottom-1 flex justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                onClick={toggle}
                className="px-2 py-0.5 text-xs font-medium cursor-pointer"
              >
                Show all
              </button>
            </div>
          )}
          {overflowing && expanded && (
            <button
              type="button"
              onClick={toggle}
              className="mt-1 block text-xs font-medium opacity-0 transition-opacity duration-150 cursor-pointer group-hover:opacity-100 focus-visible:opacity-100"
            >
              Show less
            </button>
          )}
        </div>
        {/* Overlaps the bubble by 1px: an exact `top-full` leaves a hairline
            gap once the browser rounds the bubble's height. Wide and shallow
            rather than 45° — a pointed tail reads as a speech-balloon spike. */}
        <span
          aria-hidden
          className="absolute top-[calc(100%-1px)] right-0 block h-1.5 w-12 bg-assistant-bubble [clip-path:polygon(0_0,100%_0,100%_100%)]"
        />
      </div>
    </div>
  )
}
