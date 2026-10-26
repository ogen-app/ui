import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { changePlan, listTiers } from '@/services/api/tiers'
import { QUERY_FIVE_MINUTES } from '@/lib/queryClient'
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
 * The plans on offer — and only those: `GET /api/public/pricing` publishes
 * purchasable versions, so the one a grandfathered workspace holds is not in
 * here and must be rendered from `useWorkspacePlan` instead.
 *
 * Five minutes, the same as the server's own cache on the route. Mostly
 * editorial data — but the free-month mark can move in Harbor, and an answer
 * held for the life of the tab would keep offering a month that is no longer
 * on. Checkout says what was really applied either way (`PlanCheckout.trial`).
 */
export function useTiers() {
  return useQuery({
    queryKey: TIERS_KEY,
    queryFn: listTiers,
    staleTime: QUERY_FIVE_MINUTES,
  })
}

/**
 * Moving the workspace onto a tier (CON-325).
 *
 * Two outcomes, and the server picks: a checkout to redirect to, which changes
 * nothing yet and so touches no cache, or the plan as it now stands. The second
 * is *set* into the entitlement cache rather than invalidated — the gating on
 * screen changes in the same frame — and then everything else is invalidated,
 * deliberately broadly: a tier change moves limits under lists, forms and
 * pickers all over the app, and which of them is the server's business.
 *
 * No error toast: the refusals are codes the screen words in place
 * (`PlanChangeError`), and one of them — the free month that cannot be ended
 * from here — is answered with a dialog, not a toast.
 */
export function useChangePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      tierId,
      priceId,
    }: {
      tierId: string
      priceId?: string | null
    }) => changePlan(tierId, priceId),
    meta: { errorToast: false },
    onSuccess: (change) => {
      if (change.kind !== 'changed') return
      queryClient.setQueryData(ENTITLEMENTS_KEY, change.plan)
      void queryClient.invalidateQueries()
    },
  })
}
