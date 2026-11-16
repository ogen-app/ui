import { InboxIcon, PaletteIcon } from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { campaignSection } from '@/lib/campaignSections'
import type { PlaceId } from '@/lib/campaignScope'

/**
 * A place's glyph and its permanent hue — what the rail row draws and what
 * the page header leads with, so the two are visibly the same place. Foundation
 * and the Inbox have no hue, nor do the utilities (`lib/campaignSections`).
 */
export function placeGlyph(place: PlaceId): {
  icon: IconSvgElement
  tone: string | undefined
} {
  if (place === 'foundation') return { icon: PaletteIcon, tone: undefined }
  if (place === 'inbox') return { icon: InboxIcon, tone: undefined }
  const section = campaignSection(place)
  return { icon: section.icon, tone: section.tone }
}
