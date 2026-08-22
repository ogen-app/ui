import { createFileRoute, redirect } from '@tanstack/react-router'

import { BillingPage } from './page'
import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * The flag is enforced here, not only on the card that links here: with tiers
 * off the URL has to behave as though the screen does not exist, rather than
 * merely be unlinked.
 *
 * Not role-gated in `beforeLoad`. A member who follows this URL should read why
 * the billing details aren't theirs, and `beforeLoad` runs before the workspace
 * is known — guessing at the role here would bounce owners on a cold load.
 */
export const Route = createFileRoute('/_authenticated/workspace-settings/billing/')({
  beforeLoad: () => {
    if (!isFeatureEnabled('workspace-tiers')) throw redirect({ to: '/workspace-settings' })
  },
  component: BillingPage,
})
