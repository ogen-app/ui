import { Link } from '@tanstack/react-router'

import { AppAuth } from '@/components/layout/AppAuth'
import { AuthLoginForm } from '@/components/forms/authLoginForm'

/** The login screen: shared auth layout around `AuthLoginForm`. */
function LoginPage() {
  return (
    <AppAuth
      title="Log in"
      subtitle="Log in to continue managing your content"
      form={<AuthLoginForm />}
      bottomNav={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/auth/register" className="text-primary-foreground font-medium">
            Sign up
          </Link>
        </>
      }
    />
  )
}

export default LoginPage
