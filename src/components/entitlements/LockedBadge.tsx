import { LockSimpleIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import { Chip } from '@/components/ui/chip'
import { cn } from '@/lib'

/**
 * The quiet rendering of a denial: a control stays where it is, wearing a lock.
 *
 * For the *structural* case — where the thing is part of how the screen reads
 * and removing it would leave a hole. It deliberately does not sell anything.
 * A user who has not asked for this feature yet is being told what it is, not
 * being advertised to; the offer belongs at the moment they reach for it, which
 * is `UpgradeCallout`'s job.
 *
 * Not for lists. A locked row among a picker's options is worse than a shorter
 * picker — hide there instead, which is why the seam is a hook and not a
 * wrapper that could only ever swap one thing for another.
 */
export function LockedBadge({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <Chip variant="muted" className={cn('gap-1.5 px-2 py-1', className)}>
      <LockSimpleIcon size={14} aria-hidden />
      {t('tiers.notInPlan')}
    </Chip>
  )
}
