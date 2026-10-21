import { Link, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { AppAuth } from '@/components/layout/AppAuth'
import { AuthLoginForm } from '@/components/forms/authLoginForm'
import { googleErrorMessage } from '@/lib/googleSignInError'

type LoginFlags = { expired?: boolean; reset?: boolean; error?: string }

/**
 * What the screen says under its title.
 *
 * Most arrivals here are deliberate and get the standing line. Three are not:
 * a session that died mid-edit, a password reset that just finished, and a
 * Google sign-in that came back without a session (`?error=`, CON-396). All of
 * them need saying, and all say it here rather than as a banner above the form
 * — the subtitle is already the sentence explaining why this screen exists, so
 * a state message belongs in it instead of stacked on top of it.
 *
 * Deliberately not coloured. None of these is a success or a failure the
 * person caused; they are the reason you are looking at a login form, and
 * colour would make the reset case read as a congratulation and the others as
 * errors. The Google case is checked first: it is the newest thing that
 * happened, and its sentence names the way forward.
 */
export function loginSubtitle(
  { expired, reset, error }: LoginFlags,
  t: TFunction,
): string {
  const google = googleErrorMessage(t, error)
  if (google) return google
  if (expired) return t('auth.login.expired')
  if (reset) return t('auth.login.afterReset')
  return t('auth.login.subtitle')
}

/** The login screen: shared auth layout around `AuthLoginForm`. */
function LoginPage() {
  const { t } = useTranslation()
  const { expired, reset, error } = useSearch({ from: '/auth/login/' })

  return (
    <AppAuth
      title={t('auth.login.title')}
      subtitle={loginSubtitle({ expired, reset, error }, t)}
      form={<AuthLoginForm />}
      bottomNav={
        <>
          {t('auth.login.noAccount')}{' '}
          <Link
            to="/auth/register"
            className="text-primary-foreground font-medium"
          >
            {t('auth.login.signUpLink')}
          </Link>
        </>
      }
    />
  )
}

export default LoginPage
