import { Link, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { AppAuth } from '@/components/layout/AppAuth'
import { AuthGoogleSignupForm } from '@/components/forms/authGoogleSignupForm'
import { GoogleSignInButton } from '@/components/auth/GoogleSignIn'
import { Button } from '@/components/ui/button'
import { usePendingGoogleSignup } from '@/hooks/useGoogleSignIn'
import { ApiError } from '@/services/api/errors'

/**
 * The last step of a Google sign-up (CON-396): name the workspace.
 *
 * Google has already said who this is, so the only question left is the one it
 * can't answer. The pending sign-up is read first — a link that is already
 * spent says so before anything is typed, and its one way out is the button
 * that starts over, since a fresh Google sign-in picks up exactly here.
 */
function GoogleSignupPage() {
  const { t } = useTranslation()
  const { token } = useSearch({ from: '/auth/register/google/' })
  const pending = usePendingGoogleSignup(token)

  const bottomNav = (
    <>
      {t('auth.register.haveAccount')}{' '}
      <Link to="/auth/login" className="text-primary-foreground font-medium">
        {t('auth.googleSignup.logInLink')}
      </Link>
    </>
  )

  // Unknown, used and expired all answer 404 by design, so they read the same.
  const spent =
    pending.isError &&
    pending.error instanceof ApiError &&
    pending.error.status === 404

  if (pending.isError && !spent) {
    return (
      <AppAuth
        title={t('auth.googleSignup.loadFailedTitle')}
        subtitle={t('auth.googleSignup.loadFailedSubtitle')}
        form={
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void pending.refetch()}
          >
            {t('common.tryAgain')}
          </Button>
        }
        bottomNav={bottomNav}
      />
    )
  }

  if (!token || spent) {
    return (
      <AppAuth
        title={t('auth.googleSignup.expiredTitle')}
        subtitle={t('auth.googleSignup.expiredSubtitle')}
        form={<GoogleSignInButton />}
        bottomNav={bottomNav}
      />
    )
  }

  return (
    <AppAuth
      title={t('auth.googleSignup.title')}
      subtitle={t('auth.googleSignup.subtitle')}
      form={
        pending.data ? (
          <AuthGoogleSignupForm token={token} pending={pending.data} />
        ) : (
          <p className="text-[13px] leading-5 text-secondary-foreground">
            {t('common.loading')}
          </p>
        )
      }
      bottomNav={bottomNav}
    />
  )
}

export default GoogleSignupPage
