import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { fetchSignupMode } from '@/hooks/useSignupAccess'
import { afterSignupPath, rememberPlanIntent } from '@/lib/planIntent'
import { searchText } from '@/lib/searchText'
import SignupPage from './page'

/**
 * The public way in: the marketing link `/signup?plan=<tier_id>` (CON-328) and
 * the tester invite `/signup?invite=<token>` (CON-402). Public, like `/auth/*`;
 * `__root.tsx` exempts it from the session guard.
 *
 * - **An invite** always renders here, signed in or not and in either signup
 *   mode — invites work in both, and a signed-in person is told why this link
 *   is not for the account they are in rather than being moved on silently.
 * - **No invite, signed in:** the plan was remembered; on to `/plans`.
 * - **No invite, signed out:** to the register form while signup is open, and
 *   the private-beta screen here while it is invite-only — `?plan=` included,
 *   since a price is no way in while strangers cannot sign up at all.
 *
 * `error` is the one way back in from elsewhere: the Google step sends a
 * refused address here as `error=invite_email_mismatch`.
 */
const signupSearchSchema = z.object({
  plan: searchText,
  invite: searchText,
  error: searchText,
})

export const Route = createFileRoute('/signup/')({
  validateSearch: signupSearchSchema,
  beforeLoad: async ({ context, search }) => {
    rememberPlanIntent(search.plan)
    if (search.invite) return
    if (context.auth.isAuthenticated) {
      throw redirect({ href: afterSignupPath() })
    }
    if ((await fetchSignupMode()) === 'open') {
      throw redirect({ to: '/auth/register' })
    }
  },
  component: SignupPage,
})
