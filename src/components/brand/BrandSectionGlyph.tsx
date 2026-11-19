import { HugeiconsIcon } from '@hugeicons/react'
import { brandSection, type BrandSectionId } from '@/lib/brandSections'

/**
 * A Foundation section's glyph in its permanent hue — the mark every card
 * about that section leads with, wherever the card is: on the hub, and on a
 * campaign's Strategy where the campaign picks from it or reads it. The hue is
 * the only colour on such a card, so it is what says "this is the Foundation's".
 */
export function BrandSectionGlyph({ id }: { id: BrandSectionId }) {
  const section = brandSection(id)
  return (
    <HugeiconsIcon
      icon={section.icon}
      size={20}
      strokeWidth={1.5}
      className="shrink-0"
      style={{ color: section.tone }}
      aria-hidden
    />
  )
}
