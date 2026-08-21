import { createFileRoute } from '@tanstack/react-router'
import { TemplatesScreen } from '@/components/brand/TemplatesScreen'
import { EMPTY_BRAND } from '@/components/brand/types'

/**
 * `/brand/templates` — platform × ratio.
 *
 * No `BrandTabScroll`: this screen has a fixed platform rail beside a scrolling
 * detail panel and owns both scrollers itself.
 */
export const Route = createFileRoute('/_authenticated/brand/templates')({
  component: () => <TemplatesScreen templates={EMPTY_BRAND.templates} />,
})
