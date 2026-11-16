import { createFileRoute } from '@tanstack/react-router'
import {
  ONBOARDING_STEPS,
  type OnboardingStep,
} from '@/components/onboarding/flow'
import { OnboardingPreview } from './page'

/**
 * TEMPORARY — a preview of the onboarding screens from fixtures, not a product
 * route. Outside `_authenticated` and the auth probe (`/design` exemption in
 * `__root.tsx`), so it runs with the API down. Never commit this directory.
 */
export const Route = createFileRoute('/design/onboarding/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { step?: OnboardingStep; tools?: boolean } => ({
    step: ONBOARDING_STEPS.includes(search.step as OnboardingStep)
      ? (search.step as OnboardingStep)
      : undefined,
    tools:
      search.tools !== undefined &&
      search.tools !== false &&
      search.tools !== 'false',
  }),
  component: OnboardingPreview,
})
