import { Link } from '@tanstack/react-router'

import { AppAuth } from '@/components/layout/AppAuth'
import { AuthRegisterForm } from '@/components/forms/authRegisterForm'

function RegisterPage() {
  return (
    <AppAuth
      title="Create your organization"
      subtitle="Sign up to start managing your content"
      form={<AuthRegisterForm />}
      bottomNav={
        <>
          Already have an account?{' '}
          <Link to="/auth/login" className="text-primary-foreground font-medium">
            Log in here
          </Link>
        </>
      }
    />
  )
}

export default RegisterPage
