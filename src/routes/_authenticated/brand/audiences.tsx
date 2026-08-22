import { createFileRoute } from '@tanstack/react-router'
import { AudiencesSection } from '@/components/brand/AudiencesSection'
import { BrandDetail } from '@/components/brand/detail'

/**
 * `/brand/audiences` — who the content is for.
 *
 * No callbacks yet: the audience editor is the next screen to be drawn, and the
 * section renders its cards and its starters inert rather than wiring them to
 * a route that does not exist. Voices is the one that has an editor.
 */
export const Route = createFileRoute('/_authenticated/brand/audiences')({
  component: () => (
    <BrandDetail section="audiences">
      {(brand) => <AudiencesSection audiences={brand.audiences} />}
    </BrandDetail>
  ),
})
