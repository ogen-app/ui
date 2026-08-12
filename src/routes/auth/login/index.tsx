import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import LoginPage from './page'

/**
 * A banner flag in the URL, normalised to a boolean.
 *
 * It has to accept anything, because the same flag arrives as three different
 * types. A router navigation (`search: { reset: true }`) passes a real boolean;
 * a full page load written by `lib/sessionExpiry.ts` carries `?expired=1`,
 * which the router's search parser reads as the **number** `1`; and
 * `?reset=true` comes through as a string. A schema that named only some of
 * those types would reject the URL outright and replace the login screen with
 * a router error page — which is precisely the screen a user with an expired
 * session must not be shown.
 */
// Absent stays absent rather than becoming `false`: the router serialises the
// validated search object back into the address bar, so returning a boolean
// either way would leave every login URL carrying `?expired=false&reset=false`.
const flag = z
  .unknown()
  .optional()
  .transform((v) => (v === true || v === 1 || v === '1' || v === 'true' ? true : undefined))

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
  /** The session died while the app was open, rather than never existing. */
  expired: flag,
  /** Arrived here from a completed password reset. */
  reset: flag,
})

export const Route = createFileRoute('/auth/login/')({
  validateSearch: loginSearchSchema,
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})
