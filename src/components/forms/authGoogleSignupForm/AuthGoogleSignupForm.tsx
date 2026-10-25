import { useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ArrowUpRightIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoogleMark } from '@/components/auth/GoogleMark'
import { FormError } from '@/components/forms/shared/FormError'
import { focusFirstInvalid } from '@/components/forms/shared/focusFirstInvalid'
import { useCompleteGoogleSignup } from '@/hooks/useGoogleSignIn'
import { useFormValidation } from '@/hooks/useFormValidation'
import { useGoogleSignupSchema } from '@/hooks/useAuthSchemas'
import { safeRedirect } from '@/lib'
import { markInviteOnly } from '@/hooks/useSignupAccess'
import {
  clearTesterInvite,
  readTesterInvite,
  testerInvitePath,
} from '@/lib/testerInvite'
import {
  INVITE_EMAIL_MISMATCH,
  isInviteEmailMismatch,
  isInviteGone,
  isInviteRequired,
} from '@/services/api/signupAccess'
import { ApiError } from '@/services/api/errors'
import {
  googleStartUrl,
  type PendingGoogleSignup,
} from '@/services/api/googleAuth'

type Props = {
  /** The callback's `?token=` — spent by the submit. */
  token: string
  pending: PendingGoogleSignup
}

/**
 * The organization name, and nothing else: name and address come from Google,
 * and the account has no password until its owner sets one from Profile.
 *
 * Who is signing up sits above the field, in the same quiet bordered box the
 * secure-account page uses for its sign-in details — so a person who picked
 * the wrong Google account sees it before they create a workspace in it, and
 * "Not you?" starts over at Google's account chooser.
 */
export function AuthGoogleSignupForm({ token, pending }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  // The tester invite this sign-up left for Google with (CON-402), read once:
  // this step cannot see the `return_to` that also carries it.
  const [inviteToken] = useState(readTesterInvite)
  const {
    mutate: complete,
    isPending,
    error,
    reset,
  } = useCompleteGoogleSignup(token, inviteToken ?? undefined)
  const { values, setField, fieldErrors, validate } = useFormValidation(
    useGoogleSignupSchema(),
    { organizationName: '' },
  )

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = validate()
    if (!data) {
      focusFirstInvalid(e.currentTarget)
      return
    }
    complete(data.organizationName, {
      // The server keeps `return_to` only as a same-site path, and this passes
      // it through the client's own check as well before navigating. Not for
      // an invite: its `return_to` is the invite screen, which would greet the
      // person who just redeemed it as somebody signed in to the wrong account.
      onSuccess: ({ returnTo }) => {
        if (inviteToken) {
          clearTesterInvite()
          void router.navigate({ to: '/' })
          return
        }
        void router.navigate({ href: safeRedirect(returnTo) })
      },
      onError: (err) => {
        // Each of these has a screen of its own on `/signup`. A mismatch has
        // spent this pending sign-up but not the invite, so the invite screen
        // takes over with the reason and both ways in still open. The stored
        // copy goes either way: the URL carries the token, the invite screen's
        // Google button stores it again, and a stale one would ride along on
        // an unrelated Google sign-up later in this tab.
        if (inviteToken && isInviteEmailMismatch(err)) {
          clearTesterInvite()
          void router.navigate({
            href: testerInvitePath(inviteToken, INVITE_EMAIL_MISMATCH),
          })
        } else if (inviteToken && isInviteGone(err)) {
          clearTesterInvite()
          void router.navigate({ href: testerInvitePath(inviteToken) })
        } else if (isInviteRequired(err)) {
          markInviteOnly()
          void router.navigate({ to: '/signup' })
        }
      },
    })
  }

  const name = displayName(pending)
  const refusal = refusalMessage(error, t)

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 shrink-0 animate-in fade-in duration-500"
      noValidate
    >
      <div className="flex items-center gap-3 border border-border p-4">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tertiary text-sm font-medium text-secondary-foreground"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-secondary-foreground">
            {pending.email}
          </p>
        </div>
        <GoogleMark className="size-4" />
        <a
          href={googleStartUrl()}
          className="shrink-0 text-[13px] leading-5 font-medium text-secondary-foreground transition-colors hover:text-primary-foreground"
        >
          {t('auth.googleSignup.notYou')}
        </a>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="organizationName">
          {t('auth.googleSignup.organizationLabel')}
        </Label>
        <Input
          id="organizationName"
          name="organization"
          type="text"
          autoComplete="organization"
          autoFocus
          variant="default"
          placeholder={t('auth.register.organizationPlaceholder')}
          value={values.organizationName}
          onChange={(e) => {
            setField('organizationName', e.target.value)
            if (error) reset()
          }}
          aria-invalid={!!fieldErrors.organizationName}
          aria-describedby={
            fieldErrors.organizationName
              ? 'organizationName-error'
              : 'organizationName-hint'
          }
          disabled={isPending}
        />
        {fieldErrors.organizationName ? (
          <p id="organizationName-error" className="text-xs text-destructive">
            {fieldErrors.organizationName}
          </p>
        ) : (
          <p
            id="organizationName-hint"
            className="text-xs text-tertiary-foreground"
          >
            {t('auth.googleSignup.organizationHint')}
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
          <span>{t('auth.googleSignup.submit')}</span>
          <ArrowUpRightIcon />
        </Button>
        <FormError message={refusal?.message}>
          {refusal?.startOver && (
            <a
              href={googleStartUrl()}
              className="text-primary-foreground text-[13px] font-medium"
            >
              {t('auth.googleSignup.startOver')}
            </a>
          )}
        </FormError>
      </div>
    </form>
  )
}

/** Google's display name, or the address's local part when it shares none. */
function displayName({ name, email }: PendingGoogleSignup): string {
  return name.trim() || email.split('@')[0]
}

/**
 * What a refused submit says, worded by status and code rather than by the
 * server's prose. A taken address and a spent token end the same way — this
 * token is no use any more, and a fresh Google sign-in finds the account or
 * mints a new token — so both offer to start over at Google.
 */
function refusalMessage(
  error: Error | null,
  t: TFunction,
): { message: string; startOver: boolean } | undefined {
  if (!error) return undefined
  if (error instanceof ApiError) {
    if (
      error.code === 'email_in_use' ||
      error.code === 'google_already_linked'
    ) {
      return { message: t('auth.googleSignup.accountExists'), startOver: true }
    }
    if (error.status === 404) {
      return { message: t('auth.googleSignup.expiredInline'), startOver: true }
    }
  }
  // A throttle or an outage: the token may still be good, so try again here.
  return { message: error.message, startOver: false }
}
