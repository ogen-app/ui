import { useTranslation } from 'react-i18next'

import { PlanBillingCard } from '@/components/workspace-settings/PlanBillingCard'
import { useFeatureFlag } from '@/config/featureFlags'
import { useBilling, useOpenBillingPortal } from '@/hooks/useBilling'
import { useWorkspacePlan } from '@/hooks/useEntitlements'
import { useChangePlan } from '@/hooks/useTiers'
import { useWorkspace } from '@/hooks/useWorkspaces'
import { canChangePlan, canManageBilling } from '@/types/workspace'
import { toast } from '@/stores/toastStore'

/**
 * The wiring behind `PlanBillingCard` — the reads, the role, and the two side
 * effects. The card itself is pure props so a design harness can render every
 * state of it from fixtures.
 */
export function PlanSection() {
  const { t } = useTranslation()
  const gated = useFeatureFlag('workspace-tiers')
  const workspace = useWorkspace()
  const plan = useWorkspacePlan()
  const billing = useBilling()
  const portal = useOpenBillingPortal()
  const change = useChangePlan()

  /**
   * Calls off a scheduled downgrade: choosing the tier already held is what
   * cancels one (CON-325), so there is no second endpoint that could disagree.
   */
  const keepPlan = () => {
    const held = plan.data?.tier
    if (!held) return
    change.mutate(
      { tierId: held.tierId },
      {
        onSuccess: () => toast.success(t('tiers.changeCancelled')),
        onError: () => toast.error(t('tiers.changeFailed')),
      },
    )
  }

  // Nothing at all with the flag off — not an empty card. See CLAUDE.md: the
  // off-branch has to leave the app exactly as it was before tiers existed.
  if (!gated) return null

  return (
    <PlanBillingCard
      tier={plan.data?.tier}
      billing={billing.data}
      // The billing half is owner-only, on the server as well as here. A member
      // gets the sentence they are entitled to and an explanation, not a row
      // that stays empty because a request was made that was never theirs.
      mayManage={workspace ? canManageBilling(workspace.role) : false}
      // Asked separately from the line above, because they are separate
      // questions the moment `admin` exists — see `canChangePlan`.
      mayChange={workspace ? canChangePlan(workspace.role) : false}
      planFailed={plan.isError}
      billingFailed={billing.isError}
      onManage={portal.open}
      managing={portal.isPending}
      onKeepPlan={keepPlan}
      keeping={change.isPending}
    />
  )
}
