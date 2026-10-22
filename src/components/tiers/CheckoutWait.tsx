import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, InfoIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { NoticeShell } from '@/components/entitlements/parts'
import { cn } from '@/lib/styles'
import type { PlanCheckout } from '@/types/tiers'

/** How long before the wait admits it is slow. */
const SLOW_AFTER_MS = 30_000

type Props = {
  workspace: string
  /**
   * The checkout this tab opened in another one, or `null` when this tab *is*
   * the return from Lemon Squeezy (`?billing=return`).
   */
  opened: PlanCheckout | null
  /** Back to the plans, from a checkout opened and then abandoned. */
  onBack?: () => void
}

/**
 * Waiting for the provider to confirm a subscription (CON-328).
 *
 * **The redirect back from checkout proves nothing.** It is the browser being
 * sent to a URL, which a closed tab, a declined card or a pasted link can all
 * produce. What proves a payment is the provider's webhook, which reaches the
 * server, which says so on `/api/events` (`entity:billing:<tenant>`) — and the
 * page refetches the plan and moves on only once the plan shows a live
 * subscription. So this screen is honest about the step in between.
 *
 * It has two entrances. A tab that came *back* from Lemon Squeezy shows the
 * three steps with the middle one running. A tab that *opened* checkout in a
 * new one says what that checkout will charge — trusting the server's `trial`
 * flag over the badge that was clicked, because the free-month mark can move
 * between page load and click — and waits for the same event.
 *
 * After thirty seconds it says it is slow, and that nothing is charged twice:
 * the fear at that moment is paying again, not waiting.
 */
export function CheckoutWait({ workspace, opened, onBack }: Props) {
  const { t } = useTranslation()
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div
      className="mx-auto flex w-full max-w-xl flex-col gap-8 py-6"
      aria-live="polite"
    >
      <Spinner tone="onSurface" className="w-10" />
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-display font-light tracking-tight">
          {opened
            ? t('tiers.checkout.openedTitle')
            : t('tiers.checkout.confirmingTitle')}
        </h1>
        <p className="text-sm text-secondary-foreground">
          {opened
            ? opened.trial
              ? t('tiers.checkout.openedTrial')
              : t('tiers.checkout.openedCharged')
            : t('tiers.checkout.confirmingBody', { workspace })}
        </p>
        {opened && (
          <p className="text-sm text-secondary-foreground">
            {t('tiers.checkout.openedBody', { workspace })}
          </p>
        )}
      </div>

      {opened ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              // Kept in memory for this screen only, never in a `href`: the link
              // is signed and short-lived, like the portal's.
              const tab = window.open(opened.url, '_blank')
              if (tab) tab.opener = null
            }}
          >
            {t('tiers.checkout.reopen')}
          </Button>
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              {t('tiers.checkout.back')}
            </Button>
          )}
        </div>
      ) : (
        <ol className="flex flex-col gap-3 text-sm">
          <Step state="done">{t('tiers.checkout.stepCheckout')}</Step>
          <Step state="running">{t('tiers.checkout.stepConfirm')}</Step>
          <Step state="waiting">
            {t('tiers.checkout.stepOpen', { workspace })}
          </Step>
        </ol>
      )}

      {slow && (
        <NoticeShell
          icon={<InfoIcon size={16} />}
          title={t('tiers.checkout.slowTitle')}
        >
          {t('tiers.checkout.slowBody')}
        </NoticeShell>
      )}
    </div>
  )
}

function Step({
  state,
  children,
}: {
  state: 'done' | 'running' | 'waiting'
  children: React.ReactNode
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-3',
        state === 'done' && 'text-secondary-foreground',
        state === 'running' && 'font-medium',
        state === 'waiting' && 'text-tertiary-foreground',
      )}
    >
      <span
        className="flex size-4 shrink-0 items-center justify-center"
        aria-hidden
      >
        {state === 'done' ? (
          <CheckIcon size={14} weight="bold" className="text-positive" />
        ) : (
          <span
            className={cn(
              'size-3 rounded-full border',
              state === 'running'
                ? 'border-dashed border-primary-foreground motion-safe:animate-spin'
                : 'border-border',
            )}
          />
        )}
      </span>
      {children}
    </li>
  )
}
