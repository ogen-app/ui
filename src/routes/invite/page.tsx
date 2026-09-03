import { Link, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Trans, useTranslation } from 'react-i18next'

import { AppAuth } from '@/components/layout/AppAuth'
import { AuthAcceptInviteForm } from '@/components/forms/authAcceptInviteForm'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/services/api/errors'
import { previewInvitation } from '@/services/api/invitations'

/**
 * The destination of the emailed invitation link (CON-26).
 *
 * The token is previewed before anything is asked for, because the first
 * question anyone following a link out of their inbox has is "what is this and
 * who sent it" — and because a token that is already dead should say so before
 * the person types a password into a form that cannot work.
 *
 * The preview is deliberately not specific about *why* a token is unusable:
 * unknown, expired, revoked and already-accepted all answer the same 410 by
 * design, so the screen says the same thing back. Someone who has already
 * accepted is served by the log-in link.
 */
function InvitePage() {
  const { t } = useTranslation()
  const { token } = useSearch({ from: '/invite/' })

  const {
    data: preview,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => previewInvitation(token as string),
    enabled: Boolean(token),
    // One shot: a 410 is a fact about the token, and retrying it three times
    // only makes the dead-link screen slower to appear.
    retry: false,
  })

  const bottomNav = (
    <>
      {t('auth.invite.haveAccount')}{' '}
      <Link to="/auth/login" className="text-primary-foreground font-medium">
        {t('auth.invite.logInLink')}
      </Link>
    </>
  )

  // Only a 410 is a fact about the token — that is the one answer the server
  // gives for every unusable one. Anything else (network drop, 500) says
  // nothing about the invitation, so it gets a retry instead of the dead-link
  // screen, which would send the invitee off to ask for a new link they don't
  // need.
  const tokenDead = isError && error instanceof ApiError && error.status === 410

  if (isError && !tokenDead) {
    return (
      <AppAuth
        title={t('auth.invite.previewFailedTitle')}
        subtitle={t('auth.invite.previewFailedSubtitle')}
        form={
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void refetch()}
          >
            {t('common.tryAgain')}
          </Button>
        }
        bottomNav={bottomNav}
      />
    )
  }

  if (!token || tokenDead) {
    return (
      <AppAuth
        title={t('auth.invite.brokenTitle')}
        subtitle={t('auth.invite.brokenSubtitle')}
        form={
          <p className="text-[13px] leading-5 text-secondary-foreground">
            {/* The link sits mid-sentence, so the sentence stays one key and
                `<Trans>` places the anchor — translations move it. */}
            <Trans
              i18nKey="auth.invite.brokenBody"
              components={{
                login: (
                  <Link
                    to="/auth/login"
                    className="text-primary-foreground font-medium"
                  />
                ),
              }}
            />
          </p>
        }
        bottomNav={bottomNav}
      />
    )
  }

  if (isPending || !preview) {
    return (
      <AppAuth
        title={t('auth.invite.title')}
        form={
          <p className="text-[13px] leading-5 text-secondary-foreground">
            {t('common.loading')}
          </p>
        }
        bottomNav={bottomNav}
      />
    )
  }

  return (
    <AppAuth
      title={t('auth.invite.title')}
      // Who invited you and where — the two facts that decide whether this
      // link is one you meant to follow.
      subtitle={t('auth.invite.subtitle', {
        inviter: preview.inviter_name,
        workspace: preview.workspace_name,
      })}
      form={
        <AuthAcceptInviteForm
          token={token}
          email={preview.email}
          hasAccount={preview.has_account}
        />
      }
      bottomNav={bottomNav}
    />
  )
}

export default InvitePage
