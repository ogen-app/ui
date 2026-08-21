import { createFileRoute } from '@tanstack/react-router'
import { AudiencesSection } from '@/components/brand/AudiencesSection'
import { BrandTabScroll } from '@/components/brand/tabScroll'
import { EMPTY_BRAND } from '@/components/brand/types'

/** `/brand/audiences` — who the content is for. */
export const Route = createFileRoute('/_authenticated/brand/audiences')({
  component: () => (
    <BrandTabScroll>
      <AudiencesSection audiences={EMPTY_BRAND.audiences} />
    </BrandTabScroll>
  ),
})
