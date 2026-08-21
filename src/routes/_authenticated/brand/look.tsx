import { createFileRoute } from '@tanstack/react-router'
import { LookSection } from '@/components/brand/LookSection'
import { BrandTabScroll } from '@/components/brand/tabScroll'
import { EMPTY_BRAND } from '@/components/brand/types'

/** `/brand/look` — logos with jobs, colours with roles, type, imagery. */
export const Route = createFileRoute('/_authenticated/brand/look')({
  component: () => (
    <BrandTabScroll>
      <LookSection variant="page" look={EMPTY_BRAND.look} />
    </BrandTabScroll>
  ),
})
