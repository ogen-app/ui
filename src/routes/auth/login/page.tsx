import { Link, useSearch } from '@tanstack/react-router'

import { AppAuth } from '@/components/layout/AppAuth'
import { AuthLoginForm } from '@/components/forms/authLoginForm'

type LoginFlags = { expired?: boolean; reset?: boolean }

/**
 * What the screen says under its title.
 *
 * Most arrivals here are deliberate and get the standing line. Two are not:
 * a session that died mid-edit, and a password reset that just finished. Both
 * need saying, and both say it here rather than as a banner above the form —
 * the subtitle is already the sentence explaining why this screen exists, so
 * a state message belongs in it instead of stacked on top of it.
 *
 * Deliberately not coloured. Neither of these is a success or a failure; they
 * are the reason you are looking at a login form, and colour would make the
 * reset case read as a congratulation and the expiry as an error.
 */
export function loginSubtitle({ expired, reset }: LoginFlags): string {
  if (expired) return 'Your session expired — log in again to pick up where you left off'
  if (reset) return 'Your password has been changed. Log in with the new one'
  return 'Log in to continue managing your content'
}

/** The login screen: shared auth layout around `AuthLoginForm`. */
function LoginPage() {
  const { expired, reset } = useSearch({ from: '/auth/login/' })

  return (
    <AppAuth
      title="Log in"
      subtitle={loginSubtitle({ expired, reset })}
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
