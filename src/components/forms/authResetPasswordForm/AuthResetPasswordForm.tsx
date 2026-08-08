import { type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResetPassword } from '@/hooks/useAuth'
import { useFormValidation } from '@/hooks/useFormValidation'
import { resetPasswordSchema } from '@/lib'
import { FormError } from '@/components/forms/shared/FormError'
import { PasswordRules } from '@/components/forms/shared/PasswordRules'
import { focusFirstInvalid } from '@/components/forms/shared/focusFirstInvalid'

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
  const { mutate: submit, isPending, error, reset } = useResetPassword()
  const { values, setField, fieldErrors, validate } = useFormValidation(resetPasswordSchema, {
    password: '',
    confirmPassword: '',
  })

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = validate()
    if (!data) {
      focusFirstInvalid(e.currentTarget)
      return
    }
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
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          variant="default"
          placeholder="Enter a new password"
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          variant="default"
          placeholder="Enter it again"
          value={values.confirmPassword}
          onChange={(e) => {
            setField('confirmPassword', e.target.value)
            if (error) reset()
          }}
          aria-invalid={!!fieldErrors.confirmPassword}
          aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
          disabled={isPending}
        />
        {fieldErrors.confirmPassword && (
          <p id="confirmPassword-error" className="text-xs text-destructive">
            {fieldErrors.confirmPassword}
          </p>
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
          <span>SET NEW PASSWORD</span>
          <ArrowUpRightIcon />
        </Button>
        {/* A dead link is the one failure the user can act on, so it gets a
            way out rather than only an error string. */}
        <FormError message={error?.message}>
          <Link to="/auth/forgot" className="text-primary-foreground text-[13px] font-medium">
            Request a new link
          </Link>
        </FormError>
      </div>
    </form>
  )
}
