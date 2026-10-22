import { apiJson } from './http'
import { ApiError } from './errors'
import {
  entitlementsFromWire,
  planFromWire,
  versionFromWire,
  type PlanBody,
  type TierVersionBody,
} from './entitlements'
import type { PlanChange, Tier } from '@/types/tiers'

/**
 * The tiers on offer, and moving a workspace onto one (CON-232, CON-243,
 * CON-325).
 *
 * ## The list — `GET /api/public/pricing`
 *
 * **Unauthenticated, CDN-cacheable, and not about any workspace.** It carries no
 * session and must carry no `X-Workspace-Id` (see `isAccountScoped` in
 * `base.ts`): it is the same list a logged-out visitor reads on the marketing
 * site, which is what lets it be cached at the edge for everyone at once. The
 * server caches it for five minutes.
 *
 *     200 { "tiers": [ …tier version…, plus
 *                      "available": true, "free_trial": true, "trial_days": 30,
 *                      and "available" on every price row ] }
 *
 * Each row is the body `GET /api/me/entitlements` answers with — one immutable
 * version, its price rows in minor units, and its entitlements as catalog
 * entries — so it parses through `entitlements.ts`'s functions, which is the only
 * way the price list and the lock on a button can be guaranteed to mean the same
 * thing by a limit. What the list adds is about *buying*, and nothing in it
 * depends on the caller:
 *
 * - **`available`** — billing is on and at least one of the tier's prices has a
 *   Lemon Squeezy variant behind it. A tier can be published and not yet
 *   sellable; it is listed and cannot be chosen. Per price row as well, because
 *   a yearly price can lag the monthly one.
 * - **`free_trial`** — the one tier an operator has marked in Harbor as
 *   carrying the free month, with its length in `trial_days`. Whether *this
 *   reader* may have it is on the plan read (`trial_eligible`), and whether it
 *   was applied is checkout's answer.
 *
 * **It publishes only what is purchasable.** A superseded version somebody is
 * grandfathered onto is not in it, and neither is the internal `default` tier —
 * so the plan screen renders the tier in force from `WorkspacePlan` and never by
 * looking its id up here.
 *
 * **The rows are editorial data, and they are not translated.** The catalog
 * ships each feature's name and description in one language; that belongs to
 * whoever edits the catalog, not to a client-side catalogue.
 *
 * ## The change — `POST /api/workspace/plan`
 *
 *     POST {"tier_id": "pro", "price_id": "ttvp-pro-v1-usd-y"}
 *     202 {"checkout": {"url": "https://…", "expires_at": "…", "trial": true}}
 *     200 …the /api/me/entitlements body…
 *
 * Owner only. **Which answer comes back is the server's decision**, made off
 * whether the workspace has a live subscription: none, and it mints a Lemon
 * Squeezy checkout (202); one, and it changes the plan in place (200) — an
 * upgrade now, a downgrade at the end of the paid period, and choosing the tier
 * already held calls off a pending downgrade. `price_id` picks the interval and
 * defaults to the monthly price.
 *
 * The refusals are codes, not prose, and `PlanChangeError` carries them so the
 * screen can word each one (CON-322 §7.1).
 */

type PricingTierBody = TierVersionBody & {
  available?: boolean | null
  free_trial?: boolean | null
  trial_days?: number | null
}

type TiersBody = { tiers?: PricingTierBody[] | null }

type CheckoutBody = {
  checkout: { url: string; expires_at?: string | null; trial?: boolean | null }
}

export function tierFromWire(body: PricingTierBody): Tier {
  const freeTrial = body.free_trial === true
  return {
    ...versionFromWire(body),
    entitlements: entitlementsFromWire(body),
    available: body.available === true,
    freeTrial,
    trialDays:
      freeTrial && typeof body.trial_days === 'number' ? body.trial_days : null,
  }
}

export function listTiers(): Promise<Tier[]> {
  return apiJson<TiersBody>(
    '/api/public/pricing',
    'Unable to load the plans',
  ).then((payload) => (payload.tiers ?? []).map(tierFromWire))
}

/** The refusals `POST /api/workspace/plan` answers with (CON-322 §7.1). */
export const PLAN_CHANGE_CODES = [
  'unknown_tier',
  'price_mismatch',
  'tier_not_available',
  'subscription_not_changeable',
  'trial_upgrade_unavailable',
  'provider_error',
  'billing_unavailable',
] as const

export type PlanChangeCode = (typeof PLAN_CHANGE_CODES)[number]

/**
 * A plan change the server refused, by its code.
 *
 * The body's `error` is an identifier rather than a sentence, so the generic
 * error path would print `trial_upgrade_unavailable` as a toast title. This
 * keeps the code, and the screen words it; an unrecognised code stays a plain
 * `ApiError` with the call's own fallback sentence.
 */
export class PlanChangeError extends ApiError {
  readonly reason: PlanChangeCode

  constructor(status: number, reason: PlanChangeCode) {
    super(status, 'Unable to change your plan', reason)
    this.name = 'PlanChangeError'
    this.reason = reason
  }
}

function isPlanChangeCode(value: string): value is PlanChangeCode {
  return (PLAN_CHANGE_CODES as readonly string[]).includes(value)
}

/**
 * Moves the workspace onto a tier — through checkout, or in place.
 *
 * Never cache the checkout: it is a signed link minted for this click.
 */
export async function changePlan(
  tierId: string,
  priceId?: string | null,
): Promise<PlanChange> {
  const body: Record<string, string> = { tier_id: tierId }
  if (priceId) body.price_id = priceId
  let payload: CheckoutBody | PlanBody
  try {
    payload = await apiJson<CheckoutBody | PlanBody>(
      '/api/workspace/plan',
      'Unable to change your plan',
      { method: 'POST', body },
    )
  } catch (err) {
    if (err instanceof ApiError && isPlanChangeCode(err.message)) {
      throw new PlanChangeError(err.status, err.message)
    }
    throw err
  }
  if ('checkout' in payload && payload.checkout) {
    return {
      kind: 'checkout',
      checkout: {
        url: payload.checkout.url,
        expiresAt: payload.checkout.expires_at ?? null,
        trial: payload.checkout.trial === true,
      },
    }
  }
  return { kind: 'changed', plan: planFromWire(payload as PlanBody) }
}
