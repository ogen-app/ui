import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import ResetPasswordPage from './page'

/**
 * The emailed link's payload. `token` is optional in the schema so that a
 * truncated or hand-mangled link renders our own "this link is broken" screen
 * instead of a router search-validation error page.
 */
const resetSearchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/auth/reset/')({
  validateSearch: resetSearchSchema,
  // No authenticated bounce here, unlike the other auth routes: a signed-in
  // user clicking the emailed link IS the Profile "email me a reset link"
  // flow — their session stays valid until confirm revokes it, so redirecting
  // them home would dead-end the only way to change a password. The token is
  // the gate on this screen, not the session.
  component: ResetPasswordPage,
})
