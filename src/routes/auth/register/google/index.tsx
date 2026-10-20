import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { isFeatureEnabled } from '@/config/featureFlags'
import GoogleSignupPage from './page'

/**
 * Where a Google sign-in lands when the Google account has no Ogen account yet
 * (CON-396): the callback redirects here with a 15-minute `?token=`. `token`
 * is optional in the schema so a truncated link renders our own "expired"
 * screen instead of a router error page — the same reasoning as `/invite`.
 */
const googleSignupSearchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/auth/register/google/')({
  validateSearch: googleSignupSearchSchema,
  beforeLoad: ({ context }) => {
    // With the feature off there is no way to have arrived here honestly.
    if (!isFeatureEnabled('google-sign-in')) {
      throw redirect({ to: '/auth/register' })
    }
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: GoogleSignupPage,
})
