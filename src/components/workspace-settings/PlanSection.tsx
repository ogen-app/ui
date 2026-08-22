import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsRow } from '@/components/workspace-settings/SettingsRow'
import { usePlanStatement } from '@/hooks/usePlanStatement'
import { useWorkspacePlan } from '@/hooks/useEntitlements'
import { useFeatureFlag } from '@/config/featureFlags'

/**
 * Plan & billing, on Workspace Settings — two sentences and a way in.
 *
 * The card answers only what somebody scrolling settings is asking: what am I
 * on, and what is about to happen to it. Everything else — the payment method,
 * the invoices, the way to the provider — is a screen behind MANAGE, because
 * none of it is worth a round trip to render a line nobody came here for.
 *
 * The second sentence is the reason the card exists at all. A scheduled
 * downgrade is something you agreed to weeks ago and have forgotten, and
 * Workspace Settings is where somebody goes when they are wondering why a limit
 * moved.
 */
export function PlanSection() {
  const { t } = useTranslation()
  const gated = useFeatureFlag('workspace-tiers')
  const { data: plan } = useWorkspacePlan()
  const { headline, timing } = usePlanStatement(plan?.tier)

  // Nothing at all with the flag off — not an empty card. See CLAUDE.md: the
  // off-branch has to leave the app exactly as it was before tiers existed.
  if (!gated) return null

  return (
    <SettingsCard
      title={t('tiers.billingTitle')}
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link to="/workspace-settings/billing">{t('tiers.manage')}</Link>
        </Button>
      }
    >
      <ul>
        <SettingsRow
          title={headline ?? '—'}
          badges={
            plan?.tier.scheduled && <Chip variant="muted">{t('tiers.scheduledBadge')}</Chip>
          }
          description={timing}
        />
      </ul>
    </SettingsCard>
  )
}
