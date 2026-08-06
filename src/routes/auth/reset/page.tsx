import { Link, useSearch } from '@tanstack/react-router'

import { AppAuth } from '@/components/layout/AppAuth'
import { AuthResetPasswordForm } from '@/components/forms/authResetPasswordForm'

/**
 * The destination of the emailed link: set the new password.
 *
 * A missing `?token=` is handled here rather than by the form, because without
 * one there is nothing to submit — showing password fields that cannot work
 * would be worse than saying so.
 */
function ResetPasswordPage() {
  const { token } = useSearch({ from: '/auth/reset/' })

  if (!token) {
    return (
      <AppAuth
        title="This link doesn't work"
        subtitle="It looks incomplete — mail clients sometimes cut long links in half"
        form={
          <p className="text-[13px] leading-5 text-secondary-foreground">
            Open the link straight from the email, or{' '}
            <Link to="/auth/forgot" className="text-primary-foreground font-medium">
              request a new one
            </Link>
            .
          </p>
        }
        bottomNav={
          <>
            Know your password?{' '}
            <Link to="/auth/login" className="text-primary-foreground font-medium">
              Log in
            </Link>
          </>
        }
      />
    )
  }

  return (
    <AppAuth
      title="Set a new password"
      subtitle="Choose something you haven't used here before"
      form={<AuthResetPasswordForm token={token} />}
      bottomNav={
        <>
          Know your password?{' '}
          <Link to="/auth/login" className="text-primary-foreground font-medium">
            Log in
          </Link>
        </>
      }
    />
  )
}

export default ResetPasswordPage
