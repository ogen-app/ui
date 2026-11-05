import { createFileRoute } from '@tanstack/react-router'

import { STEPS, type Step } from './-flow'
import { MarketerOnboardingHarness } from './page'

/**
 * TEMPORARY — a clickable prototype of onboarding for a freelance marketer or
 * a marketing-literate founder, not a product route. It sits outside
 * `_authenticated` (no app chrome) and outside the auth probe in
 * `__root.tsx`, so it runs with the API down.
 *
 * `?step=` opens a screen directly; `?tools` shows the moderator's bar (jump,
 * restart, speed). Hand testers the bare URL.
 */
export const Route = createFileRoute('/design/onboarding-marketer/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { step?: Step; tools?: boolean } => ({
    step: STEPS.includes(search.step as Step)
      ? (search.step as Step)
      : undefined,
    tools:
      search.tools !== undefined &&
      search.tools !== false &&
      search.tools !== 'false',
  }),
  component: MarketerOnboardingHarness,
})
