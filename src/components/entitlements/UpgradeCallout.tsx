import { LockSimpleIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import { NoticeShell, formatDay } from './parts'
import { UsageMeter } from './UsageMeter'
import type { Entitlement } from '@/types/entitlements'

type Denied = Extract<Entitlement, { state: 'denied' }>

type Props = {
  entitlement: Denied
  /** See `NoticeShell` — omitted until there is a billing screen to send them to. */
  onUpgrade?: () => void
  /** Passed through to the meter; see `UsageMeter`. */
  format?: (value: number) => string
  className?: string
}

/**
 * The loud rendering of a denial, for the moment of intent — they clicked it,
 * or they just ran out. That is when an upgrade answers the question the user
 * was already asking instead of interrupting with an advertisement.
 *
 * It takes the whole `Entitlement` rather than a reason string because the two
 * denials are genuinely different news. *Your plan doesn't include this* is
 * only ever answered by paying. *You've used 5 of 5 this month* is often
 * answered by waiting a week — so it shows the count and says when the
 * allowance comes back, and the upgrade is offered beside that rather than
 * instead of it. Leaving the reset date out would turn a fact into a sales
 * pitch.
 *
 * The one deliberate exception is the Post Assistant, whose allowance is a
 * token budget priced off model rates: its numbers arrive like any other and
 * its call site passes no `format` and hides the meter, because that budget is
 * never a number we show. The server says what is true; the screen decides what
 * is worth saying.
 */
export function UpgradeCallout({ entitlement, onUpgrade, format, className }: Props) {
  const { t, i18n } = useTranslation()
  const upgrade = onUpgrade
    ? { label: t('tiers.upgrade'), onClick: onUpgrade }
    : undefined

  if (entitlement.reason === 'tier') {
    return (
      <NoticeShell
        icon={<LockSimpleIcon size={16} />}
        title={t('tiers.notInPlan')}
        action={upgrade}
        className={className}
      >
        {t('tiers.notInPlanBody')}
      </NoticeShell>
    )
  }

  const { usage } = entitlement
  return (
    <NoticeShell
      icon={<LockSimpleIcon size={16} />}
      title={t('tiers.limitReached')}
      action={upgrade}
      className={className}
    >
      <div className="flex flex-col gap-0.5">
        <UsageMeter usage={usage} format={format} className="text-tertiary-foreground" />
        {usage.resetsAt && (
          <span>{t('tiers.resets', { when: formatDay(usage.resetsAt, i18n.language) })}</span>
        )}
      </div>
    </NoticeShell>
  )
}
