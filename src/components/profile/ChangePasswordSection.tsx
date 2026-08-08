import { type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { FormError } from '@/components/forms/shared/FormError'
import { PasswordRules } from '@/components/forms/shared/PasswordRules'
import { focusFirstInvalid } from '@/components/forms/shared/focusFirstInvalid'
import { useChangePassword } from '@/hooks/useAuth'
import { useFormValidation } from '@/hooks/useFormValidation'
import { changePasswordSchema } from '@/lib'
import { toast } from '@/stores/toastStore'

/**
 * Changing the password from inside the app.
 *
 * Deliberately **not** wired into the page's Save button, unlike the identity
 * fields above. Those are settings, edited in place and applied in a batch;
 * this replaces a credential, needs the current one to do it, and must be able
 * to fail on its own without dragging a name change down with it. It gets its
 * own submit.
 *
 * The current-password field is enforced by `useChangePassword` re-authenticating
 * before it writes — the server does not check it (CON-193).
 */
export function ChangePasswordSection() {
  const { mutate: change, isPending, error, reset } = useChangePassword()
  const { values, setField, fieldErrors, validate, reset: resetFields } =
    useFormValidation(changePasswordSchema, {
      currentPassword: '',
      password: '',
      confirmPassword: '',
    })

  // A wrong current password comes back from POST /api/sessions as "invalid
  // credentials", which is true but reads as if the whole change failed for
  // some unknown reason. It has exactly one cause here, and one field.
  const wrongCurrent = /invalid credentials/i.test(error?.message ?? '')

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = validate()
    if (!data) {
      focusFirstInvalid(e.currentTarget)
      return
    }
    change(
      { currentPassword: data.currentPassword, password: data.password },
      {
        onSuccess: () => {
          resetFields()
          toast.success('Password changed')
        },
      },
    )
  }

  return (
    <SettingsCard title="Password">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-2">
          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              className="lg:max-w-[calc(50%-1rem)]"
              value={values.currentPassword}
              onChange={(e) => {
                setField('currentPassword', e.target.value)
                if (error) reset()
              }}
              aria-invalid={!!fieldErrors.currentPassword || wrongCurrent}
              aria-describedby={
                fieldErrors.currentPassword || wrongCurrent
                  ? 'currentPassword-error'
                  : undefined
              }
              disabled={isPending}
            />
            {/* `alert` because unlike the schema errors this one arrives from
                the server, a moment after the click, with focus still on the
                button — nothing would otherwise announce it. */}
            {(fieldErrors.currentPassword || wrongCurrent) && (
              <p id="currentPassword-error" role="alert" className="text-xs text-destructive">
                {fieldErrors.currentPassword ?? "That's not your current password"}
              </p>
            )}
            <p className="text-xs text-tertiary-foreground">
              Forgotten it?{' '}
              <Link to="/auth/forgot" className="font-medium text-primary-foreground">
                Reset it by email
              </Link>{' '}
              instead.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => {
                setField('password', e.target.value)
                if (error) reset()
              }}
              aria-invalid={!!fieldErrors.password}
              // Whichever of the two lines below is showing, it is this field's
              // description — the rules when they are the instruction, the
              // error when the schema has something the rules can't say.
              aria-describedby="newPassword-rules"
              disabled={isPending}
            />
            {/* The one message the rules line cannot carry: reusing the current
                password passes every rule and is still refused. */}
            {fieldErrors.password ? (
              <p id="newPassword-rules" className="text-xs text-destructive">
                {fieldErrors.password}
              </p>
            ) : (
              <PasswordRules id="newPassword-rules" value={values.password} />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmNewPassword">Confirm new password</Label>
            <Input
              id="confirmNewPassword"
              name="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={(e) => {
                setField('confirmPassword', e.target.value)
                if (error) reset()
              }}
              aria-invalid={!!fieldErrors.confirmPassword}
              aria-describedby="confirmNewPassword-note"
              disabled={isPending}
            />
            {/* Also keeps this column the same height as the rules line beside
                it, so the two halves of the grid don't sit at different depths. */}
            {fieldErrors.confirmPassword ? (
              <p id="confirmNewPassword-note" className="text-xs text-destructive">
                {fieldErrors.confirmPassword}
              </p>
            ) : (
              <p id="confirmNewPassword-note" className="text-xs text-tertiary-foreground">
                Type it again — a typo here locks you out of your own account.
              </p>
            )}
          </div>
        </div>

        {/* Stated up front rather than after the fact: someone changing their
            password because they think another device is in the account needs
            to know this doesn't evict it. Server-side revocation is CON-193. */}
        <p className="max-w-150 text-xs text-tertiary-foreground">
          Changing your password here does not sign out your other devices. To end
          every other session, use the emailed reset instead — that one does.
        </p>

        {/* A wrong current password is deliberately excluded: it is already
            shown against the field it belongs to, and repeating it down here
            would read as a second, unrelated failure. `my-0` because the form
            spaces its own rows. */}
        <FormError message={wrongCurrent ? undefined : error?.message} className="my-0" />

        <div>
          <Button type="submit" variant="defaultInverted" loading={isPending}>
            CHANGE PASSWORD
          </Button>
        </div>
      </form>
    </SettingsCard>
  )
}
