import { createFileRoute } from '@tanstack/react-router'
import { GuardrailsSection } from '@/components/brand/GuardrailsSection'
import { BrandDetail } from '@/components/brand/detail'

/** `/brand/guardrails` — what is true, what may be claimed, what never may. */
export const Route = createFileRoute('/_authenticated/brand/guardrails')({
  component: () => (
    <BrandDetail section="guardrails">
      {(brand) => <GuardrailsSection guardrails={brand.guardrails} />}
    </BrandDetail>
  ),
})
