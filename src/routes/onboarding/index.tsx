import { createFileRoute } from '@tanstack/react-router'
import { searchTextOf } from '@/lib/searchText'
import OnboardingPage from './page'

export type OnboardingSearch = {
  /** A platform Zernio just connected — its callback lands here. */
  connected?: string
  /** Why a connect failed, from the same callback. */
  connect_error?: string
}

// Outside `_authenticated`, like `/workspaces`: setup is full-screen and has
// no sidebar to offer, since every row in it leads somewhere setup would send
// the person straight back from. Auth, and whether setup is owed at all, are
// guarded in `__root.tsx`.
export const Route = createFileRoute('/onboarding/')({
  validateSearch: (search: Record<string, unknown>): OnboardingSearch => ({
    connected: searchTextOf(search.connected),
    connect_error: searchTextOf(search.connect_error),
  }),
  component: OnboardingPage,
})
