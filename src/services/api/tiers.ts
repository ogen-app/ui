import { apiJson } from './http'
import { planFromWire, type PlanBody } from './entitlements'
import { STUBBED, stubListTiers, stubSelectTier } from './tiers.stub'
import { usageReset } from '@/lib/entitlements'
import type { RawEntitlement, WorkspacePlan } from '@/types/entitlements'
import type { Tier, TierPrice } from '@/types/tiers'

/**
 * The tier list, and moving a workspace onto one (CON-232).
 *
 * **Both of these 404 today, and the second one may never exist in this shape.**
 * `tiers.stub.ts` answers them off a JSON seed and `localStorage` so the screen
 * can be built and driven.
 *
 * What CON-243 shipped instead of `GET /api/tiers` is
 * `GET /api/public/pricing` — unauthenticated, CDN-cacheable, and carrying only
 * the tiers that are *purchasable*, each as one immutable version with its
 * catalog-enriched entitlements. It is a better list than the one described
 * below and wiring it is the next step; what it deliberately does **not** do is
 * include the version a workspace is grandfathered onto, so the rule at the
 * bottom of this comment holds harder than ever: the plan screen renders the
 * current tier from `WorkspacePlan` and never by looking its id up here.
 *
 * `POST /api/workspace/plan` has no counterpart at all. A workspace's version is
 * assigned by an operator through Harbor's gRPC `PlanAdminService` (CON-294);
 * there is no self-serve plan change on the API and no payment provider behind
 * one. The stub is what stands in, and it is the reason CHANGE PLAN works at all.
 *
 * ## The contract, as originally written
 *
 *     GET /api/tiers
 *
 * Every tier a workspace could be on, including versions it can no longer buy.
 * Workspace-scoped like `/api/entitlements`, and readable by every member.
 *
 *     200 {
 *       "tiers": [
 *         {
 *           "id": "tier_pro_2026_08_01",
 *           "name": "Pro",
 *           "tagline": "One brand, run properly…",
 *           "effective_from": "2026-08-01T00:00:00Z",
 *           "price": {"amount": 4900, "currency": "USD", "period": "month"},
 *           "available": true,
 *           "entitlements": {"campaigns": {"limit": 5}, …}
 *         }
 *       ]
 *     }
 *
 * **`available: false` is required, and the list must include the tier the
 * workspace is on.** Tiers are versioned and a workspace keeps the version it
 * bought, so the plan screen routinely has to name a tier nobody can buy. The
 * client renders the current plan from `/api/entitlements` and never by looking
 * its id up here — but a list that quietly omitted superseded versions would
 * still be wrong, because it is what a comparison table is drawn from.
 *
 * **`entitlements` is the same map `/api/entitlements` sends, minus `used`.**
 * A tier has allowances; a workspace has a tally. Sending the two in one shape
 * is what lets the plan screen and the lock on a button agree about what a
 * limit is.
 *
 * **The tier list is editorial data, and it is not translated.** `name` and
 * `tagline` come out of whatever tool the tiers are edited in, in one language.
 * That is a real gap the day a second language ships, and it is the tier list's
 * to close — the client cannot put server copy in a catalogue.
 *
 *     POST /api/workspace/plan  {"tier_id": "tier_pro_2026_08_01"}
 *
 * Moves the workspace, and answers with the same body `GET /api/entitlements`
 * does so the caller can seed the cache without a second round trip. Owner-only
 * — this is the one call here that spends money, and the server decides that,
 * not the button.
 *
 * The rules it has to implement, none of which the client may assume:
 *
 * - **An upgrade lands now; a downgrade lands at the next billing boundary.**
 *   Until then the workspace keeps everything it has, and the coming tier is
 *   reported as `scheduled_change`.
 * - **Choosing the current tier cancels a pending downgrade.** It is the only
 *   way back, and it must not be a second endpoint.
 * - **Nothing is deleted, ever.** A workspace over its new limits keeps every
 *   campaign, post and asset; the server marks some of them suspended and says
 *   so on the resource. See `Suspension` in `types/entitlements.ts`.
 */

type PriceBody = {
  amount: number
  currency: string
  period: 'month' | 'year'
}

/**
 * An allowance as this endpoint would state it — a limit with no counter, since
 * a tier has allowances and only a workspace has a tally.
 *
 * Its own type rather than a share of `entitlements.ts`'s: that one is now the
 * catalog-entry shape the real endpoint sends, and the two stopped being the
 * same thing when CON-243 shipped something this file's contract did not
 * predict. It goes when `/api/public/pricing` replaces the whole file.
 */
type TierEntitlementBody = {
  allowed?: boolean
  limit?: number | null
  reset?: string | null
}

export type TierBody = {
  id: string
  name: string
  tagline: string
  effective_from: string
  price?: PriceBody | null
  available: boolean
  entitlements?: Record<string, TierEntitlementBody> | null
}

type TiersBody = { tiers?: TierBody[] | null }

function priceFromWire(body: PriceBody | null | undefined): TierPrice | null {
  if (!body) return null
  return { amount: body.amount, currency: body.currency, period: body.period }
}

/** Keeps `undefined` meaning *unsaid* — see `entitlementFromWire`'s note. */
function allowanceFromWire(body: TierEntitlementBody): RawEntitlement {
  const entry: RawEntitlement = {}
  if (body.allowed !== undefined) entry.allowed = body.allowed
  if (body.limit !== undefined) entry.limit = body.limit
  if (body.reset !== undefined) entry.reset = usageReset(body.reset)
  return entry
}

export function tierFromWire(body: TierBody): Tier {
  const entitlements: Tier['entitlements'] = {}
  for (const [key, value] of Object.entries(body.entitlements ?? {})) {
    entitlements[key] = allowanceFromWire(value)
  }
  return {
    id: body.id,
    name: body.name,
    tagline: body.tagline,
    effectiveFrom: body.effective_from,
    price: priceFromWire(body.price),
    available: body.available,
    entitlements,
  }
}

export function listTiers(): Promise<Tier[]> {
  if (STUBBED) return stubListTiers()
  return apiJson<TiersBody>('/api/tiers', 'Unable to load the plans').then(
    (payload) => (payload.tiers ?? []).map(tierFromWire),
  )
}

/** Moves the workspace onto a tier, and answers with the plan that results. */
export function selectTier(tierId: string): Promise<WorkspacePlan> {
  if (STUBBED) return stubSelectTier(tierId)
  return apiJson<PlanBody>(
    '/api/workspace/plan',
    'Unable to change your plan',
    { method: 'POST', body: { tier_id: tierId } },
  ).then(planFromWire)
}
