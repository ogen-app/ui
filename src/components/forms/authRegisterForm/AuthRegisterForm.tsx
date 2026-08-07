import { type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { useSignup } from '@/hooks/useAuth'
import { useFormValidation } from '@/hooks/useFormValidation'
import { useSignupSchema } from '@/hooks/useAuthSchemas'
import { PasswordRulesHint } from '@/components/forms/shared/PasswordRulesHint'
import { cn } from '@/lib'

export function AuthRegisterForm() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { mutate: signup, isPending, error } = useSignup()
  const { values, setField, fieldErrors, validate } = useFormValidation(useSignupSchema(), {
    organizationName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const data = validate()
    if (!data) return

    // Signup opens a session (the cookie is set on the response), so we land
    // the user straight in the app — no separate login step.
    signup(data, {
      onSuccess: () => {
        navigate({ to: '/' })
      },
    })
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 shrink-0 animate-in fade-in duration-500"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="organizationName">{t('auth.register.organizationLabel')}</Label>
          <Input
            id="organizationName"
            type="text"
            autoComplete="organization"
            variant="default"
            placeholder={t('auth.register.organizationPlaceholder')}
            value={values.organizationName}
            onChange={(e) => setField('organizationName', e.target.value)}
            aria-invalid={!!fieldErrors.organizationName}
            disabled={isPending}
          />
          {fieldErrors.organizationName && (
            <p className="text-xs text-destructive">{fieldErrors.organizationName}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">{t('auth.register.firstNameLabel')}</Label>
          <Input
            id="firstName"
            type="text"
            autoComplete="given-name"
            variant="default"
            placeholder={t('auth.register.firstNamePlaceholder')}
            value={values.firstName}
            onChange={(e) => setField('firstName', e.target.value)}
            aria-invalid={!!fieldErrors.firstName}
            disabled={isPending}
          />
          {fieldErrors.firstName && (
            <p className="text-xs text-destructive">{fieldErrors.firstName}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">{t('auth.register.lastNameLabel')}</Label>
          <Input
            id="lastName"
            type="text"
            autoComplete="family-name"
            variant="default"
            placeholder={t('auth.register.lastNamePlaceholder')}
            value={values.lastName}
            onChange={(e) => setField('lastName', e.target.value)}
            aria-invalid={!!fieldErrors.lastName}
            disabled={isPending}
          />
          {fieldErrors.lastName && (
            <p className="text-xs text-destructive">{fieldErrors.lastName}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t('auth.register.emailLabel')}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            variant="default"
            placeholder={t('auth.register.emailPlaceholder')}
            value={values.email}
            onChange={(e) => setField('email', e.target.value)}
            aria-invalid={!!fieldErrors.email}
            disabled={isPending}
          />
          {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t('auth.register.passwordLabel')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            variant="default"
            placeholder={t('auth.register.passwordPlaceholder')}
            value={values.password}
            onChange={(e) => setField('password', e.target.value)}
            aria-invalid={!!fieldErrors.password}
            disabled={isPending}
          />
          <PasswordRulesHint value={values.password} />
        </div>
        <div className="w-full">
          <Button
            type="submit"
            variant="defaultInverted"
            size="default"
            className={'w-full justify-between'}
            loading={isPending}
            disabled={isPending}
          >
            <span>{t('auth.register.submit')}</span>
            <ArrowUpRightIcon />
          </Button>
          <div className="h-4 my-4">
            <span
              className={cn(
                'text-sm text-destructive transition-opacity duration-300',
                error ? ' opacity-100' : 'opacity-0'
              )}
            >
              {error && error.message}
            </span>
          </div>
        </div>
      </form>
    </>
  )
}
