import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsRow } from '@/components/workspace-settings/SettingsRow'
import { formatDay } from '@/components/entitlements/parts'
import { useWorkspacePlan } from '@/hooks/useEntitlements'
import { useFeatureFlag } from '@/config/featureFlags'

/**
 * The plan, on Workspace Settings — a line, not the screen.
 *
 * Everything a plan card could hold is on `/workspace-settings/plan`, and this
 * says only which tier is in force and whether a change is coming. The second
 * half is the reason the card exists at all: a scheduled downgrade is something
 * you agreed to weeks ago and will have forgotten, and Workspace Settings is
 * where somebody goes when they are wondering why a limit moved.
 */
export function PlanSection() {
  const { t, i18n } = useTranslation()
  const gated = useFeatureFlag('workspace-tiers')
  const { data: plan } = useWorkspacePlan()

  // Nothing at all with the flag off — not an empty card. See CLAUDE.md: the
  // off-branch has to leave the app exactly as it was before tiers existed.
  if (!gated) return null

  return (
    <SettingsCard title={t('tiers.planTitle')}>
      <ul>
        <SettingsRow
          title={plan?.tier.name ?? '—'}
          badges={
            plan?.tier.scheduled && <Chip variant="muted">{t('tiers.scheduledBadge')}</Chip>
          }
          actions={
            <Button variant="secondary" size="sm" asChild>
              <Link to="/workspace-settings/plan">{t('tiers.viewPlans')}</Link>
            </Button>
          }
          description={
            plan?.tier.scheduled
              ? t(
                  plan.tier.scheduled.direction === 'downgrade'
                    ? 'tiers.changeScheduled'
                    : 'tiers.changeScheduledUp',
                  {
                    name: plan.tier.scheduled.name,
                    when: formatDay(plan.tier.scheduled.effectiveFrom, i18n.language),
                  },
                )
              : plan && t('tiers.since', { when: formatDay(plan.tier.effectiveFrom, i18n.language) })
          }
        />
      </ul>
    </SettingsCard>
  )
}
