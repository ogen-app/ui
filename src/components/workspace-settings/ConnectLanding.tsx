import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { WarningCircleIcon } from '@phosphor-icons/react'
import { Spinner } from '@/components/ui/spinner'
import { PLATFORMS_KEY } from '@/hooks/usePlatforms'
import { ZERNIO_ACCOUNTS_KEY } from '@/hooks/useZernio'
import { getPlatformByZernioId } from '@/lib/platformDictionary'
import { toast } from '@/stores/toastStore'

/**
 * Where a connect comes back to (CON-217).
 *
 * Since the flow went headless the browser leaves the app entirely and the
 * backend returns it here, saying how it went in the query string. That makes
 * this page the end of a journey it never saw start: there is no component
 * still mounted from the click, no mutation in flight, nothing but the URL.
 * So the URL is read once, acted on, and then wiped — a reload should not
 * re-announce a connect that happened a minute ago, and the parameters have no
 * business surviving in a link someone copies.
 */

/** Roughly how long the server's post-connect fast sync takes to mirror one account. */
const SETTLE_WINDOW_MS = 15_000
const SETTLE_POLL_MS = 3_000

export function ConnectLanding({
  connected,
  connectError,
}: {
  connected?: string
  connectError?: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // Held in state, not read from the URL: the parameters are stripped the
  // moment they are consumed, and the message has to outlive them.
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [settling, setSettling] = useState(false)
  const consumed = useRef(false)

  useEffect(() => {
    if (consumed.current) return
    if (!connected && !connectError) return
    consumed.current = true

    if (connectError) setErrorCode(connectError)
    if (connected) {
      const platform = getPlatformByZernioId(connected)?.name ?? connected
      toast.success(t('workspaceSettings.connect.success', { platform }))
      setSettling(true)
    }
    void navigate({ to: '/workspace-settings', search: {}, replace: true })
  }, [connected, connectError, navigate, t])

  // The account is not attached by the time we land: the server hands the
  // finished connect to its sync worker, which mirrors it within seconds. So
  // the list is re-asked for a short while rather than once, and says so —
  // an empty Platform Settings after a successful connect otherwise reads as
  // a failure for the few seconds it lasts.
  useEffect(() => {
    if (!settling) return
    const until = Date.now() + SETTLE_WINDOW_MS
    const timer = setInterval(() => {
      if (Date.now() >= until) {
        setSettling(false)
        return
      }
      void qc.invalidateQueries({ queryKey: PLATFORMS_KEY })
      void qc.invalidateQueries({ queryKey: ZERNIO_ACCOUNTS_KEY })
    }, SETTLE_POLL_MS)
    return () => clearInterval(timer)
  }, [settling, qc])

  if (errorCode) return <ConnectErrorNotice code={errorCode} />
  if (settling) return <ConnectSettlingNotice />
  return null
}

/** Why the connect didn't finish. Split out so it can be rendered from a fixture. */
export function ConnectErrorNotice({ code }: { code: string }) {
  const { t } = useTranslation()
  return (
    <div
      role="alert"
      // Same column as the cards below it, so it reads as part of the page
      // rather than as chrome laid over it.
      className="mx-auto flex w-full max-w-content items-start gap-3 bg-secondary px-4 py-3 text-sm"
    >
      <WarningCircleIcon className="size-5 shrink-0 text-destructive" weight="fill" />
      <p>{connectErrorCopy(code, t)}</p>
    </div>
  )
}

/** The few seconds between a finished connect and the account appearing below. */
export function ConnectSettlingNotice() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex w-full max-w-content items-center gap-3 bg-secondary px-4 py-3 text-sm text-tertiary-foreground">
      {/* `w-5` to sit in the same 20px column the error notice's icon occupies,
          so the two strips start their text on the same line. `onSurface`
          because the default tone is a white line meant for the inside of a
          button — on this fill it was all but invisible. */}
      <Spinner tone="onSurface" className="w-5 shrink-0" />
      {t('workspaceSettings.connect.settling')}
    </div>
  )
}

/**
 * The backend's `connect_error` codes, in words.
 *
 * `expired` and `missing_session` are one message on purpose: the server can
 * tell a stale link from an absent one, but the user cannot do anything
 * different about either. Anything unrecognised falls back rather than showing
 * a code — a new code shipped on the backend must not surface as jargon here.
 */
function connectErrorCopy(code: string, t: TFunction): string {
  switch (code) {
    case 'expired':
    case 'missing_session':
      return t('workspaceSettings.connect.errors.expired')
    case 'mismatch':
      return t('workspaceSettings.connect.errors.mismatch')
    case 'upstream':
      return t('workspaceSettings.connect.errors.upstream')
    case 'no_targets':
      return t('workspaceSettings.connect.errors.noTargets')
    default:
      return t('workspaceSettings.connect.errors.generic')
  }
}
