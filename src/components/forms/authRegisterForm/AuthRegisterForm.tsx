import { type FormEvent, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowUpRightIcon, LockSimpleIcon } from '@phosphor-icons/react'
import { useSignup } from '@/hooks/useAuth'
import { useFormValidation } from '@/hooks/useFormValidation'
import { useSignupSchema } from '@/hooks/useAuthSchemas'
import { FormError } from '@/components/forms/shared/FormError'
import { focusFirstInvalid } from '@/components/forms/shared/focusFirstInvalid'
import { PasswordRules } from '@/components/forms/shared/PasswordRules'
import { GoogleSignInOption } from '@/components/auth/GoogleSignIn'
import { afterSignupPath } from '@/lib/planIntent'
import { markInviteOnly } from '@/hooks/useSignupAccess'
import {
  clearTesterInvite,
  rememberTesterInvite,
  testerInvitePath,
} from '@/lib/testerInvite'
import {
  isInviteEmailMismatch,
  isInviteGone,
  isInviteRequired,
} from '@/services/api/signupAccess'

type Props = {
  /**
   * A tester invite being redeemed (CON-402). The email is the invited one and
   * cannot be changed — the server refuses any other — and both ways in carry
   * the token: the submit as `invite_token`, Google through `return_to` and
   * `lib/testerInvite`.
   */
  invite?: { token: string; email: string }
  /** The invite died between the preview and the submit — a lost race. */
  onInviteGone?: () => void
  /** The server refused the address for this invite. */
  onMismatch?: () => void
  /** A line above everything else: why the person is back on this form. */
  notice?: ReactNode
}

/**
 * Self-service signup: organization + first admin in one step (CON-97).
 *
 * `POST /api/tenants` opens a session on success, so this lands the user in
 * the app rather than sending them to log in with what they just typed.
 */
export function AuthRegisterForm({
  invite,
  onInviteGone,
  onMismatch,
  notice,
}: Props = {}) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { mutate: signup, isPending, error, reset } = useSignup()
  const { values, setField, fieldErrors, validate } = useFormValidation(
    useSignupSchema(),
    {
      organizationName: '',
      firstName: '',
      lastName: '',
      email: invite?.email ?? '',
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

    signup(
      // The invited address, whatever the field holds: it is read-only, and the
      // server would refuse any other.
      invite
        ? { ...data, email: invite.email, inviteToken: invite.token }
        : data,
      {
        // To `/plans` with the tier preselected when the visitor came from the
        // pricing page (`/signup?plan=…`), the app otherwise (CON-328). A
        // tester's workspace is never gated, so an invite goes straight in.
        onSuccess: () => {
          if (invite) {
            clearTesterInvite()
            navigate({ to: '/' })
            return
          }
          navigate({ href: afterSignupPath() })
        },
        onError: (err) => {
          if (isInviteGone(err)) onInviteGone?.()
          else if (isInviteEmailMismatch(err)) onMismatch?.()
          else if (isInviteRequired(err)) {
            // The switch went to invite-only after this form was served.
            markInviteOnly()
            navigate({ to: '/signup' })
          }
        },
      },
    )
  }

  /** Answered by a screen of its own rather than a line under the button. */
  const handled =
    isInviteGone(error) ||
    isInviteEmailMismatch(error) ||
    isInviteRequired(error)

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
      {/* The same button as login: the server decides whether this Google
          account signs in or signs up, so clicking it on the "wrong" screen
          still ends in the right place. */}
      {notice}
      <GoogleSignInOption
        divider={t('auth.google.orSignUpWithEmail')}
        // Google's round trip leaves this tab, so the plan — or the invite —
        // rides on the server's `return_to` as well as in session storage.
        returnTo={invite ? testerInvitePath(invite.token) : afterSignupPath()}
        onClick={invite ? () => rememberTesterInvite(invite.token) : undefined}
      />
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
        {invite ? (
          // Read-only, not disabled: it is still the address being submitted,
          // still focusable and still read out. The fill stays; the value goes
          // grey and the lock says why it won't take a keystroke.
          <>
            <div className="relative">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                variant="default"
                value={invite.email}
                readOnly
                aria-describedby="email-locked"
                className="pr-10 text-secondary-foreground"
              />
              <LockSimpleIcon
                aria-hidden
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-tertiary-foreground"
              />
            </div>
            <p id="email-locked" className="text-xs text-tertiary-foreground">
              {t('auth.testerInvite.emailLocked')}
            </p>
          </>
        ) : (
          <>
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
          </>
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
        <FormError message={handled ? undefined : error?.message} />
      </div>
    </form>
  )
}
