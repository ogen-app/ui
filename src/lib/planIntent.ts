import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * The plan a visitor picked on the marketing site, carried through signup
 * (CON-328, CON-322 §5.7).
 *
 * The pricing page links to `/signup?plan=<tier_id>`. The tier id has to
 * survive a form, possibly a validation error, and — for Google — a round trip
 * through the provider, and then land on `/plans` with that tier preselected.
 *
 * **`sessionStorage`, not `localStorage`.** The choice belongs to this visit:
 * a tab that signs up for Pro must not preselect Pro for somebody else signing
 * up from the same browser next week, and a second tab is a second visit.
 *
 * The id is only *remembered* here, never trusted: `/plans` preselects it only
 * if the price list offers it, and an unknown or unavailable tier falls back to
 * the ordinary picker.
 */

const KEY = 'ogen.planIntent'

/** Tier ids are slugs. Anything else is not worth carrying anywhere. */
const SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/

export function rememberPlanIntent(tierId: unknown): void {
  if (typeof tierId !== 'string' || !SLUG.test(tierId)) return
  try {
    sessionStorage.setItem(KEY, tierId)
  } catch {
    // Private mode or blocked storage: the visitor gets the normal picker.
  }
}

export function readPlanIntent(): string | null {
  try {
    const value = sessionStorage.getItem(KEY)
    return value && SLUG.test(value) ? value : null
  } catch {
    return null
  }
}

/** Called once `/plans` has used it, so a later visit starts clean. */
export function clearPlanIntent(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}

/**
 * Where to land after signing up: `/plans?plan=<tier>` when a plan was
 * picked, the app otherwise. Also the Google `return_to`, which the server
 * keeps only as a same-site path.
 */
export function afterSignupPath(): string {
  if (!isFeatureEnabled('workspace-tiers')) return '/'
  const tier = readPlanIntent()
  return tier ? `/plans?plan=${encodeURIComponent(tier)}` : '/'
}
