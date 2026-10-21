import { useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { PasswordIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsRow } from '@/components/workspace-settings/SettingsRow'
import { GoogleMark } from '@/components/auth/GoogleMark'
import { useRequestPasswordReset } from '@/hooks/useAuth'
import {
  useAuthMethods,
  useDisconnectIdentity,
  useGoogleSignInEnabled,
} from '@/hooks/useGoogleSignIn'
import { useLocale } from '@/hooks/useLocale'
import { formatDate } from '@/lib/intl'
import { ApiError } from '@/services/api/errors'
import { googleStartUrl } from '@/services/api/googleAuth'
import { useAuthStore } from '@/stores/authStore'

/**
 * Every way into the account, one row each (CON-396).
 *
 * A password is changed by email, and only by email. There used to be a form
 * here — current password, new, confirm — and it is gone deliberately:
 * `PUT /api/users/:id` takes a new password from any live session without
 * asking for the old one, and revokes nothing afterwards (CON-193). The emailed
 * reset proves control of the mailbox before it changes anything, and
 * `POST /api/password-reset/confirm` revokes every session on the way out —
 * which is also what someone changing their password because they suspect
 * another device actually wants. The address is read from the session, never
 * typed, so this cannot be aimed at another account. An account that signed
 * up with Google has no password, and *setting* one is the same email under
 * different words — there is no current password to ask for.
 *
 * The Google row connects through the same server-side flow as signing in
 * (`intent=link`), and comes back to this page with `?linked=google` or
 * `?error=…`, which the route turns into a toast. Disconnecting is refused when
 * Google is the only way in; the reason is printed under the row rather than
 * hidden in a tooltip, so it reads without a pointer.
 */
export function SignInMethodsSection() {
  const { t } = useTranslation()
  const locale = useLocale()
  const user = useAuthStore((s) => s.user)
  const methods = useAuthMethods()
  const googleOffered = useGoogleSignInEnabled()
  const disconnect = useDisconnectIdentity()
  const reset = useRequestPasswordReset()
  const [sent, setSent] = useState(false)
  const [resent, setResent] = useState(false)

  if (!user) return null

  const google = methods.data?.identities.find((i) => i.provider === 'google')
  const hasPassword = methods.data?.has_password ?? true
  // Google-only: nothing else gets this account in, so it can't be removed.
  const googleIsTheOnlyWay = Boolean(google) && !hasPassword

  const sendReset = () => {
    setResent(false)
    if (reset.error) reset.reset()
    reset.mutate(user.email, {
      onSuccess: () => (sent ? setResent(true) : setSent(true)),
    })
  }

  const passwordAction = sent
    ? t('profile.password.resend')
    : hasPassword
      ? t('profile.password.send')
      : t('profile.signInMethods.setPassword')

  const disconnectRefused =
    disconnect.error instanceof ApiError &&
    disconnect.error.code === 'last_sign_in_method'

  return (
    <SettingsCard title={t('profile.signInMethods.title')}>
      {methods.isPending ? (
        <p className="text-sm text-tertiary-foreground">
          {t('common.loading')}
        </p>
      ) : (
        <ul className="flex flex-col border-t border-border pt-6 divide-y divide-border">
          {/* The password row stands even when the methods can't be read: the
              reset email is what this card replaced, and it needs nothing from
              that read. Only the state line is left out then, since it would
              be a guess. */}
          <MethodRow
            icon={<PasswordIcon aria-hidden className="size-5" />}
            title={t('profile.signInMethods.password')}
            detail={
              methods.isError
                ? ''
                : hasPassword
                  ? t('profile.signInMethods.passwordSet')
                  : t('profile.signInMethods.passwordNotSet')
            }
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={sendReset}
                loading={reset.isPending}
                disabled={reset.isPending}
              >
                {passwordAction}
              </Button>
            }
            note={
              reset.error ? (
                <span className="text-destructive">{reset.error.message}</span>
              ) : sent ? (
                <Trans
                  i18nKey="profile.password.sentBody"
                  values={{ email: user.email }}
                  components={{
                    email: <span className="font-medium text-foreground" />,
                  }}
                />
              ) : undefined
            }
            noteExtra={resent ? t('profile.password.resentNote') : undefined}
          />
          {methods.isError ? (
            <SettingsRow>
              <p role="status" className="text-sm text-destructive">
                {t('profile.signInMethods.loadFailed')}
              </p>
            </SettingsRow>
          ) : (
            (google || googleOffered) && (
              <MethodRow
                icon={<GoogleMark className="size-5" />}
                title={t('profile.signInMethods.google')}
                detail={
                  google
                    ? t('profile.signInMethods.googleConnected', {
                        email: google.email,
                        date:
                          formatDate(
                            google.linked_at,
                            { dateStyle: 'medium' },
                            locale,
                          ) ?? '',
                      })
                    : t('profile.signInMethods.googleNotConnected')
                }
                action={
                  google ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      // `outline` has no disabled look of its own; without this
                      // the refused button reads as one that does nothing.
                      className="disabled:border-quaternary disabled:text-quaternary-foreground"
                      disabled={googleIsTheOnlyWay || disconnect.isPending}
                      loading={disconnect.isPending}
                      onClick={() => disconnect.mutate('google')}
                    >
                      {t('profile.signInMethods.disconnect')}
                    </Button>
                  ) : (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={googleStartUrl({
                          intent: 'link',
                          returnTo: '/profile',
                        })}
                      >
                        {t('profile.signInMethods.connect')}
                      </a>
                    </Button>
                  )
                }
                note={
                  googleIsTheOnlyWay || disconnectRefused ? (
                    t('profile.signInMethods.onlyWayIn')
                  ) : disconnect.error ? (
                    <span className="text-destructive">
                      {disconnect.error.message}
                    </span>
                  ) : undefined
                }
              />
            )
          )}
        </ul>
      )}
    </SettingsCard>
  )
}

/** One way in: a 40px tile, what it is, its state, and its one action. */
function MethodRow({
  icon,
  title,
  detail,
  action,
  note,
  noteExtra,
}: {
  icon: ReactNode
  title: string
  detail: string
  action: ReactNode
  /** A sentence under the row — a consequence, a refusal, or what was sent. */
  note?: ReactNode
  noteExtra?: string
}) {
  return (
    <SettingsRow>
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex size-10 shrink-0 items-center justify-center bg-secondary">
          {icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-base font-medium">{title}</p>
          <p className="truncate text-xs text-tertiary-foreground">{detail}</p>
        </div>
        {action}
      </div>
      {(note || noteExtra) && (
        // One live region per row, so a refusal replaces the line it
        // contradicts instead of sitting beside it.
        <p
          role="status"
          className="max-w-150 pl-13 text-sm text-secondary-foreground"
        >
          {note}
          {note && noteExtra ? ' ' : null}
          {noteExtra}
        </p>
      )}
    </SettingsRow>
  )
}
