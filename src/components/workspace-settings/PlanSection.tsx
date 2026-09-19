import { useTranslation } from 'react-i18next'

import { PlanBillingCard } from '@/components/workspace-settings/PlanBillingCard'
import { useFeatureFlag } from '@/config/featureFlags'
import { useBilling, useBillingPortal } from '@/hooks/useBilling'
import { useWorkspacePlan } from '@/hooks/useEntitlements'
import { useWorkspace } from '@/hooks/useWorkspaces'
import { canManageBilling } from '@/types/workspace'
import { toast } from '@/stores/toastStore'

/**
 * The wiring behind `PlanBillingCard` — the reads, the role, and the one
 * side effect. The card itself is pure props so `/design/plan-billing` can
 * render every state of it from fixtures.
 */
export function PlanSection() {
  const { t } = useTranslation()
  const gated = useFeatureFlag('workspace-tiers')
  const workspace = useWorkspace()
  const plan = useWorkspacePlan()
  const billing = useBilling()
  const portal = useBillingPortal()

  /**
   * Opens the provider's portal in a new tab.
   *
   * The blank tab is opened *inside* the click, before the request: a
   * `window.open` that happens after an `await` has lost the user gesture and
   * is blocked by Safari and by strict pop-up settings. `opener` is cleared
   * because a tab opened this way can otherwise reach back into the app — and
   * a link that has to keep its handle can't be opened with `noopener`, which
   * returns null.
   */
  const openPortal = () => {
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null
    portal.mutate(undefined, {
      onSuccess: ({ url }) => {
        if (tab) tab.location.href = url
        else window.location.assign(url)
      },
      onError: () => {
        tab?.close()
        toast.error(t('tiers.portalFailed'))
      },
    })
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
      planFailed={plan.isError}
      onManage={openPortal}
      managing={portal.isPending}
    />
  )
}
