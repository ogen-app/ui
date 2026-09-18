import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { listTiers, selectTier } from '@/services/api/tiers'
import { useFeatureFlag } from '@/config/featureFlags'
import { ENTITLEMENTS_KEY } from './useEntitlements'

/**
 * The tier list, and moving onto one (CON-232).
 *
 * Separate from `useEntitlements` because they answer different questions at
 * different rates: what this workspace allows is asked by every gated screen,
 * where the price list is asked for once, by one screen, when somebody opens
 * it. Keeping them apart is what stops the catalogue being fetched behind every
 * lock icon in the app.
 */

export const TIERS_KEY = ['tiers'] as const

/**
 * The plans on offer, plus the versions that are not.
 *
 * `staleTime: Infinity` — the tier list is editorial data that changes when
 * somebody edits it, not while you are looking at it, and a refetch mid-read
 * would reshuffle the cards under the cursor.
 */
export function useTiers() {
  const gated = useFeatureFlag('workspace-tiers')
  return useQuery({
    queryKey: TIERS_KEY,
    queryFn: listTiers,
    enabled: gated,
    staleTime: Infinity,
  })
}

/**
 * Moving the workspace onto a tier.
 *
 * The response is the resolved plan, so the entitlement cache is *set* from it
 * rather than invalidated — the gating on screen changes in the same frame the
 * choice does, with no window where the app is showing the old tier's locks.
 *
 * Then everything else is invalidated, deliberately broadly. A tier change
 * moves limits under lists, forms and pickers all over the app, and which of
 * them a given change touches is the server's business — a hand-written list of
 * keys here would go stale the first time a tier learns a new allowance.
 */
export function useSelectTier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tierId: string) => selectTier(tierId),
    onSuccess: (plan) => {
      queryClient.setQueryData(ENTITLEMENTS_KEY, plan)
      queryClient.invalidateQueries()
    },
  })
}
