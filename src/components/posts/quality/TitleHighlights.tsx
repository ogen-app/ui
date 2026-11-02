import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib'
import {
  markClass,
  markRank,
  paintSegments,
  type MarkTone,
} from '@/lib/qualityHighlights.ts'
import type { TitleMark } from '@/hooks/useQualityHighlights.ts'
import { SEVERITY_SWATCH } from './tokens.ts'

function toneOf(mark: TitleMark, chosen: number | null): MarkTone {
  if (mark.edited) return 'edited'
  return mark.index === chosen ? 'chosen' : 'pale'
}

/**
 * The quality marks in the post title (CON-441). A `<textarea>` can't paint
 * part of its own text, so this is a copy of the title laid out underneath it
 * in transparent ink, carrying only the washes and underlines; the textarea on
 * top stays the thing you type into.
 *
 * `className` must set the textarea's own type and wrapping, or the marks sit
 * under the wrong letters.
 */
export function TitleHighlights({
  title,
  marks,
  chosen,
  className,
}: {
  title: string
  marks: TitleMark[]
  chosen: number | null
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const picked = marks.find((m) => m.index === chosen && !m.edited)
  const pickedIndex = picked?.index ?? null
  // Chosen from the list: bring the title back on screen, as the body does.
  useEffect(() => {
    if (pickedIndex === null) return
    const reduce = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    ref.current?.scrollIntoView?.({
      block: 'nearest',
      behavior: reduce ? 'auto' : 'smooth',
    })
  }, [pickedIndex])

  if (marks.length === 0) return null
  const painted = paintSegments(
    marks.map((m) => ({
      start: m.start,
      end: m.end,
      mark: m,
      rank: markRank(m.severity, toneOf(m, chosen)),
    })),
  )
  const parts: ReactNode[] = []
  let at = 0
  for (const { start, end, mark } of painted) {
    if (start > at) parts.push(title.slice(at, start))
    const tone = toneOf(mark, chosen)
    parts.push(
      <span
        key={start}
        className={markClass(mark.severity, tone)}
        data-quality-chosen={tone === 'chosen' ? '' : undefined}
      >
        {title.slice(start, end)}
      </span>,
    )
    at = end
  }
  if (at < title.length) parts.push(title.slice(at))

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 whitespace-pre-wrap break-words text-transparent',
        className,
      )}
    >
      {/* E2's square, in the gutter beside the title. */}
      {picked && (
        <span
          className={cn(
            'absolute -left-6 top-[0.45em] size-2',
            SEVERITY_SWATCH[picked.severity] ?? SEVERITY_SWATCH.low,
          )}
        />
      )}
      {parts}
    </div>
  )
}
