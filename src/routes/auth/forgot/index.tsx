import { createFileRoute, redirect } from '@tanstack/react-router'
import ForgotPasswordPage from './page'

export const Route = createFileRoute('/auth/forgot/')({
  beforeLoad: ({ context }) => {
    // Someone with a live session doesn't need a reset link; they change the
    // password from Profile. Mirrors the login/register guards.
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: ForgotPasswordPage,
})
