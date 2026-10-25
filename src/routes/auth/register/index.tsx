import { createFileRoute, redirect } from '@tanstack/react-router'

import { fetchSignupMode } from '@/hooks/useSignupAccess'
import RegisterPage from './page'

export const Route = createFileRoute('/auth/register/')({
  beforeLoad: async ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
    // While self-registration is off the form cannot succeed, so a stranger
    // reaching it from the login page's link gets the private-beta screen
    // instead (CON-402). The server refuses regardless; this saves the typing.
    if ((await fetchSignupMode()) === 'invite_only') {
      throw redirect({ to: '/signup' })
    }
  },
  component: RegisterPage,
})
