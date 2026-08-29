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
import { FormError } from '@/components/forms/shared/FormError'
import { focusFirstInvalid } from '@/components/forms/shared/focusFirstInvalid'
import { PasswordRules } from '@/components/forms/shared/PasswordRules'

/**
 * Self-service signup: organization + first admin in one step (CON-97).
 *
 * `POST /api/tenants` opens a session on success, so this lands the user in
 * the app rather than sending them to log in with what they just typed.
 */
export function AuthRegisterForm() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { mutate: signup, isPending, error, reset } = useSignup()
  const { values, setField, fieldErrors, validate } = useFormValidation(
    useSignupSchema(),
    {
      organizationName: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  )

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const data = validate()
    if (!data) {
      focusFirstInvalid(e.currentTarget)
      return
    }

    signup(data, {
      onSuccess: () => {
        navigate({ to: '/' })
      },
    })
  }

  /**
   * Every field clears the server error, not just the email.
   *
   * The failure this form actually produces is "that email is taken", and the
   * user's fix is to edit a field. Leaving the message up while they do
   * contradicts the field they are correcting — and there is no way to tell
   * from here which edit was the fix, so any edit retires it.
   */
  const change =
    <K extends keyof typeof values>(name: K) =>
    (value: string) => {
      setField(name, value as (typeof values)[K])
      if (error) reset()
    }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 shrink-0 animate-in fade-in duration-500"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="organizationName">
          {t('auth.register.organizationLabel')}
        </Label>
        <Input
          id="organizationName"
          name="organization"
          type="text"
          autoComplete="organization"
          variant="default"
          placeholder={t('auth.register.organizationPlaceholder')}
          value={values.organizationName}
          onChange={(e) => change('organizationName')(e.target.value)}
          aria-invalid={!!fieldErrors.organizationName}
          aria-describedby={
            fieldErrors.organizationName ? 'organizationName-error' : undefined
          }
          disabled={isPending}
        />
        {fieldErrors.organizationName && (
          <p id="organizationName-error" className="text-xs text-destructive">
            {fieldErrors.organizationName}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="firstName">{t('auth.register.firstNameLabel')}</Label>
        <Input
          id="firstName"
          name="given-name"
          type="text"
          autoComplete="given-name"
          variant="default"
          placeholder={t('auth.register.firstNamePlaceholder')}
          value={values.firstName}
          onChange={(e) => change('firstName')(e.target.value)}
          aria-invalid={!!fieldErrors.firstName}
          aria-describedby={
            fieldErrors.firstName ? 'firstName-error' : undefined
          }
          disabled={isPending}
        />
        {fieldErrors.firstName && (
          <p id="firstName-error" className="text-xs text-destructive">
            {fieldErrors.firstName}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lastName">{t('auth.register.lastNameLabel')}</Label>
        <Input
          id="lastName"
          name="family-name"
          type="text"
          autoComplete="family-name"
          variant="default"
          placeholder={t('auth.register.lastNamePlaceholder')}
          value={values.lastName}
          onChange={(e) => change('lastName')(e.target.value)}
          aria-invalid={!!fieldErrors.lastName}
          aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
          disabled={isPending}
        />
        {fieldErrors.lastName && (
          <p id="lastName-error" className="text-xs text-destructive">
            {fieldErrors.lastName}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t('auth.register.emailLabel')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          variant="default"
          placeholder={t('auth.register.emailPlaceholder')}
          value={values.email}
          onChange={(e) => change('email')(e.target.value)}
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          disabled={isPending}
        />
        {fieldErrors.email && (
          <p id="email-error" className="text-xs text-destructive">
            {fieldErrors.email}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t('auth.register.passwordLabel')}</Label>
        <Input
          id="password"
          name="new-password"
          type="password"
          autoComplete="new-password"
          variant="default"
          placeholder={t('auth.register.passwordPlaceholder')}
          value={values.password}
          onChange={(e) => change('password')(e.target.value)}
          aria-invalid={!!fieldErrors.password}
          // The rules line is this field's error message — see `PasswordRules`.
          aria-describedby="password-rules"
          disabled={isPending}
        />
        <PasswordRules id="password-rules" value={values.password} />
      </div>
      <div className="w-full">
        <Button
          type="submit"
          variant="defaultInverted"
          size="default"
          className="w-full justify-between"
          loading={isPending}
          disabled={isPending}
        >
          <span>{t('auth.register.submit')}</span>
          <ArrowUpRightIcon />
        </Button>
        <FormError message={error?.message} />
      </div>
    </form>
  )
}
