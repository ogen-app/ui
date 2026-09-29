import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Trans, useTranslation } from 'react-i18next'
import { ArrowUpRightIcon } from '@phosphor-icons/react'

import { AppAuth } from '@/components/layout/AppAuth'
import { FormError } from '@/components/forms/shared/FormError'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
import { useNoReferrer } from '@/hooks/useNoReferrer'
import { clearAllApplicationData } from '@/lib/cache-utils'
import { formatDate } from '@/lib/intl'
import {
  LoginAlertError,
  getLoginAlert,
  secureAccount,
  type LoginAlert,
  type LoginAlertFailure,
} from '@/services/api/loginAlerts'
import { useAuthStore } from '@/stores/authStore'

/**
 * Where the "This wasn't me — secure my account" link in the new-device
 * sign-in email lands (CON-318).
 *
 * **Loading the page changes nothing.** Mail scanners open every link in an
 * email, so the `GET` on mount only describes the sign-in; the account is
 * secured by the button, and never by an effect. Don't add an auto-submit.
 *
 * Securing signs out every session on every device, this one included, so a
 * success clears everything this browser holds about the account and then
 * leaves with a full navigation to the reset link the server minted — the
 * same `/auth/reset` screen a forgotten password ends on.
 */
function SecureAccountPage() {
  const { t } = useTranslation()
  const { token } = useSearch({ from: '/auth/secure-account/' })
  useNoReferrer()
  const signedIn = useAuthStore((s) => s.user !== null)

  const alert = useQuery({
    queryKey: ['login-alert', token],
    queryFn: () => getLoginAlert(token as string),
    enabled: Boolean(token),
    // One shot: every refusal here is a fact about the token or a limit, and
    // a retry is the user's to ask for.
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  // `isPending` alone can't stop a double click — both clicks land before the
  // re-render that disables the button — so the first one latches this.
  const submitting = useRef(false)
  const [leaving, setLeaving] = useState(false)
  const [submitBlockedUntil, setSubmitBlockedUntil] = useState<number | null>(
    null,
  )

  const secure = useMutation({
    mutationFn: () => secureAccount(token as string),
    onSuccess: async ({ reset_url }) => {
      setLeaving(true)
      // The server has just revoked this browser's session with the rest.
      useAuthStore.getState().clearUser()
      try {
        await clearAllApplicationData()
      } catch {
        // Best-effort, as on logout: nothing here may strand the user short
        // of setting their new password.
      }
      window.location.assign(safeResetUrl(reset_url))
    },
    onError: (err) => {
      submitting.current = false
      if (err instanceof LoginAlertError && err.retryAfterSeconds) {
        setSubmitBlockedUntil(Date.now() + err.retryAfterSeconds * 1000)
      }
    },
  })

  const submit = () => {
    if (submitting.current) return
    submitting.current = true
    secure.mutate()
  }

  const loadFailure = alert.isError ? failureOf(alert.error) : null
  const submitFailure = secure.isError ? failureOf(secure.error) : null

  const loadBlockedUntil =
    alert.error instanceof LoginAlertError && alert.error.retryAfterSeconds
      ? alert.errorUpdatedAt + alert.error.retryAfterSeconds * 1000
      : null
  const secondsLeft = useSecondsUntil(
    loadFailure === 'rate_limited' ? loadBlockedUntil : submitBlockedUntil,
  )
  const rateLimitedMessage =
    secondsLeft > 0
      ? t('auth.secureAccount.rateLimited', {
          count: Math.ceil(secondsLeft / 60),
        })
      : undefined

  // Someone still signed in would be bounced home by Forgot password, and
  // Profile is where a signed-in user asks for the same reset link.
  const resetTo = signedIn ? '/profile' : '/auth/forgot'
  const resetLink = (
    <Link to={resetTo} className="text-primary-foreground font-medium" />
  )

  const dead = deadLink(token, loadFailure, submitFailure, alert.data)

  if (dead === 'used') {
    return (
      <AppAuth
        title={t('auth.secureAccount.usedTitle')}
        subtitle={t('auth.secureAccount.usedBody')}
        form={
          <Sentence>
            <Trans
              i18nKey="auth.secureAccount.usedReset"
              components={{ reset: resetLink }}
            />
          </Sentence>
        }
        bottomNav={undefined}
      />
    )
  }

  if (dead === 'expired') {
    return (
      <AppAuth
        title={t('auth.secureAccount.expiredTitle')}
        subtitle={t('auth.secureAccount.expiredBody')}
        form={
          <Button
            asChild
            variant="defaultInverted"
            className="w-full justify-between"
          >
            <Link to={resetTo}>
              <span>{t('auth.secureAccount.expiredSubmit')}</span>
              <ArrowUpRightIcon />
            </Link>
          </Button>
        }
        bottomNav={undefined}
      />
    )
  }

  if (dead === 'invalid') {
    return (
      <AppAuth
        title={t('auth.secureAccount.invalidTitle')}
        subtitle={t('auth.secureAccount.invalidBody')}
        form={
          <Sentence>
            <Trans
              i18nKey="auth.secureAccount.invalidReset"
              components={{ reset: resetLink }}
            />
          </Sentence>
        }
        bottomNav={undefined}
      />
    )
  }

  // The read failed for a reason that says nothing about the token — a
  // network drop, a 5xx, a rate limit. The link may be fine, so offer a retry
  // rather than a dead end.
  if (loadFailure) {
    return (
      <AppAuth
        title={t('auth.secureAccount.loadFailedTitle')}
        subtitle={t('auth.secureAccount.loadFailedSubtitle')}
        form={
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              disabled={secondsLeft > 0}
              loading={alert.isFetching}
              onClick={() => void alert.refetch()}
            >
              {t('common.tryAgain')}
            </Button>
            <FormError message={rateLimitedMessage} className="my-2" />
          </div>
        }
        bottomNav={undefined}
      />
    )
  }

  if (!alert.data) {
    return (
      <AppAuth
        title={t('auth.secureAccount.title')}
        form={<Sentence>{t('common.loading')}</Sentence>}
        bottomNav={undefined}
      />
    )
  }

  const busy = secure.isPending || leaving
  const submitMessage =
    submitFailure === 'rate_limited'
      ? rateLimitedMessage
      : submitFailure === 'unavailable'
        ? t('auth.secureAccount.failed')
        : undefined

  return (
    <AppAuth
      title={t('auth.secureAccount.title')}
      form={
        <div className="flex flex-col gap-6">
          <Sentence>
            <Trans
              i18nKey="auth.secureAccount.intro"
              values={{ email: alert.data.email }}
              components={{
                strong: (
                  <strong className="text-primary-foreground font-medium" />
                ),
              }}
            />
          </Sentence>
          <SignInDetails alert={alert.data} />
          <Sentence>{t('auth.secureAccount.explainer')}</Sentence>
          <div className="flex flex-col">
            <Button
              variant="destructiveInverted"
              className="w-full justify-between"
              loading={busy}
              disabled={busy || secondsLeft > 0}
              onClick={submit}
            >
              <span>{t('auth.secureAccount.submit')}</span>
              <ArrowUpRightIcon />
            </Button>
            <FormError message={submitMessage} />
            <Link
              to={signedIn ? '/' : '/auth/login'}
              className="self-center text-[13px] leading-5 text-secondary-foreground font-medium hover:text-primary-foreground"
            >
              {t('auth.secureAccount.wasMe')}
            </Link>
          </div>
        </div>
      }
      bottomNav={undefined}
    />
  )
}

type DeadLink = 'used' | 'expired' | 'invalid'

/**
 * Which terminal screen, if any, the token has reached. The `GET` status, a
 * refused read and a refused secure all converge here, so a link spent in
 * another tab reads the same whether this tab learned it on load or on click.
 */
function deadLink(
  token: string | undefined,
  loadFailure: LoginAlertFailure | null,
  submitFailure: LoginAlertFailure | null,
  alert: LoginAlert | undefined,
): DeadLink | null {
  if (!token) return 'invalid'
  for (const failure of [loadFailure, submitFailure]) {
    if (failure === 'used' || failure === 'expired' || failure === 'invalid') {
      return failure
    }
  }
  if (alert?.status === 'used' || alert?.status === 'expired') {
    return alert.status
  }
  return null
}

function failureOf(err: unknown): LoginAlertFailure {
  return err instanceof LoginAlertError ? err.reason : 'unavailable'
}

/**
 * The server's reset link, refusing anything that isn't http(s) — it goes
 * straight into `location.assign`, where a `javascript:` URL would run.
 */
function safeResetUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href
    }
  } catch {
    // Fall through to the page that asks for a link by email instead.
  }
  return '/auth/forgot'
}

/** Whole seconds left until `until`, ticking once a second while it runs. */
function useSecondsUntil(until: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (until === null) return
    const id = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= until) window.clearInterval(id)
    }, 1000)
    return () => window.clearInterval(id)
  }, [until])
  return until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000))
}

function SignInDetails({ alert }: { alert: LoginAlert }) {
  const { t } = useTranslation()
  const locale = useLocale()
  // The viewer's own time zone, named — "17:03" alone can't tell someone
  // travelling whether it was them.
  const when = formatDate(
    alert.login_at,
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    },
    locale,
  )

  return (
    <dl
      aria-label={t('auth.secureAccount.detailsLabel')}
      className="flex flex-col gap-3 border border-border p-4 text-[13px] leading-5"
    >
      <DetailRow label={t('auth.secureAccount.whenLabel')}>
        {when ?? alert.login_at}
      </DetailRow>
      <DetailRow label={t('auth.secureAccount.deviceLabel')}>
        {alert.device}
      </DetailRow>
      <DetailRow label={t('auth.secureAccount.ipLabel')}>
        {/* An IPv6 address has no break opportunities of its own. */}
        <span className="break-all">{alert.ip}</span>
      </DetailRow>
      {alert.location && (
        <DetailRow label={t('auth.secureAccount.locationLabel')}>
          {alert.location}
        </DetailRow>
      )}
    </dl>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-secondary-foreground shrink-0">{label}</dt>
      <dd className="font-medium sm:text-right">{children}</dd>
    </div>
  )
}

function Sentence({ children }: { children: ReactNode }) {
  return (
    <p className="text-[13px] leading-5 text-secondary-foreground">
      {children}
    </p>
  )
}

export default SecureAccountPage
