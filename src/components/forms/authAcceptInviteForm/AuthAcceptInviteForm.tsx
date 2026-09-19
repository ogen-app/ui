import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAcceptInvitation } from '@/hooks/useAuth'
import { useFormValidation } from '@/hooks/useFormValidation'
import { useAcceptInviteSchema } from '@/hooks/useAuthSchemas'
import { ApiError } from '@/services/api/errors'
import { useAuthStore } from '@/stores/authStore'
import { FormError } from '@/components/forms/shared/FormError'
import { PasswordRules } from '@/components/forms/shared/PasswordRules'
import { focusFirstInvalid } from '@/components/forms/shared/focusFirstInvalid'

type Props = {
  /** The one-time token from the emailed link's `?token=`. */
  token: string
  /** The address the invitation was sent to — shown, never edited. */
  email: string
  /** From the preview: whether the address already holds an Ogen account. */
  hasAccount: boolean
}

/**
 * The last step of an invitation, which is one of two different steps: create
 * the account and sign in, or add the workspace to an account that already
 * exists. The preview's `has_account` says which, so the branch is taken
 * before anything is typed — nobody writes a password into a form the server
 * was always going to refuse.
 *
 * When someone is already signed in there is nothing to decide: either they
 * are the invitee, and one button finishes it, or they are not, and no form on
 * this page can help until they leave the account they're in.
 *
 * The signed-out taken-address case sends them to log in and come back — the
 * redirect carries this page, and the invitation is untouched until accept.
 */
export function AuthAcceptInviteForm({ token, email, hasAccount }: Props) {
  const { t } = useTranslation()
  const signedInAs = useAuthStore((s) => s.user?.email)

  if (signedInAs && signedInAs.toLowerCase() === email.toLowerCase()) {
    return <AcceptAsSelf token={token} email={email} />
  }
  if (signedInAs) {
    return (
      <Panel
        body={t('auth.invite.wrongAccountBody', {
          invited: email,
          current: signedInAs,
        })}
        action={
          <Link
            to="/auth/logout"
            className="text-primary-foreground text-[13px] font-medium"
          >
            {t('auth.invite.logOutLink')}
          </Link>
        }
      />
    )
  }
  if (hasAccount) {
    return <ExistingAccount email={email} />
  }
  return <CreateAccount token={token} email={email} />
}

/** Signed out, address taken: the invitation waits while they sign in as it. */
function ExistingAccount({ email }: { email: string }) {
  const { t } = useTranslation()
  return (
    <Panel
      body={t('auth.invite.existingAccountBody', { email })}
      action={
        <Link
          to="/auth/login"
          search={{
            redirect: window.location.pathname + window.location.search,
          }}
          className="text-primary-foreground text-[13px] font-medium"
        >
          {t('auth.invite.logInLink')}
        </Link>
      }
    />
  )
}

/** Signed in as the invited address: one button, no body on the request. */
function AcceptAsSelf({ token, email }: { token: string; email: string }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { mutate: accept, isPending, error } = useAcceptInvitation(token)

  return (
    <div className="flex flex-col gap-4 shrink-0 animate-in fade-in duration-500">
      <p className="text-[13px] leading-5 text-secondary-foreground">
        {t('auth.invite.joinBody', { email })}
      </p>
      <Button
        type="button"
        variant="defaultInverted"
        size="default"
        className="w-full justify-between"
        loading={isPending}
        disabled={isPending}
        // No payload: the account exists, so the server only adds the
        // membership. See `acceptInvitation`.
        onClick={() =>
          accept(undefined, { onSuccess: () => void navigate({ to: '/' }) })
        }
      >
        <span>{t('auth.invite.joinSubmit')}</span>
        <ArrowUpRightIcon />
      </Button>
      <FormError message={error?.message} />
    </div>
  )
}

/** Nobody signed in, address free at preview time: name + password. */
function CreateAccount({ token, email }: { token: string; email: string }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { mutate: submit, isPending, error, reset } = useAcceptInvitation(token)
  const { values, setField, fieldErrors, validate } = useFormValidation(
    useAcceptInviteSchema(),
    { firstName: '', lastName: '', password: '' },
  )
  // The preview said the address was free, but an account can appear between
  // preview and accept — the server answers that race with a 403. Latched
  // rather than derived from `error`: typing in a field clears the error to
  // un-block the form, and this answer must outlive that.
  const [taken, setTaken] = useState(false)

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
      {
        onSuccess: () => void navigate({ to: '/' }),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 403) setTaken(true)
        },
      },
    )
  }

  if (taken) {
    return <ExistingAccount email={email} />
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 shrink-0 animate-in fade-in duration-500"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-email">{t('auth.invite.emailLabel')}</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          value={email}
          disabled
          readOnly
        />
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
        {/* What's left here is the token dying while the page was open. The
            address-already-taken case has its own screen above. */}
        <FormError message={error?.message}>
          <Link
            to="/auth/login"
            className="text-primary-foreground text-[13px] font-medium"
          >
            {t('auth.invite.logInLink')}
          </Link>
        </FormError>
      </div>
    </form>
  )
}

/** A sentence and a way out — the shape both dead ends take. */
function Panel({ body, action }: { body: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 shrink-0 animate-in fade-in duration-500">
      <p className="text-[13px] leading-5 text-secondary-foreground">{body}</p>
      {action}
    </div>
  )
}
