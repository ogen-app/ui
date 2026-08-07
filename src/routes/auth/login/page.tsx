import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { AppAuth } from '@/components/layout/AppAuth'
import { AuthLoginForm } from '@/components/forms/authLoginForm'

/** The login screen: shared auth layout around `AuthLoginForm`. */
function LoginPage() {
  const { t } = useTranslation()
  return (
    <AppAuth
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      form={<AuthLoginForm />}
      bottomNav={
        <>
          {t('auth.login.noAccount')}{' '}
          <Link to="/auth/register" className="text-primary-foreground font-medium">
            {t('auth.login.signUpLink')}
          </Link>
        </>
      }
    />
  )
}

export default LoginPage
