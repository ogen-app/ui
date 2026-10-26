import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { PlansPage } from './page'
import { searchText } from '@/lib/searchText'

/**
 * Outside `_authenticated` on purpose — see `page.tsx`. Auth is still guarded
 * once, in `__root.tsx`, which is also where a checkout return's `workspace`
 * is adopted as this tab's pin before anything reads the plan.
 */
const plansSearchSchema = z.object({
  /** A tier to preselect — from the marketing link, through signup (CON-328). */
  plan: searchText,
  /** `return` when Lemon Squeezy's checkout sends the buyer back. */
  billing: searchText,
  /** The workspace that checkout was for; `__root.tsx` pins the tab to it. */
  workspace: searchText,
})

export const Route = createFileRoute('/plans/')({
  validateSearch: plansSearchSchema,
  component: PlansPage,
})
