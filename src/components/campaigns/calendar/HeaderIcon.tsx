import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { Calendar04Icon } from '@hugeicons/core-free-icons'

/**
 * An icon in the calendar's header row, drawn as the rail draws its places
 * (`layout/nav/NavIcon`): Hugeicons, 18px, the set's 1.5 stroke. Its own
 * component rather than `NavIcon` because a `Button` sizes any `svg` without a
 * `size-` class down to 16px; this one carries the class.
 */
export function HeaderIcon({ icon }: { icon: IconSvgElement }) {
  return (
    <HugeiconsIcon
      icon={icon}
      strokeWidth={1.5}
      aria-hidden
      className="size-[18px] shrink-0"
    />
  )
}

/**
 * `Calendar04Icon` with its body filled, for the unscheduled toggle while
 * posts wait: the free set has no solid weight. The rule under the rings is
 * drawn in the page's colour so the glyph keeps its header strip, as a solid
 * calendar does.
 */
const CALENDAR_FILLED: IconSvgElement = Calendar04Icon.map(([tag, attrs]) => {
  if (attrs.d === 'M3 10H21') {
    return [tag, { ...attrs, stroke: 'var(--color-background)' }]
  }
  if (String(attrs.d).startsWith('M13 4H11')) {
    return [tag, { ...attrs, fill: 'currentColor' }]
  }
  return [tag, attrs]
}) as IconSvgElement

/**
 * The unscheduled toggle's calendar: filled while anything waits, outlined
 * when nothing does. Drawn without the `strokeWidth` override — the icon's
 * own paths are 1.5 already, and the override would repaint the strip in
 * `currentColor`.
 */
export function UnscheduledCalendarIcon({ filled }: { filled: boolean }) {
  return (
    <HugeiconsIcon
      icon={filled ? CALENDAR_FILLED : Calendar04Icon}
      aria-hidden
      className="size-[18px] shrink-0"
    />
  )
}
