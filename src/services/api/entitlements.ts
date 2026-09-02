import { apiJson } from './http'
import { STUBBED, stubWorkspacePlan } from './tiers.stub'
import { usagePeriod } from '@/lib/entitlements'
import type {
  RawEntitlement,
  ScheduledTierChange,
  TierSnapshot,
  WorkspacePlan,
} from '@/types/entitlements'

/**
 * The workspace's tier and what it allows (CON-232).
 *
 * **Nothing on the API answers this yet.** This file is the contract the client
 * is written against, the way `emailPreferences.ts` was — its test asserts the
 * shape, so the two move together, and the feature stays behind the
 * `workspace-tiers` flag until the endpoint exists.
 *
 * ## The contract
 *
 *     GET /api/entitlements
 *
 * Flat and workspace-scoped, like `/api/tenants/current` and `/api/users`: it
 * takes no workspace id and answers for whichever workspace the request's
 * `X-Workspace-Id` names (CON-147). Every member can read it — knowing what the
 * workspace has bought is not owner-only, since it is the thing that explains
 * why a button is locked.
 *
 *     200 {
 *       "tier": {
 *         "id": "tier_pro_2026_01_01",
 *         "name": "Pro",
 *         "effective_from": "2026-01-01T00:00:00Z",
 *         "billing_period": "month",
 *         "renews_at": "2026-09-22T00:00:00Z",
 *         "scheduled_change": {
 *           "id": "tier_trial_2026_09_01",
 *           "name": "Trial",
 *           "effective_from": "2026-09-14T00:00:00Z",
 *           "direction": "downgrade"
 *         }
 *       },
 *       "entitlements": {
 *         "campaigns":         {"limit": 5,  "used": 3},
 *         "content_plan_runs": {"limit": 10, "used": 7,
 *                               "period": "month",
 *                               "resets_at": "2026-09-01T00:00:00Z"},
 *         "media_storage_bytes": {"limit": 1073741824, "used": 402653184},
 *         "multiple_accounts_per_platform": {"allowed": false},
 *         "seats": {"limit": null, "used": 4}
 *       }
 *     }
 *
 * ### What each part has to hold, and why
 *
 * **`tier` is a resolved snapshot, not a lookup key.** Tiers are versioned and
 * their contents are configurable, and a workspace keeps the version it bought
 * — so `name` is a label two different workspaces can share while holding
 * different allowances. The client must never map a name to a number, which
 * means the server has to send the numbers. `id` names the *version*; the
 * client treats it as opaque.
 *
 * **`billing_period` and `renews_at` are here, and the card is not.** They are
 * half of what the plan is *called* — "Max, billed monthly, renews on the 22nd"
 * — and every member is entitled to that. What a member is not entitled to is
 * the price, the card and the invoices, which is why those sit behind the
 * owner-only `/api/billing` instead (see `billing.ts`). Both are `null` on a
 * tier nobody pays for, and `renews_at` is `null` again once a subscription is
 * cancelled: it then has an *end* date, which is the billing payload's to
 * report because "renews on the 22nd" and "ends on the 22nd" must not be the
 * same sentence.
 *
 * **`scheduled_change` is required, not derivable.** A downgrade takes effect
 * at the next billing boundary rather than on the click, so two tiers are live
 * at once: the one in force and the one coming. The client cannot work the
 * second one out from dates, and must not try — that would make a wrong system
 * clock into a billing decision. `direction` comes from the server too, because
 * only the server knows how its configurable tiers rank, and "Pro starts on the
 * 14th" and "you drop to Trial on the 14th" are different warnings.
 *
 * **Every limit ships with its counter.** A limit alone can only be enforced
 * after the fact: the client could say "5 campaigns" but not "you have 5", so
 * it could only apologise after the click instead of disabling the control.
 * CON-86 already meters this. `used` in the same object beats a second endpoint
 * that would have to be kept in step with this one.
 *
 * **`limit: null` is unlimited, and the field's absence is not.** Absence
 * already means ungated — a key the settings don't mention is a feature nobody
 * decided to charge for, and the client allows it. Unlimited has to be said out
 * loud or the UI cannot print the word for the tier that paid for it.
 *
 * **Unknown keys are ignored, missing keys are allowed.** The tier list is
 * edited by hand and will grow keys before a deployed client hears of them.
 *
 * ### The half that does not live here
 *
 * Downgrades suspend rather than delete, and **the server chooses what gets
 * suspended** — one of two campaigns under a limit of one. That verdict belongs
 * on the resource (a `suspended` flag on the campaign), not in this payload: a
 * client that instead counted campaigns against the limit would pick its own
 * victim, a different one from the server's and possibly a different one per
 * tab. See `Suspension` in `types/entitlements.ts`.
 */

type ScheduledChangeBody = {
  id: string
  name: string
  effective_from: string
  direction: 'upgrade' | 'downgrade'
}

export type EntitlementBody = {
  allowed?: boolean
  limit?: number | null
  used?: number
  period?: string | null
  resets_at?: string | null
}

export type PlanBody = {
  tier: {
    id: string
    name: string
    effective_from: string
    billing_period?: 'month' | 'year' | null
    renews_at?: string | null
    scheduled_change?: ScheduledChangeBody | null
  }
  entitlements?: Record<string, EntitlementBody> | null
}

function scheduledFromWire(body: ScheduledChangeBody): ScheduledTierChange {
  return {
    id: body.id,
    name: body.name,
    effectiveFrom: body.effective_from,
    direction: body.direction,
  }
}

function tierFromWire(body: PlanBody['tier']): TierSnapshot {
  return {
    id: body.id,
    name: body.name,
    effectiveFrom: body.effective_from,
    // Both absent on a free tier, and absent is the answer rather than a
    // default: there is no such thing as a neutral billing period, and a
    // renewal date invented for a plan nobody pays for would be printed.
    billingPeriod: body.billing_period ?? null,
    renewsAt: body.renews_at ?? null,
    scheduled: body.scheduled_change
      ? scheduledFromWire(body.scheduled_change)
      : null,
  }
}

/**
 * Camel-cases one entry and keeps `undefined` meaning *unsaid*.
 *
 * The distinction is load-bearing on both fields: an absent `allowed` is a
 * metered key stating a limit rather than a verdict, and an absent `limit` is
 * an unmetered one — while `limit: null` is unlimited. Defaulting either to a
 * value here would erase the difference before `resolveEntitlement` sees it.
 */
export function entitlementFromWire(body: EntitlementBody): RawEntitlement {
  const entry: RawEntitlement = {}
  if (body.allowed !== undefined) entry.allowed = body.allowed
  if (body.limit !== undefined) entry.limit = body.limit
  if (body.used !== undefined) entry.used = body.used
  if (body.period !== undefined) entry.period = usagePeriod(body.period)
  if (body.resets_at !== undefined) entry.resetsAt = body.resets_at
  return entry
}

export function planFromWire(body: PlanBody): WorkspacePlan {
  const entitlements: Record<string, RawEntitlement> = {}
  for (const [key, value] of Object.entries(body.entitlements ?? {})) {
    entitlements[key] = entitlementFromWire(value)
  }
  return { tier: tierFromWire(body.tier), entitlements }
}

/**
 * The request itself, kept as its own function so the contract above stays
 * asserted while the stub is standing in for it (`entitlements.test.ts` drives
 * this one). Without the split, switching the app onto the stub would quietly
 * stop testing the shape we are asking the back end for — which is the one
 * thing this file exists to hold still.
 */
export function fetchWorkspacePlan(): Promise<WorkspacePlan> {
  return apiJson<PlanBody>(
    '/api/entitlements',
    'Unable to read your plan',
  ).then(planFromWire)
}

/**
 * The `STUBBED` branch is scaffolding: `tiers.stub.ts` answers this off a JSON
 * seed and `localStorage` so the plan screen can drive the gating before the
 * endpoint exists. It returns the same wire body and goes through the same
 * parser, so the only thing the real endpoint changes is which branch runs.
 * See `tiers.stub.ts`.
 */
export function getWorkspacePlan(): Promise<WorkspacePlan> {
  return STUBBED ? stubWorkspacePlan().then(planFromWire) : fetchWorkspacePlan()
}
