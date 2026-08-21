import { createFileRoute } from '@tanstack/react-router'
import { GuardrailsSection } from '@/components/brand/GuardrailsSection'
import { BrandTabScroll } from '@/components/brand/tabScroll'
import { EMPTY_BRAND } from '@/components/brand/types'

/** `/brand/guardrails` — what is true, what may be claimed, what never may. */
export const Route = createFileRoute('/_authenticated/brand/guardrails')({
  component: () => (
    <BrandTabScroll>
      <GuardrailsSection guardrails={EMPTY_BRAND.guardrails} />
    </BrandTabScroll>
  ),
})
