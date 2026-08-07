import { useEffect, useState, type ReactNode } from 'react'
import { ArrowSquareOutIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { PLATFORMS_KEY, usePlatformViews } from '@/hooks/usePlatforms'
import {
  useCreateConnectLink,
  useTriggerZernioSync,
  ZERNIO_ACCOUNTS_KEY,
} from '@/hooks/useZernio'
import { ZernioError, type ConnectLinkResponse } from '@/types/integrations'
import { connectedAccounts, type PlatformView } from '@/lib/platformDictionary'

/** How often to re-check /api/platforms while waiting for an authorization
 * to sync back. The server tightens its own Zernio polling for a few minutes
 * after a connect link is issued, so a connected account shows up fast. */
const POLL_INTERVAL_MS = 5_000

/**
 * The OAuth hand-off, owned in one place because two sections start it: the
 * connect grid (a platform with no account yet) and a platform row whose
 * connection has gone bad and offers to Reconnect. Both mean the same thing to
 * Zernio — issue a connect link for the platform and wait for an account to
 * come back — so they share the mutation, the polling, and the modal.
 *
 * The mutation is deliberately fired from the click handler, not from an
 * effect in the modal: effects double-invoke under StrictMode and orphan
 * an in-flight useMutation on the simulated unmount, hanging it at
 * isPending forever. The click also lets us open the tab synchronously
 * (popup blockers only allow window.open inside a user gesture); the tab
 * is steered to the connect URL when the response arrives.
 */
export function useConnectPlatform(): {
  start: (view: PlatformView) => void
  /** Render this somewhere in the section that calls `start`. */
  modal: ReactNode
} {
  const [connecting, setConnecting] = useState<PlatformView | null>(null)
  const connectLink = useCreateConnectLink()

  const start = (view: PlatformView) => {
    // Pre-open the tab inside the click gesture so blockers allow it; null
    // when blocked anyway — the modal then leans on its fallback link.
    // `noopener` would return null and break the navigate-later pattern, so
    // sever the reverse handle manually before the third-party page loads.
    const popup = window.open('', '_blank')
    if (popup) popup.opener = null
    connectLink.reset()
    connectLink.mutate(view.info.zernioId, {
      onSuccess: (r) => {
        if (popup && !popup.closed) popup.location.href = r.connectUrl
      },
      onError: () => {
        if (popup && !popup.closed) popup.close()
      },
    })
    setConnecting(view)
  }

  const modal = connecting ? (
    <ConnectPlatformModal
      view={connecting}
      link={connectLink.data ?? null}
      error={connectLink.error}
      isPending={connectLink.isPending}
      onRetry={() => start(connecting)}
      onClose={() => {
        setConnecting(null)
        connectLink.reset()
      }}
    />
  ) : null

  return { start, modal }
}

/**
 * Guides the OAuth hand-off: shows the pending/error/link states, keeps
 * polling the platform list while the tab is open, and flips to a success
 * view once the account is mirrored back.
 */
function ConnectPlatformModal({
  view,
  link,
  error,
  isPending,
  onRetry,
  onClose,
}: {
  view: PlatformView
  link: ConnectLinkResponse | null
  error: Error | null
  isPending: boolean
  onRetry: () => void
  onClose: () => void
}) {
  const { info } = view
  const qc = useQueryClient()
  const { mutate: syncNow, isPending: isSyncing } = useTriggerZernioSync()

  // Watch the live platform list: the row flips to connected once the
  // background sync mirrors the authorized account back. Two outcomes count
  // as success, because two entry points share this modal:
  //
  // - Connect: a *new* account landed, so the count rose past the count at
  //   open time. Counted in accounts, not publishers — Zernio is the only
  //   publisher and reads `connected` once it holds any account, so a second
  //   account never moved the publisher count (CON-150).
  // - Reconnect: re-authorizing an *existing* inactive account flips it
  //   active in place — same id, same count — so the count check alone left
  //   this modal polling forever after the row behind it already recovered.
  const liveViews = usePlatformViews()
  const accountsAtOpen = connectedAccounts(view)
  const live = liveViews.find((v) => v.platform.id === view.platform.id)
  const liveAccounts = live ? connectedAccounts(live) : []
  const inactiveAtOpen = new Set(
    accountsAtOpen.filter((a) => !a.is_active).map((a) => a.id),
  )
  const connected =
    liveAccounts.length > accountsAtOpen.length ||
    liveAccounts.some((a) => a.is_active && inactiveAtOpen.has(a.id))

  // While waiting, re-check the platform list so the success state appears
  // without a manual refresh.
  useEffect(() => {
    if (!link || connected) return
    const timer = setInterval(() => {
      void qc.invalidateQueries({ queryKey: PLATFORMS_KEY })
      void qc.invalidateQueries({ queryKey: ZERNIO_ACCOUNTS_KEY })
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [link, connected, qc])

  return (
    <ModalContainer isOpen onClose={onClose} title={`Connect ${info.name}`} size="default">
      {connected ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <CheckCircleIcon className="size-10 text-positive" weight="fill" />
          <p className="text-sm">
            {info.name} is connected. You’ll find it under Platform Settings.
          </p>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : isPending ? (
        <div className="flex items-center gap-3 py-2 text-sm text-tertiary-foreground">
          <Spinner className="size-4" />
          Preparing your connect link…
        </div>
      ) : error ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-destructive">{connectErrorMessage(error)}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={onRetry}>
              Try again
            </Button>
          </div>
        </div>
      ) : link ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            Authorize your {info.name} account in the tab that just opened. If nothing opened,
            use the button below.
          </p>
          <a
            href={link.connectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary-foreground font-medium hover:underline"
          >
            Open the {info.name} connect page
            <ArrowSquareOutIcon className="size-3.5" />
          </a>
          <p className="text-xs text-tertiary-foreground">
            The link expires at {formatExpiry(link.expiresAt)}. Once you finish, the account
            appears here automatically — this can take a minute.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              loading={isSyncing}
              disabled={isSyncing}
              onClick={() => syncNow()}
            >
              Check now
            </Button>
          </div>
        </div>
      ) : null}
    </ModalContainer>
  )
}

/** Renders the connect link's expiry as a local HH:MM, or "soon" if unparsable. */
function formatExpiry(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? 'soon'
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Maps typed Zernio errors (rate limit, disabled, degraded) to friendly copy. */
function connectErrorMessage(err: unknown): string {
  if (err instanceof ZernioError) {
    switch (err.code) {
      case 'rate_limited':
        return err.retryAfterSeconds
          ? `Too many attempts — try again in ${err.retryAfterSeconds}s.`
          : 'Too many attempts — try again shortly.'
      case 'integration_disabled':
        return 'The publishing integration is not configured on this server.'
      case 'integration_degraded':
        return 'The publishing integration is temporarily unavailable. Try again in a moment.'
      default:
        return err.message
    }
  }
  return err instanceof Error ? err.message : 'Something went wrong.'
}
