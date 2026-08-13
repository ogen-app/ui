import { type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAcceptInvitation } from '@/hooks/useAuth'
import { useFormValidation } from '@/hooks/useFormValidation'
import { useAcceptInviteSchema } from '@/hooks/useAuthSchemas'
import { FormError } from '@/components/forms/shared/FormError'
import { PasswordRules } from '@/components/forms/shared/PasswordRules'
import { focusFirstInvalid } from '@/components/forms/shared/focusFirstInvalid'

type Props = {
  /** The one-time token from the emailed link's `?token=`. */
  token: string
  /** The address the invitation was sent to — shown, never edited. */
  email: string
}

/**
 * The last step of an invitation: name yourself and pick a password.
 *
 * There is no email field. The invitation is addressed to one address and the
 * account is created with it whatever anyone types, so an editable box would
 * be a lie about what is happening. It is shown, disabled, because the person
 * following the link deserves to see which mailbox they are claiming.
 *
 * Accepting signs you straight in — the server opens the session in the same
 * transaction that creates the account — so this navigates into the app rather
 * than to the login screen.
 */
export function AuthAcceptInviteForm({ token, email }: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { mutate: submit, isPending, error, reset } = useAcceptInvitation(token)
  const { values, setField, fieldErrors, validate } = useFormValidation(
    useAcceptInviteSchema(),
    { firstName: '', lastName: '', password: '' },
  )

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = validate()
    if (!data) {
      focusFirstInvalid(e.currentTarget)
      return
    }
    submit(
      {
        // The server keeps one `name`; the form asks for two the way signup
        // does, and they are joined here rather than in the service, which is
        // where every other caller joins them too.
        name: `${data.firstName} ${data.lastName}`.trim(),
        password: data.password,
      },
      { onSuccess: () => void navigate({ to: '/' }) },
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 shrink-0 animate-in fade-in duration-500"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-email">{t('auth.invite.emailLabel')}</Label>
        <Input id="invite-email" name="email" type="email" value={email} disabled readOnly />
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="firstName">{t('auth.invite.firstNameLabel')}</Label>
          <Input
            id="firstName"
            name="firstName"
            variant="default"
            value={values.firstName}
            onChange={(e) => {
              setField('firstName', e.target.value)
              if (error) reset()
            }}
            aria-invalid={!!fieldErrors.firstName}
            disabled={isPending}
          />
          {fieldErrors.firstName && (
            <p className="text-xs text-destructive">{fieldErrors.firstName}</p>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="lastName">{t('auth.invite.lastNameLabel')}</Label>
          <Input
            id="lastName"
            name="lastName"
            variant="default"
            value={values.lastName}
            onChange={(e) => {
              setField('lastName', e.target.value)
              if (error) reset()
            }}
            aria-invalid={!!fieldErrors.lastName}
            disabled={isPending}
          />
          {fieldErrors.lastName && (
            <p className="text-xs text-destructive">{fieldErrors.lastName}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t('auth.invite.passwordLabel')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          variant="default"
          placeholder={t('auth.invite.passwordPlaceholder')}
          value={values.password}
          onChange={(e) => {
            setField('password', e.target.value)
            if (error) reset()
          }}
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
          <span>{t('auth.invite.submit')}</span>
          <ArrowUpRightIcon />
        </Button>
        {/* Two failures can happen at submit time and both have a way out that
            isn't this form: the token died while the page was open, and the
            address gained an account in the meantime. Logging in covers both. */}
        <FormError message={error?.message}>
          <Link to="/auth/login" className="text-primary-foreground text-[13px] font-medium">
            {t('auth.invite.logInLink')}
          </Link>
        </FormError>
      </div>
    </form>
  )
}
