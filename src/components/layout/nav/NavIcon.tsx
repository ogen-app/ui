import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'

/**
 * A place's glyph: Hugeicons with the set's 1.5 stroke, 18px in the rail and
 * larger beside a page title. `tone` is the place's permanent hue
 * (`lib/campaignSections`); Foundation, the Inbox and the utilities are in ink.
 */
export function NavIcon({
  icon,
  tone,
  size = 18,
}: {
  icon: IconSvgElement
  tone?: string
  size?: number
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={1.5}
      aria-hidden
      className="flex-none"
      style={tone ? { color: tone } : undefined}
    />
  )
}
