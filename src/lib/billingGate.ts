import type { WorkspacePlan } from '@/types/entitlements'

/**
 * The billing gate, on this side (CON-322 §6.4, CON-328).
 *
 * A workspace created after billing began has no plan until its owner buys one,
 * and the server refuses it almost everything with 402 `billing_required`. The
 * client's job is to not walk into that wall: the root guard reads the gate *as
 * data* — `billing_required` on the plan read — and redirects to `/plans` once,
 * before any screen fires its burst of requests. `handleBillingRequired` is the
 * fallback for the tab that was already open when the gate closed.
 *
 * Grandfathered workspaces, and every workspace while billing is off, read
 * `false` and never see any of this.
 */

/**
 * Where a gated workspace may still be.
 *
 * `/plans` is the destination; the auth and invitation routes are public; the
 * workspace switcher is the way out to a workspace that is not gated; and the
 * outage page, the marketing entry and the flags panel answer before there is
 * a workspace to speak of. Each is also on the server's allowlist, or makes no
 * workspace-scoped request at all.
 */
const EXEMPT = [
  '/plans',
  '/auth',
  '/invite',
  '/workspaces',
  '/signup',
  '/server-unavailable',
  '/flags',
] as const

export function isGateExempt(pathname: string): boolean {
  return EXEMPT.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

let redirecting = false

/** True once a refusal has sent this tab to `/plans`; it is about to unload. */
export function isBillingRedirecting(): boolean {
  return redirecting
}

/**
 * Sends the tab to `/plans` after a 402 `billing_required`, once.
 *
 * A full navigation rather than a router push, for the same reason
 * `handleUnauthorized` uses one: this runs inside the request layer, which
 * holds no router, and a fresh load of `/plans` is also the cleanest state to
 * choose a plan from — no screen half-drawn behind it, no stale cache.
 */
export function handleBillingRequired(): void {
  if (redirecting || isGateExempt(window.location.pathname)) return
  redirecting = true
  window.location.assign('/plans')
}

/**
 * Whether the workspace has a live subscription.
 *
 * Read off `billing_period`, which the server fills from the subscription's
 * price and leaves `null` without one. This — not the redirect back from
 * checkout — is what proves a payment went through: the return URL is a
 * promise from the browser, the period is a fact from the provider's webhook.
 */
export function subscribed(plan: WorkspacePlan | undefined): boolean {
  return plan?.tier.billingPeriod != null
}
