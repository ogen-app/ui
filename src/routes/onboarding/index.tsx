import { createFileRoute, redirect } from '@tanstack/react-router'
import { isFeatureEnabled } from '@/config/featureFlags'
import { searchTextOf } from '@/lib/searchText'
import OnboardingPage from './page'

export type OnboardingSearch = {
  /** A platform Zernio just connected, carried over from Settings. */
  connected?: string
  /** Why a connect failed, carried over the same way. */
  connect_error?: string
}

// Outside `_authenticated`, like `/workspaces`: setup is full-screen and has
// no sidebar to offer, since every row in it leads somewhere setup would send
// the person straight back from. Auth, and whether setup is owed at all, are
// guarded in `__root.tsx`.
export const Route = createFileRoute('/onboarding/')({
  beforeLoad: () => {
    if (!isFeatureEnabled('onboarding')) throw redirect({ to: '/' })
  },
  validateSearch: (search: Record<string, unknown>): OnboardingSearch => ({
    connected: searchTextOf(search.connected),
    connect_error: searchTextOf(search.connect_error),
  }),
  component: OnboardingPage,
})
