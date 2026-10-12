import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib'

/** Depth of each edge's ramp, in px. */
const FADE = 40

/**
 * A capped block that scrolls in place, its edges fading into the surface —
 * the asset page's reading (Summary and Key points). A plain colour ramp, not
 * `SurfaceFader`'s blur: this is body text someone is reading, and blurring
 * the line about to scroll into view only makes it harder to read.
 *
 * Each edge fades only when there is something past it: the bottom while more
 * is below (so from the start, when the reading overflows), the top once it
 * has been scrolled. A reading that fits has no fades at all — a ramp over the
 * last line of a block that does not scroll reads as text cut off.
 */
export function FadingScroll({
  children,
  className,
}: {
  children: ReactNode
  /** The cap and layout of the scrolling block, e.g. `max-h-[600px]`. */
  className?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [edges, setEdges] = useState({ above: false, below: false })

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const above = el.scrollTop > 1
    const below = el.scrollTop + el.clientHeight < el.scrollHeight - 1
    setEdges((prev) =>
      prev.above === above && prev.below === below ? prev : { above, below },
    )
  }, [])

  // Content and width change the overflow (a lens switch, a resize), not just
  // scrolling — so measure on size changes too, where the browser can say.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    for (const child of Array.from(el.children)) observer.observe(child)
    return () => observer.disconnect()
  }, [measure, children])

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={measure}
        className={cn('overflow-y-auto', className)}
      >
        {children}
      </div>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-primary to-transparent transition-opacity duration-200',
          edges.above ? 'opacity-100' : 'opacity-0',
        )}
        style={{ height: FADE }}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary to-transparent transition-opacity duration-200',
          edges.below ? 'opacity-100' : 'opacity-0',
        )}
        style={{ height: FADE }}
      />
    </div>
  )
}
