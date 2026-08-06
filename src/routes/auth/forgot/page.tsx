import { Link } from '@tanstack/react-router'

import { AppAuth } from '@/components/layout/AppAuth'
import { AuthForgotPasswordForm } from '@/components/forms/authForgotPasswordForm'

/** "I can't get in": request the one-time reset link. */
function ForgotPasswordPage() {
  return (
    <AppAuth
      title="Reset your password"
      subtitle="We'll email you a link to set a new one"
      form={<AuthForgotPasswordForm />}
      bottomNav={
        <>
          Remembered it?{' '}
          <Link to="/auth/login" className="text-primary-foreground font-medium">
            Log in
          </Link>
        </>
      }
    />
  )
}

export default ForgotPasswordPage
