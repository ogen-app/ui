import { useEffect, useState } from 'react'
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
export function DisconnectAccountDialog({ account, platformName, isOpen, onClose }: Props) {
  const { mutate: disconnect, isPending, error, reset } = useDisconnectZernioAccount()
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
          toast.success(`Disconnected ${name}`)
          onClose()
        },
        onError: (err) => {
          if (err instanceof ZernioError && err.code === 'account_has_scheduled_posts') {
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
      title={forcing ? 'This account has scheduled posts' : `Disconnect ${name}?`}
      size="small"
      closeOnBackdropClick={!isPending}
      closeOnEscape={!isPending}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-sm text-secondary-foreground">
          {forcing ? (
            <>
              <p>
                <strong>
                  {blockedBy === 1
                    ? '1 scheduled post publishes'
                    : `${blockedBy} scheduled posts publish`}
                </strong>{' '}
                as {name}. Disconnecting now leaves {blockedBy === 1 ? 'it' : 'them'} pointing
                at an account that no longer exists, so {blockedBy === 1 ? 'it' : 'they'} will
                fail to publish.
              </p>
              <p>
                To keep {blockedBy === 1 ? 'it' : 'them'}, close this and unschedule{' '}
                {blockedBy === 1 ? 'the post' : 'those posts'} first — then you can pick a
                different account for {blockedBy === 1 ? 'it' : 'each'}.
              </p>
            </>
          ) : (
            <>
              <p>
                Ogen will stop publishing to this {platformName} account, and the connection is
                removed on the publishing provider too — so it won’t come back on the next sync.
              </p>
              <p>
                Posts already published stay live on {platformName}. You can reconnect the
                account later, but it has to go through the authorization flow again.
              </p>
            </>
          )}
          {error && !forcing && (
            <p className="text-destructive">{disconnectErrorMessage(error)}</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            KEEP CONNECTED
          </Button>
          <Button
            type="button"
            variant="destructiveInverted"
            onClick={() => run(forcing)}
            loading={isPending}
          >
            {/* Literal caps, not `uppercase` — see CLAUDE.md on destructive labels. */}
            {forcing ? 'DISCONNECT ANYWAY' : 'DISCONNECT ACCOUNT'}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}

/**
 * Turns the disconnect failures into prose. The server answers these with bare
 * machine codes, so without this the dialog would render "integration_degraded".
 */
function disconnectErrorMessage(err: unknown): string {
  if (err instanceof ZernioError) {
    switch (err.code) {
      case 'account_not_found':
        return 'This account is already disconnected.'
      case 'integration_degraded':
        // The server stops before touching local state on an upstream failure,
        // so "nothing changed" is a guarantee, not a guess — say so, because it
        // makes retrying obviously safe.
        return 'The publishing provider didn’t confirm the removal, so nothing was changed. Try again in a moment.'
      case 'integration_disabled':
        return 'The publishing integration is not configured on this server.'
      case 'rate_limited':
        return err.retryAfterSeconds
          ? `Too many attempts — try again in ${err.retryAfterSeconds}s.`
          : 'Too many attempts — try again shortly.'
      default:
        return err.message
    }
  }
  return err instanceof Error ? err.message : 'Something went wrong.'
}
