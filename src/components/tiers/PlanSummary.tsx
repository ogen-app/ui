import { useTranslation } from 'react-i18next'
import { CalendarBlankIcon } from '@phosphor-icons/react'

import { Chip } from '@/components/ui/chip'
import { NoticeShell, formatDay } from '@/components/entitlements/parts'
import type { TierSnapshot } from '@/types/entitlements'

type Props = {
  tier: TierSnapshot
  /**
   * Whether the tier the workspace holds is one that can still be bought.
   *
   * Worked out by the caller against the catalogue, and only ever used as a
   * label. The plan itself is rendered from this snapshot, never by looking the
   * id up in the tier list — a workspace keeps the version it bought, so a
   * lookup that missed would blank out the name of the plan somebody is paying
   * for.
   */
  retired: boolean
  onCancelChange: () => void
  busy: boolean
}

/**
 * The plan the workspace is on, and the one that is coming.
 *
 * Both are stated because both are true: a downgrade is bought now and lands at
 * the next billing boundary, so for most of a month the workspace has one tier
 * in force and another already decided. A screen that showed only the first
 * would let somebody re-read it a week later and conclude the change had not
 * gone through.
 */
export function PlanSummary({ tier, retired, onCancelChange, busy }: Props) {
  const { t, i18n } = useTranslation()

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[13px] text-tertiary-foreground">{t('tiers.currentPlan')}</span>
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-2xl font-display font-medium tracking-tight min-w-0 truncate">
            {tier.name}
          </h2>
          {retired && <Chip variant="muted">{t('tiers.retired')}</Chip>}
        </div>
        <p className="text-[13px] text-tertiary-foreground">
          {t('tiers.since', { when: formatDay(tier.effectiveFrom, i18n.language) })}
        </p>
      </div>

      {tier.scheduled && (
        <NoticeShell
          icon={<CalendarBlankIcon size={18} />}
          title={t(
            // The server says which direction this is. Ranking configurable
            // tiers is not the client's job, and the two readings want
            // opposite tones.
            tier.scheduled.direction === 'downgrade'
              ? 'tiers.changeScheduled'
              : 'tiers.changeScheduledUp',
            {
              name: tier.scheduled.name,
              when: formatDay(tier.scheduled.effectiveFrom, i18n.language),
            },
          )}
          action={
            busy ? undefined : { label: t('tiers.cancelChange'), onClick: onCancelChange }
          }
        >
          {tier.scheduled.direction === 'downgrade' && t('tiers.changeScheduledBody')}
        </NoticeShell>
      )}
    </div>
  )
}
