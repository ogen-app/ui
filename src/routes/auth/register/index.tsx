import { createFileRoute, redirect } from '@tanstack/react-router'
import RegisterPage from './page'

export const Route = createFileRoute('/auth/register/')({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: RegisterPage,
})
