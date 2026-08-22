import { createFileRoute, redirect } from '@tanstack/react-router'

import { PlanPage } from './page'
import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * The flag is enforced here, not only on the card that links here: with tiers
 * off the URL has to behave as though the screen does not exist, rather than
 * merely be unlinked.
 */
export const Route = createFileRoute('/_authenticated/workspace-settings/plan/')({
  beforeLoad: () => {
    if (!isFeatureEnabled('workspace-tiers')) throw redirect({ to: '/workspace-settings' })
  },
  component: PlanPage,
})
