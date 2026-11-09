import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'

/**
 * A rail row's glyph: Hugeicons at 16px with the set's 1.5 stroke, the same
 * slot at both levels so the labels line up. `tone` is a campaign section's
 * permanent hue (`lib/campaignSections`); the workspace's rows are in ink.
 */
export function NavIcon({
  icon,
  tone,
}: {
  icon: IconSvgElement
  tone?: string
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={16}
      strokeWidth={1.5}
      aria-hidden
      className="flex-none"
      style={tone ? { color: tone } : undefined}
    />
  )
}
