import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { createBillingPortalLink, getBilling } from '@/services/api/billing'
import { ApiError } from '@/services/api/errors'
import { toast } from '@/stores/toastStore'
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
    // 503 is billing switched off on this deployment (`BILLING_PROVIDER=none`)
    // — a state, not a hiccup, and asking again will not change it.
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 503) && count < 3,
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
 * arrives — `useOpenBillingPortal` below does exactly that.
 */
export function useBillingPortal() {
  return useMutation({
    mutationFn: () => createBillingPortalLink(),
    gcTime: 0,
  })
}

/**
 * Opens the provider's portal in a new tab from a click.
 *
 * The tab is opened *synchronously*, blank, and pointed at the link when it
 * arrives — a `window.open` after the `await` has lost the gesture and is
 * blocked. `opener` is cut so the portal cannot script this tab back. A blocked
 * pop-up falls back to leaving the app for the portal in this tab.
 *
 * `open` returns a promise that never rejects, so a click handler can ignore it.
 */
export function useOpenBillingPortal() {
  const { t } = useTranslation()
  const portal = useBillingPortal()
  const open = async () => {
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null
    // `mutateAsync`, not `mutate` with callbacks: TanStack drops per-call
    // callbacks once the component unmounts, and somebody who clicks MANAGE
    // and then leaves the page would be left with a blank tab. Awaiting the
    // request ties the tab to it, mounted or not.
    try {
      const { url } = await portal.mutateAsync()
      if (tab) tab.location.href = url
      else window.location.assign(url)
    } catch {
      tab?.close()
      toast.error(t('tiers.portalFailed'))
    }
  }
  return { open, isPending: portal.isPending }
}
