import { type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResetPassword } from '@/hooks/useAuth'
import { useFormValidation } from '@/hooks/useFormValidation'
import { useResetPasswordSchema } from '@/hooks/useAuthSchemas'
import { PasswordRulesHint } from '@/components/forms/shared/PasswordRulesHint'

type Props = {
  /** The one-time token from the emailed link's `?token=`. */
  token: string
}

/**
 * Step two of a password reset: set the new password.
 *
 * On success this sends the user to the login screen rather than opening a
 * session for them. Resetting proves control of the mailbox, not of the
 * password — and a reset is exactly the moment someone else may have been in
 * the account, so making them type the new credential once is worth the extra
 * screen. It also means there is only one place in the app that starts a
 * session.
 */
export function AuthResetPasswordForm({ token }: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { mutate: submit, isPending, error, reset } = useResetPassword()
  const { values, setField, fieldErrors, validate } = useFormValidation(
    useResetPasswordSchema(),
    { password: '', confirmPassword: '' }
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const data = validate()
    if (!data) return
    submit(
      { token, password: data.password },
      { onSuccess: () => void navigate({ to: '/auth/login', search: { reset: true } }) }
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 shrink-0 animate-in fade-in duration-500"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t('auth.reset.passwordLabel')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          variant="default"
          placeholder={t('auth.reset.passwordPlaceholder')}
          value={values.password}
          onChange={(e) => {
            setField('password', e.target.value)
            if (error) reset()
          }}
          aria-invalid={!!fieldErrors.password}
          disabled={isPending}
        />
        <PasswordRulesHint value={values.password} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">{t('auth.reset.confirmLabel')}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          variant="default"
          placeholder={t('auth.reset.confirmPlaceholder')}
          value={values.confirmPassword}
          onChange={(e) => {
            setField('confirmPassword', e.target.value)
            if (error) reset()
          }}
          aria-invalid={!!fieldErrors.confirmPassword}
          disabled={isPending}
        />
        {fieldErrors.confirmPassword && (
          <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
        )}
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
          <span>{t('auth.reset.submit')}</span>
          <ArrowUpRightIcon />
        </Button>
        {/* A dead link is the one failure the user can act on, so it gets a
            way out rather than only an error string. */}
        <div className="my-4 flex min-h-4 flex-col gap-2">
          {error && (
            <>
              <span className="text-sm text-destructive">{error.message}</span>
              <Link
                to="/auth/forgot"
                className="text-primary-foreground text-[13px] font-medium"
              >
                {t('auth.reset.requestNewLink')}
              </Link>
            </>
          )}
        </div>
      </div>
    </form>
  )
}
