import { useMutation, useQuery } from '@tanstack/react-query'

import { createBillingPortalLink, getBilling } from '@/services/api/billing'
import { useFeatureFlag } from '@/config/featureFlags'
import { useWorkspace } from '@/hooks/useWorkspaces'
import { canManageBilling } from '@/types/workspace'

/**
 * The money side of the plan (CON-232).
 *
 * Its own key rather than a slice of `useEntitlements`: entitlements are read
 * by every screen with a lock on it, and this is read by one screen that one
 * person in the workspace can open. The two also come from endpoints with
 * different audiences — see `services/api/billing.ts`.
 */

export const BILLING_KEY = ['billing'] as const

/**
 * Not fetched for anyone who isn't an owner — the route answers 403, and a
 * member landing on the screen should read why rather than see a failure. The
 * role comes off the *active* workspace, never off `current_user`, whose role
 * is the one it holds in the default workspace (CON-147).
 */
export function useBilling() {
  const gated = useFeatureFlag('workspace-tiers')
  const workspace = useWorkspace()
  return useQuery({
    queryKey: BILLING_KEY,
    queryFn: getBilling,
    enabled: gated && !!workspace && canManageBilling(workspace.role),
  })
}

/**
 * Mints a signed link into the provider's hosted portal.
 *
 * A mutation, though it reads: the link is minted per call and expires within
 * the day, so it must not be cached, prefetched or held in a `href` — all of
 * which a query would invite. `gcTime: 0` says the same thing to anyone reading
 * the devtools.
 *
 * Opening the tab is the caller's job, and there is a browser rule attached:
 * a `window.open` that happens after an `await` has lost the user gesture and
 * is blocked by Safari and by strict pop-up settings. So the call site opens a
 * blank tab *synchronously* on the click and points it at the URL when it
 * arrives — see the billing page.
 */
export function useBillingPortal() {
  return useMutation({
    mutationFn: () => createBillingPortalLink(),
    gcTime: 0,
  })
}
