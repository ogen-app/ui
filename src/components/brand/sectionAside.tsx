import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import {
  brandSection,
  brandSectionCopy,
  type BrandSectionId,
} from '@/lib/brandSections'
import { readByStatus } from './shell'

/**
 * The side column of a Foundation section (`BrandSectionFrame`): what the
 * section is for, under the section's glyph. The name is the header's, so the
 * card is "About" rather than the name again.
 *
 * It answers the question somebody has before changing an entry — what is this
 * for — and it does not belong between the header and the list, where the
 * explanation used to sit on every visit. Which campaigns use an entry is on
 * the entry's own card (`useUsedBy`): a Used by card here listed every
 * campaign a second time, taller than the list beside it.
 */
export function BrandSectionAside({
  section,
  empty,
}: {
  section: BrandSectionId
  /** The section has nothing in it yet: the card says what that costs. */
  empty: boolean
}) {
  const { t } = useTranslation()
  const info = brandSection(section)
  const copy = brandSectionCopy(t, section)
  return (
    <Card
      icon={info.icon}
      tone={info.tone}
      title={t('brand.detail.about')}
      status={readByStatus(t, info.readBy)}
    >
      <p className="text-sm">{copy.description}</p>
      {empty && <p className="text-sm">{copy.whenEmpty}</p>}
    </Card>
  )
}
