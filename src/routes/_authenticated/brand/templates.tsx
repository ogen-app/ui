import { createFileRoute } from '@tanstack/react-router'
import { TemplatesScreen } from '@/components/brand/TemplatesScreen'
import { BrandDetail } from '@/components/brand/detail'

/**
 * `/brand/templates` — platform × ratio.
 *
 * `scroll={false}`: this screen has a fixed platform rail beside a scrolling
 * detail panel and owns both scrollers itself.
 */
export const Route = createFileRoute('/_authenticated/brand/templates')({
  component: () => (
    <BrandDetail section="templates" scroll={false}>
      {(brand) => <TemplatesScreen templates={brand.templates} />}
    </BrandDetail>
  ),
})
