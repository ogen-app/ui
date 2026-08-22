import { createFileRoute } from '@tanstack/react-router'
import { LookSection } from '@/components/brand/LookSection'
import { BrandDetail } from '@/components/brand/detail'

/** `/brand/look` — logos with jobs, colours with roles, type, imagery. */
export const Route = createFileRoute('/_authenticated/brand/look')({
  component: () => (
    <BrandDetail section="look">
      {(brand) => <LookSection variant="page" look={brand.look} />}
    </BrandDetail>
  ),
})
