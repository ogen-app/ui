import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import InvitePage from './page'

/**
 * The emailed link's payload. `token` is optional in the schema so a truncated
 * or hand-mangled link renders our own "this link is broken" screen instead of
 * a router search-validation error page — the same reasoning as `/auth/reset`.
 */
const inviteSearchSchema = z.object({
  token: z.string().optional(),
})

// Public, and not under `/auth`: the person following this link has no account
// yet — accepting is what creates it. `__root.tsx` exempts this path from the
// session guard for that reason. A signed-in user is not bounced either: the
// token is the gate here, and someone already in one workspace clicking an
// invite deserves the server's answer (409, "this email already has an
// account") rather than being silently dropped into the app they're in.
export const Route = createFileRoute('/invite/')({
  validateSearch: inviteSearchSchema,
  component: InvitePage,
})
