import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { AppAuth } from '@/components/layout/AppAuth'
import { AuthRegisterForm } from '@/components/forms/authRegisterForm'

function RegisterPage() {
  const { t } = useTranslation()
  return (
    <AppAuth
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      form={<AuthRegisterForm />}
      bottomNav={
        <>
          {t('auth.register.haveAccount')}{' '}
          <Link
            to="/auth/login"
            className="text-primary-foreground font-medium"
          >
            {t('auth.register.logInLink')}
          </Link>
        </>
      }
    />
  )
}

export default RegisterPage
