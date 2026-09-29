import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import SecureAccountPage from './page'

/**
 * The emailed link's payload. `token` is optional in the schema so that a
 * truncated link renders our own "this link isn't valid" screen instead of a
 * router search-validation error page — the same reasoning as `/auth/reset`.
 */
const secureAccountSearchSchema = z.object({
  token: z.string().optional(),
})

// Public — every `/auth/*` path is exempt from the session guard in
// `__root.tsx` — and, unlike login and Forgot password, no signed-in bounce:
// the person most likely to open this link is someone who is signed in right
// now and has just been told somebody else is too (CON-318).
export const Route = createFileRoute('/auth/secure-account/')({
  validateSearch: secureAccountSearchSchema,
  component: SecureAccountPage,
})
