import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { PlansPage } from './page'
import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * Outside `_authenticated` on purpose — see `page.tsx`. Auth is still guarded
 * once, in `__root.tsx`, which is also where a checkout return's `workspace`
 * is adopted as this tab's pin before anything reads the plan.
 *
 * The flag is enforced here, not only on the buttons that link here: with tiers
 * off the URL has to behave as though the screen does not exist.
 */
const plansSearchSchema = z.object({
  /** A tier to preselect — from the marketing link, through signup (CON-328). */
  plan: z.string().optional(),
  /** `return` when Lemon Squeezy's checkout sends the buyer back. */
  billing: z.string().optional(),
  /** The workspace that checkout was for; `__root.tsx` pins the tab to it. */
  workspace: z.string().optional(),
})

export const Route = createFileRoute('/plans/')({
  validateSearch: plansSearchSchema,
  beforeLoad: () => {
    if (!isFeatureEnabled('workspace-tiers')) throw redirect({ to: '/' })
  },
  component: PlansPage,
})
