import { useQuery } from '@tanstack/react-query'

import { getWorkspacePlan } from '@/services/api/entitlements'
import { UNGATED, resolveEntitlement } from '@/lib/entitlements'
import { useFeatureFlag } from '@/config/featureFlags'
import type { Entitlement, EntitlementKey } from '@/types/entitlements'

/**
 * Reading the workspace's tier, and asking it about one feature (CON-232).
 *
 * `useEntitlement` is the seam the rest of the app goes through, and it is a
 * hook rather than a `<Gate>` wrapper on purpose. A denied feature has three
 * legitimate renderings — hidden, locked, or locked with an upgrade — and the
 * first of those is usually not a swap the feature can make about itself: a
 * hidden menu item needs its `<li>` gone, the separator beside it gone, and the
 * empty state below it to say something different. A wrapper cannot reach up
 * and do any of that. So the hook answers and the call site decides, including
 * deciding to render nothing.
 *
 * Which of the three to reach for, so the choice isn't per-developer taste:
 *
 * - **Hide** in enumerations — menus, pickers, dropdowns. A locked row in a
 *   list of options is worse than a shorter list; there is no context there for
 *   a user to learn anything from it.
 * - **Lock, no call to action** in structures, where removing the thing would
 *   leave a hole or make the screen read wrong.
 * - **Lock with an upgrade** at the moment of intent — they clicked it, or they
 *   just hit the limit. That is when the upgrade answers the question they were
 *   already asking, rather than interrupting with an advertisement.
 *
 * The choice is local; the *renderings* are shared (`components/entitlements`),
 * which is what keeps five screens from inventing five different locks.
 */

/**
 * Keyed without the workspace id. The request is scoped by this tab's
 * `X-Workspace-Id` header, and switching workspace clears the whole tab cache
 * (`useSwitchWorkspace`) — which is what stops an unkeyed entry from surviving
 * into another workspace. Exported because anything that spends an allowance —
 * creating a campaign, running a content plan, connecting an account — has to
 * invalidate it, or the meters go stale in the direction that flatters us.
 */
export const ENTITLEMENTS_KEY = ['entitlements'] as const

/**
 * The plan itself. Undefined until it answers.
 *
 * With the flag off the query never runs, so this stays undefined and every
 * `useEntitlement` below reports `UNGATED` — the app behaves exactly as it did
 * before tiers existed, which is what the off-branch is required to do.
 */
export function useWorkspacePlan() {
  const gated = useFeatureFlag('workspace-tiers')
  return useQuery({
    queryKey: ENTITLEMENTS_KEY,
    queryFn: getWorkspacePlan,
    enabled: gated,
    staleTime: 30_000,
  })
}

/**
 * What the workspace's tier says about one feature.
 *
 * Never returns `denied` because a request is in flight — an unanswered plan is
 * `pending`, and a call site that renders a lock for it would be telling a
 * paying customer they hadn't paid. Never returns `denied` for a key the server
 * didn't mention either: that is a feature nobody has decided to charge for.
 */
export function useEntitlement(key: EntitlementKey): Entitlement {
  const gated = useFeatureFlag('workspace-tiers')
  const { data: plan } = useWorkspacePlan()
  if (!gated) return UNGATED
  return resolveEntitlement(key, plan)
}

/*
 * There is deliberately no `useTier()` yet. The screens that talk *about* the
 * plan rather than being gated by it — a plan card in Workspace Settings, the
 * warning that a scheduled downgrade is coming — don't exist, and a hook with
 * no caller is an export claiming a surface nobody uses. When they land they
 * read `useWorkspacePlan().data?.tier`, which is already the whole of it.
 */
