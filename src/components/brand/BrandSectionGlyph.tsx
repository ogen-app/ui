import { brandSection, type BrandSectionId } from '@/lib/brandSections'

/**
 * A Foundation section's glyph in its permanent hue — the mark every card
 * about that section leads with, wherever the card is: on the hub, and on a
 * campaign's Strategy where the campaign picks from it or reads it. The hue is
 * the only colour on such a card, so it is what says "this is the Foundation's".
 */
export function BrandSectionGlyph({ id }: { id: BrandSectionId }) {
  const section = brandSection(id)
  const Icon = section.icon
  return (
    <Icon
      className="size-5 shrink-0"
      style={{ color: section.tone }}
      aria-hidden
    />
  )
}
