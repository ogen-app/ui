import { createFileRoute, redirect } from '@tanstack/react-router'
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
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: ResetPasswordPage,
})
