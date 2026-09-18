import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import { useDisconnectZernioAccount } from '@/hooks/useZernio'
import { toast } from '@/stores/toastStore'
import { ZernioError } from '@/types/integrations'
import type { PublisherAccount } from '@/types/campaigns'

type Props = {
  account: PublisherAccount
  /** The platform this account belongs to, for the dialog's copy. */
  platformName: string
  isOpen: boolean
  onClose: () => void
}

/**
 * Confirms disconnecting one social account (CON-133).
 *
 * Two steps by design. The server refuses with 409 when scheduled posts still
 * publish as the account, and the count only exists in that response — there
 * is no "how many posts use this account" endpoint to ask first. So the first
 * confirm attempts the plain disconnect; if the guard fires, the dialog shows
 * what would break and offers to force it. That means the scary second screen
 * is only ever shown when it is actually warranted.
 */
export function DisconnectAccountDialog({
  account,
  platformName,
  isOpen,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const {
    mutate: disconnect,
    isPending,
    error,
    reset,
  } = useDisconnectZernioAccount()
  // Set once the server has told us the guard fired, and how many posts it
  // covers. Null means we're still on the first screen.
  const [blockedBy, setBlockedBy] = useState<number | null>(null)

  const name = account.display_name || account.username

  // A fresh open is a fresh decision — never reopen straight onto the
  // force screen or a stale error from the previous attempt.
  useEffect(() => {
    if (isOpen) {
      setBlockedBy(null)
      reset()
    }
  }, [isOpen, reset])

  const run = (force: boolean) => {
    disconnect(
      { id: account.id, force },
      {
        onSuccess: () => {
          toast.success(t('workspaceSettings.disconnect.succeeded', { name }))
          onClose()
        },
        onError: (err) => {
          if (
            err instanceof ZernioError &&
            err.code === 'account_has_scheduled_posts'
          ) {
            // Not a failure the user needs a toast for — it's the guard doing
            // its job, and the dialog turns it into the next question.
            setBlockedBy(err.scheduledPosts ?? 0)
          }
        },
      },
    )
  }

  const forcing = blockedBy !== null

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={isPending ? () => {} : onClose}
      title={
        forcing
          ? t('workspaceSettings.disconnect.blocked.title')
          : t('workspaceSettings.disconnect.title', { name })
      }
      size="small"
      closeOnBackdropClick={!isPending}
      closeOnEscape={!isPending}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-sm text-secondary-foreground">
          {forcing ? (
            // Each plural form is written out whole rather than stitched from
            // "it"/"them" fragments — the pronouns and agreement that English
            // needs here are not the ones Spanish needs.
            <>
              <p>
                <Trans
                  i18nKey="workspaceSettings.disconnect.blocked.body"
                  count={blockedBy ?? 0}
                  values={{ name }}
                  components={{ strong: <strong /> }}
                />
              </p>
              <p>
                {t('workspaceSettings.disconnect.blocked.keep', {
                  count: blockedBy ?? 0,
                })}
              </p>
            </>
          ) : (
            <>
              <p>
                {t('workspaceSettings.disconnect.body', {
                  platform: platformName,
                })}
              </p>
              <p>
                {t('workspaceSettings.disconnect.published', {
                  platform: platformName,
                })}
              </p>
            </>
          )}
          {/* Everything except the guard error, which *is* the force screen —
              re-stating it as an error would say the same thing twice. A
              failure of the forced attempt itself (rate limit, degraded
              integration) must still show, or the confirm button just returns
              from its spinner over silence. */}
          {error && !isScheduleGuard(error) && (
            <p className="text-destructive">
              {disconnectErrorMessage(error, t)}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
          >
            {t('workspaceSettings.disconnect.keep')}
          </Button>
          <Button
            type="button"
            variant="destructiveInverted"
            onClick={() => run(forcing)}
            loading={isPending}
          >
            {/* Literal caps in the catalogue, not an `uppercase` class — see
                CLAUDE.md on destructive labels. Every translation keeps them. */}
            {forcing
              ? t('workspaceSettings.disconnect.blocked.confirm')
              : t('workspaceSettings.disconnect.confirm')}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}

/** The 409 that turns into the force screen rather than an error line. */
function isScheduleGuard(err: unknown): boolean {
  return (
    err instanceof ZernioError && err.code === 'account_has_scheduled_posts'
  )
}

/**
 * Turns the disconnect failures into prose. The server answers these with bare
 * machine codes, so without this the dialog would render "integration_degraded".
 */
function disconnectErrorMessage(err: unknown, t: TFunction): string {
  if (err instanceof ZernioError) {
    switch (err.code) {
      case 'account_not_found':
        return t('integration.alreadyDisconnected')
      case 'integration_degraded':
        // The server stops before touching local state on an upstream failure,
        // so "nothing changed" is a guarantee, not a guess — say so, because it
        // makes retrying obviously safe.
        return t('integration.removalUnconfirmed')
      case 'integration_disabled':
        return t('integration.disabled')
      case 'rate_limited':
        return err.retryAfterSeconds
          ? t('integration.rateLimitedIn', { seconds: err.retryAfterSeconds })
          : t('integration.rateLimited')
      default:
        // The server's own prose, which we cannot translate — better than
        // replacing a specific reason with a generic one.
        return err.message
    }
  }
  // A non-Zernio failure is transport or client-side — "Failed to fetch" is
  // developer text, not something to show a user in any language. The Zernio
  // default above is different: that's the server's own prose for a code we
  // don't model, which beats replacing a specific reason with a generic one.
  return t('common.somethingWentWrong')
}
