import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { AppAuth } from '@/components/layout/AppAuth'
import { AuthForgotPasswordForm } from '@/components/forms/authForgotPasswordForm'

/** "I can't get in": request the one-time reset link. */
function ForgotPasswordPage() {
  const { t } = useTranslation()
  return (
    <AppAuth
      title={t('auth.forgot.title')}
      subtitle={t('auth.forgot.subtitle')}
      form={<AuthForgotPasswordForm />}
      bottomNav={
        <>
          {t('auth.forgot.remembered')}{' '}
          <Link to="/auth/login" className="text-primary-foreground font-medium">
            {t('auth.forgot.logInLink')}
          </Link>
        </>
      }
    />
  )
}

export default ForgotPasswordPage
