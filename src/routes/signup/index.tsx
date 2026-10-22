import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { afterSignupPath, rememberPlanIntent } from '@/lib/planIntent'

/**
 * The marketing site's way in: `/signup?plan=<tier_id>` (CON-328).
 *
 * Not a screen — it remembers the plan for this tab and moves on: to signup
 * for a visitor, straight to `/plans` for somebody already signed in. Public,
 * like `/auth/*`; `__root.tsx` exempts it from the session guard.
 */
const signupSearchSchema = z.object({
  plan: z.string().optional(),
})

export const Route = createFileRoute('/signup/')({
  validateSearch: signupSearchSchema,
  beforeLoad: ({ context, search }) => {
    rememberPlanIntent(search.plan)
    if (context.auth.isAuthenticated) {
      throw redirect({ href: afterSignupPath() })
    }
    throw redirect({ to: '/auth/register' })
  },
})
