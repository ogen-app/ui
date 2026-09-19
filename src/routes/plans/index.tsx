import { createFileRoute, redirect } from '@tanstack/react-router'

import { PlansPage } from './page'
import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * Outside `_authenticated` on purpose — see `page.tsx`. Auth is still guarded
 * once, in `__root.tsx`.
 *
 * The flag is enforced here, not only on the buttons that link here: with tiers
 * off the URL has to behave as though the screen does not exist. Home rather
 * than workspace settings, because this route no longer sits under it.
 */
export const Route = createFileRoute('/plans/')({
  beforeLoad: () => {
    if (!isFeatureEnabled('workspace-tiers')) throw redirect({ to: '/' })
  },
  component: PlansPage,
})
