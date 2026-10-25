import { useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'
import {
  ArrowUpRightIcon,
  EnvelopeSimpleIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'

import { AppAuth } from '@/components/layout/AppAuth'
import { AuthRegisterForm } from '@/components/forms/authRegisterForm'
import { Button } from '@/components/ui/button'
import { useTesterInvite } from '@/hooks/useSignupAccess'
import { clearAllApplicationData } from '@/lib/cache-utils'
import { clearTesterInvite, testerInvitePath } from '@/lib/testerInvite'
import { INVITE_EMAIL_MISMATCH } from '@/services/api/signupAccess'
import { useAuthStore } from '@/stores/authStore'

/** Where somebody without an invite can ask for one — placeholder until product picks the route. */
const BETA_CONTACT = 'beta@getogen.com'

/**
 * `/signup` as a screen (CON-402) — the route has already decided it is one:
 * there is an invite, or self-registration is off.
 *
 * The invite states are the register screen in invite mode, not a new layout.
 * Every unusable token gets the one 410, so the expired state lists the
 * reasons rather than picking one, and shows no form in either signup mode —
 * falling back to the open form would sign a tester up as a paying stranger.
 */
function SignupPage() {
  const { invite } = useSearch({ from: '/signup/' })
  return invite ? <InviteScreen token={invite} /> : <PrivateBeta />
}

function InviteScreen({ token }: { token: string }) {
  const { t } = useTranslation()
  const { error: arrivedWith } = useSearch({ from: '/signup/' })
  // Read once, as the page opens. Signing up through this very screen sets a
  // user too, and reading it live would swap the form for "you're signed in"
  // under the submit that is about to navigate away.
  const [signedInOnArrival] = useState(
    () => useAuthStore.getState().user !== null,
  )
  const preview = useTesterInvite(token)
  /** The submit lost a race — revoked, replaced or redeemed meanwhile. */
  const [spent, setSpent] = useState(false)
  const [mismatch, setMismatch] = useState(
    arrivedWith === INVITE_EMAIL_MISMATCH,
  )

  if (preview.isPending) {
    return (
      <AppAuth
        title={t('auth.testerInvite.title')}
        form={
          <p className="text-[13px] leading-5 text-secondary-foreground">
            {t('common.loading')}
          </p>
        }
        bottomNav={<LogInNav />}
      />
    )
  }

  // Anything but a 410 says nothing about the invite, so it gets a retry
  // rather than the expired card, which would send the tester off to ask for
  // a link they do not need.
  if (preview.isError) {
    return (
      <AppAuth
        title={t('auth.testerInvite.previewFailedTitle')}
        subtitle={t('auth.testerInvite.previewFailedSubtitle')}
        form={
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void preview.refetch()}
          >
            {t('common.tryAgain')}
          </Button>
        }
        bottomNav={<LogInNav />}
      />
    )
  }

  if (preview.data === null || spent) return <InviteExpired />

  const invited = preview.data.email

  // Somebody is signed in on this browser. The server will not redeem an
  // invite into an existing account, so nothing is attempted.
  if (signedInOnArrival) return <SignedIn token={token} invited={invited} />

  return (
    <AppAuth
      title={t('auth.testerInvite.title')}
      subtitle={t('auth.testerInvite.subtitle')}
      form={
        <AuthRegisterForm
          invite={{ token, email: invited }}
          onInviteGone={() => {
            clearTesterInvite()
            setSpent(true)
          }}
          onMismatch={() => setMismatch(true)}
          notice={mismatch ? <MismatchNotice email={invited} /> : undefined}
        />
      }
      bottomNav={<LogInNav />}
    />
  )
}

/** Board 1B: the reason sits under the heading, and both ways in stay open. */
function MismatchNotice({ email }: { email: string }) {
  return (
    <p
      role="alert"
      className="flex gap-2 text-[13px] leading-5 text-destructive"
    >
      <WarningCircleIcon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <span>
        <Trans
          i18nKey="auth.testerInvite.mismatch"
          values={{ email }}
          components={{ strong: <strong className="font-medium" /> }}
        />
      </span>
    </p>
  )
}

function InviteExpired() {
  const { t } = useTranslation()
  return (
    <AppAuth
      title={t('auth.testerInvite.expiredTitle')}
      subtitle={t('auth.testerInvite.expiredBody')}
      form={
        <Button
          asChild
          variant="outline"
          size="default"
          className="w-full justify-between"
        >
          <Link to="/auth/login">
            <span>{t('auth.testerInvite.logInInstead')}</span>
            <ArrowUpRightIcon />
          </Link>
        </Button>
      }
      bottomNav={<LogInNav />}
    />
  )
}

/**
 * Board 2B. Signing out keeps the invite URL and comes back to it; staying
 * goes to the app. Nothing is redeemed silently.
 */
function SignedIn({ token, invited }: { token: string; invited: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [leaving, setLeaving] = useState(false)

  const signOutAndContinue = async () => {
    setLeaving(true)
    // The logout page's rule: a failed server call changes nothing about what
    // has to happen locally, so each half is attempted regardless.
    try {
      await logout()
    } catch {
      // Already signed out server-side.
    }
    try {
      await clearAllApplicationData()
    } catch {
      // Best-effort.
    }
    // A full load, so the root guard reads the session afresh.
    window.location.assign(testerInvitePath(token))
  }

  return (
    <AppAuth
      title={t('auth.testerInvite.signedInTitle', {
        name:
          [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
          user?.email,
      })}
      subtitle={user?.email}
      form={
        <div className="flex flex-col gap-6">
          <p className="text-[13px] leading-5 text-secondary-foreground">
            {t('auth.testerInvite.signedInBody', { email: invited })}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="defaultInverted"
              size="default"
              className="w-full justify-between"
              loading={leaving}
              disabled={leaving}
              onClick={() => void signOutAndContinue()}
            >
              <span>{t('auth.testerInvite.signOutAndContinue')}</span>
              <ArrowUpRightIcon />
            </Button>
            <Button
              variant="ghost"
              size="default"
              className="w-full justify-start"
              disabled={leaving}
              onClick={() => void navigate({ to: '/' })}
            >
              {t('auth.testerInvite.staySignedIn')}
            </Button>
          </div>
        </div>
      }
      bottomNav={undefined}
    />
  )
}

/**
 * Board 2A: self-registration is off and there is no invite. Neither the form
 * nor the Google button — both would be refused — so the card says why and
 * what to do instead.
 */
function PrivateBeta() {
  const { t } = useTranslation()
  return (
    <AppAuth
      title={t('auth.privateBeta.title')}
      subtitle={t('auth.privateBeta.body')}
      form={
        <p className="flex gap-3 text-[13px] leading-5 text-secondary-foreground">
          <EnvelopeSimpleIcon
            size={16}
            className="mt-0.5 shrink-0"
            aria-hidden
          />
          <span>
            <Trans
              i18nKey="auth.privateBeta.contact"
              values={{ email: BETA_CONTACT }}
              components={{
                mail: (
                  <a
                    href={`mailto:${BETA_CONTACT}`}
                    className="text-primary-foreground font-medium"
                  />
                ),
              }}
            />
          </span>
        </p>
      }
      bottomNav={<LogInNav />}
    />
  )
}

function LogInNav() {
  const { t } = useTranslation()
  return (
    <>
      {t('auth.register.haveAccount')}{' '}
      <Link to="/auth/login" className="text-primary-foreground font-medium">
        {t('auth.register.logInLink')}
      </Link>
    </>
  )
}

export default SignupPage
