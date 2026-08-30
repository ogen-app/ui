import { Link, useSearch } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const { token } = useSearch({ from: '/auth/reset/' })

  const bottomNav = (
    <>
      {t('auth.reset.knowPassword')}{' '}
      <Link to="/auth/login" className="text-primary-foreground font-medium">
        {t('auth.reset.logInLink')}
      </Link>
    </>
  )

  if (!token) {
    return (
      <AppAuth
        title={t('auth.reset.brokenTitle')}
        subtitle={t('auth.reset.brokenSubtitle')}
        form={
          <p className="text-[13px] leading-5 text-secondary-foreground">
            {/* The link sits mid-sentence, so the sentence stays one key and
                `<Trans>` places the anchor — translations move it. */}
            <Trans
              i18nKey="auth.reset.brokenBody"
              components={{
                request: (
                  <Link
                    to="/auth/forgot"
                    className="text-primary-foreground font-medium"
                  />
                ),
              }}
            />
          </p>
        }
        bottomNav={bottomNav}
      />
    )
  }

  return (
    <AppAuth
      title={t('auth.reset.title')}
      subtitle={t('auth.reset.subtitle')}
      form={<AuthResetPasswordForm token={token} />}
      bottomNav={bottomNav}
    />
  )
}

export default ResetPasswordPage
