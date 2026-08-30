import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { useCreateConnectLink } from '@/hooks/useZernio'
import { ZernioError } from '@/types/integrations'
import type { PlatformView } from '@/lib/platformDictionary'

/**
 * The OAuth hand-off, owned in one place because two sections start it: the
 * connect grid (a platform with no account yet) and a platform row whose
 * connection has gone bad and offers to Reconnect. Both mean the same thing to
 * Zernio — issue a connect link for the platform — so they share the mutation
 * and the modal.
 *
 * **This leaves the app** (CON-217). Since the connect became headless, the
 * authorization no longer ends at the platform: the backend brings the browser
 * back to `/workspace-settings`, either finished or on the picker route, and
 * it can only do that by redirecting whatever window it is driving. A
 * background tab would therefore be where the rest of the flow happened, while
 * the tab the user was looking at sat waiting for something it could never
 * see. So we hand the whole window over and let it come back.
 *
 * The mutation is fired from the click handler rather than an effect: effects
 * double-invoke under StrictMode and orphan an in-flight useMutation on the
 * simulated unmount, hanging it at isPending forever.
 */
export function useConnectPlatform(): {
  start: (view: PlatformView) => void
  /** Render this somewhere in the section that calls `start`. */
  modal: ReactNode
} {
  const [connecting, setConnecting] = useState<PlatformView | null>(null)
  const connectLink = useCreateConnectLink()

  const start = (view: PlatformView) => {
    connectLink.reset()
    connectLink.mutate(view.info.zernioId, {
      // `assign`, not `replace`: the settings page stays in history, so a user
      // who thinks better of it on the platform's consent screen can press
      // Back and be where they started.
      onSuccess: (r) => window.location.assign(r.connectUrl),
    })
    setConnecting(view)
  }

  const modal = connecting ? (
    <ConnectPlatformModal
      view={connecting}
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
 * Covers the gap between the click and the redirect.
 *
 * Two states only, because there is no third outcome to render: either the
 * link arrives and the browser leaves this page, or it doesn't and the reason
 * belongs on screen. Everything the old modal did after that — the fallback
 * link, the expiry countdown, polling for the account — now happens on the
 * page the user is redirected back to.
 */
function ConnectPlatformModal({
  view,
  error,
  isPending,
  onRetry,
  onClose,
}: {
  view: PlatformView
  error: Error | null
  isPending: boolean
  onRetry: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { info } = view

  return (
    <ModalContainer
      isOpen
      onClose={onClose}
      title={t('workspaceSettings.connect.modalTitle', { platform: info.name })}
      size="default"
    >
      {error ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-destructive">
            {connectErrorMessage(error, t)}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={onRetry}>
              {t('common.tryAgain')}
            </Button>
          </div>
        </div>
      ) : (
        // Also the state after the link arrives: the mutation has settled but
        // the browser is still tearing the page down, and a modal that flicked
        // to something else in that moment would only be noise.
        <div className="flex items-center gap-3 py-2 text-sm text-tertiary-foreground">
          <Spinner tone="onSurface" className="w-10" />
          {isPending
            ? t('workspaceSettings.connect.preparing')
            : t('workspaceSettings.connect.redirecting', {
                platform: info.name,
              })}
        </div>
      )}
    </ModalContainer>
  )
}

/** Maps typed Zernio errors (rate limit, disabled, degraded) to friendly copy. */
export function connectErrorMessage(err: unknown, t: TFunction): string {
  if (err instanceof ZernioError) {
    switch (err.code) {
      case 'rate_limited':
        return err.retryAfterSeconds
          ? t('integration.rateLimitedIn', { seconds: err.retryAfterSeconds })
          : t('integration.rateLimited')
      case 'integration_disabled':
        return t('integration.disabled')
      case 'integration_degraded':
        return t('integration.degraded')
      case 'invalid_target':
        return t('workspaceSettings.connect.picker.invalidTarget')
      default:
        // The server's own prose, which we cannot translate — better than
        // replacing a specific reason with a generic one.
        return err.message
    }
  }
  return err instanceof Error ? err.message : t('common.somethingWentWrong')
}
