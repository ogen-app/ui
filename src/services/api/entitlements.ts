import { apiJson } from './http'
import { usageReset } from '@/lib/entitlements'
import type {
  CatalogEntry,
  PlanBilling,
  RawEntitlement,
  ScheduledTierChange,
  TierSnapshot,
  TierVersion,
  TierVersionPrice,
  WorkspacePlan,
} from '@/types/entitlements'

/**
 * The workspace's tier version and what it allows (CON-232, CON-243).
 *
 * **This endpoint exists and is deployed** — on the local API and on
 * `api.dev.getogen.com`. What follows is the contract as *observed*, not as
 * proposed: the file previously described a `GET /api/entitlements` that was
 * invented here and that the server answers 404 for. CON-243 shipped something
 * differently shaped, and this is it.
 *
 * ## The contract
 *
 *     GET /api/me/entitlements
 *
 * Flat and workspace-scoped, like `/api/tenants/current` and `/api/users`: it
 * takes no workspace id and answers for whichever workspace the request's
 * `X-Workspace-Id` names (CON-147). Every member can read it — knowing what the
 * workspace has bought is not owner-only, since it is the thing that explains
 * why a button is locked.
 *
 *     200 {
 *       "tier_id": "pro",
 *       "version_id": "ttv-pro-v1",
 *       "version": 1,
 *       "status": "active",
 *       "purchasable": true,
 *       "change_reason": "Initial published version.",
 *       "prices": [
 *         {"id": "ttvp-pro-v1-usd-m", "currency": "USD",
 *          "billing_interval": "month", "net_minor": 4900}
 *       ],
 *       "entitlements": [
 *         {"key": "team_seats", "name": "Team seats & invitations",
 *          "category": "workspace_team", "linear_issue": "CON-26",
 *          "status": "live", "value_type": "numeric", "is_material": true,
 *          "reset": "standing", "description": "Owner / member roles, email invites.",
 *          "value": 5, "current": 2}
 *       ],
 *       "billing_required": false,
 *       "trial_eligible": false,
 *       "billing_period": "month",
 *       "renews_at": "2026-11-21T00:00:00Z",
 *       "trial_ends_at": null,
 *       "scheduled_change": null
 *     }
 *
 * ### What each part holds, and what it does not
 *
 * **It answers with a tier *version*, and that is the whole design.** CON-243
 * made a tier's price and entitlement set an immutable versioned artifact, and a
 * workspace is bound to one of them over a time range. `version_id` names the
 * artifact, `tier_id` names the tier it belongs to; the client treats both as
 * opaque and ranks neither.
 *
 * **Entitlements are an array of catalog entries, not a map of verdicts.** Each
 * carries the feature's own metadata — name, description, category,
 * `is_material` — alongside the one thing that varies by tier, `value`. That is
 * more than this client asked for and it is worth having: it is what lets a
 * comparison table render a feature the build has never heard of.
 *
 * **`value` is typed by `value_type`.** `boolean` is a verdict, `numeric` is an
 * allowance, and **`null` on a numeric is unlimited**. A key absent from the
 * array is ungated, which is a third thing again — the distinction the whole
 * seam rests on, and the server keeps it.
 *
 * **`reset` is the catalog's word, not a billing period**: `standing` for a
 * ceiling that never refills, `monthly`, `total` for a lifetime cap (Trial's 15
 * posts), `per_post`. Narrowed by `usageReset`, because the catalog is edited
 * server-side and will grow a word before a deployed client hears of it.
 *
 * **`current` is the tally, and absent means uncounted.** Each numeric entry
 * whose counter the server has registered carries how much is in use; the
 * others omit it. Omitted is not zero — "0 of 5" is a claim nobody made — so it
 * parses to `used: null` and an uncounted limit can never deny.
 *
 * **The billing half rides along since CON-325**, additively: the gate
 * (`billing_required`), whether the caller's account can still have the free
 * month (`trial_eligible`), and the live subscription's period, renewal, trial
 * end and any scheduled change. All of it is `null` (or `false`) for a
 * workspace with no live subscription, and with billing off. There is still no
 * display name for the tier and no start date: `name` is derived from the slug
 * below, and `effectiveFrom` stays `null`.
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

type PriceBody = {
  id?: string | null
  currency: string
  billing_interval: 'month' | 'year'
  net_minor: number
  country_code?: string | null
  /** Only on the price list (CON-325). */
  available?: boolean | null
}

export type EntitlementBody = {
  key: string
  name?: string
  category?: string
  linear_issue?: string
  status?: string
  value_type?: string
  is_material?: boolean
  reset?: string | null
  description?: string
  value?: number | boolean | null
  /** The tally, on a numeric entry whose counter the server registered. */
  current?: number | null
}

/**
 * One tier version as the server sends it — the body of the plan read, and also
 * one row of `GET /api/public/pricing`.
 *
 * The two endpoints send the identical shape, which is not a coincidence: a
 * version is one immutable artifact and both reads hand back the same record.
 * Hence one wire type and one parser, used from `tiers.ts` as well as here. A
 * second copy of this shape is a second thing to keep in step with the server.
 */
export type TierVersionBody = {
  tier_id: string
  version_id: string
  version?: number
  status?: string
  purchasable?: boolean
  change_reason?: string | null
  prices?: PriceBody[] | null
  entitlements?: EntitlementBody[] | null
}

type ScheduledChangeBody = {
  tier_id: string
  version_id: string
  effective_at: string
  direction: string
}

/**
 * The plan read: a version, plus the workspace's billing facts (CON-325).
 * Every billing field is optional on the wire — a server without billing
 * wired sends none of them, and that has to read as "no subscription, no
 * gate", not as a parse failure.
 */
export type PlanBody = TierVersionBody & {
  billing_required?: boolean | null
  trial_eligible?: boolean | null
  billing_period?: string | null
  renews_at?: string | null
  trial_ends_at?: string | null
  scheduled_change?: ScheduledChangeBody | null
}

/**
 * A readable name for a tier the server did not name.
 *
 * Derived rather than looked up in a table, on purpose: a table of tier names
 * held on the client is editorial copy that can go stale against the tier list
 * and then disagree with the invoice. A title-cased slug cannot — it is wrong
 * only in the way the slug is wrong, and it disappears entirely the day the
 * payload carries a real one.
 */
function nameFromSlug(tierId: string): string {
  return tierId
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function priceFromWire(body: PriceBody): TierVersionPrice {
  return {
    id: body.id ?? null,
    amount: body.net_minor,
    currency: body.currency,
    interval: body.billing_interval,
    countryCode: body.country_code ?? null,
    // Only the price list states it. Anywhere else the row is a price somebody
    // holds, and there is nothing to withhold.
    available: body.available !== false,
  }
}

/**
 * The version itself — the half both reads share.
 *
 * Exported because `tiers.ts` parses the same rows off `/api/public/pricing`.
 * What each caller wraps around it differs; what a version *is* does not, and
 * deriving the name in two places is how two screens end up calling one tier two
 * things.
 */
export function versionFromWire(body: TierVersionBody): TierVersion {
  return {
    id: body.version_id,
    tierId: body.tier_id,
    name: nameFromSlug(body.tier_id),
    purchasable: body.purchasable === true,
    changeReason: body.change_reason ?? '',
    prices: (body.prices ?? []).map(priceFromWire),
  }
}

function periodFromWire(value: string | null | undefined) {
  return value === 'month' || value === 'year' ? value : null
}

/**
 * A pending change, or `null` for one this build cannot state.
 *
 * `direction` is the server's ranking, and it is the only one: a value it has
 * not heard of drops the whole change rather than guessing which way it goes,
 * because "you move to Starter" and "Pro starts" are opposite warnings.
 */
function scheduledFromWire(
  body: ScheduledChangeBody | null | undefined,
): ScheduledTierChange | null {
  if (!body?.tier_id || !body.effective_at) return null
  if (body.direction !== 'upgrade' && body.direction !== 'downgrade') {
    return null
  }
  return {
    id: body.version_id,
    tierId: body.tier_id,
    name: nameFromSlug(body.tier_id),
    effectiveFrom: body.effective_at,
    direction: body.direction,
  }
}

function snapshotFromWire(body: PlanBody): TierSnapshot {
  return {
    ...versionFromWire(body),
    // Still not on any read: the start date lives on the assignment, which is
    // server-side. Null rather than a default — a day invented here would be
    // printed as though somebody had looked it up.
    effectiveFrom: null,
    billingPeriod: periodFromWire(body.billing_period),
    renewsAt: body.renews_at ?? null,
    trialEndsAt: body.trial_ends_at ?? null,
    scheduled: scheduledFromWire(body.scheduled_change),
  }
}

function billingFromWire(body: PlanBody): PlanBilling {
  return {
    required: body.billing_required === true,
    trialEligible:
      typeof body.trial_eligible === 'boolean' ? body.trial_eligible : null,
  }
}

function catalogFromWire(body: EntitlementBody): CatalogEntry | undefined {
  if (body.name === undefined) return undefined
  return {
    name: body.name,
    description: body.description ?? '',
    category: body.category ?? '',
    isMaterial: body.is_material === true,
  }
}

/**
 * One catalog entry as an allowance, keeping every absence meaning *unsaid*.
 *
 * The three kinds of absence the seam rests on all survive this: a key missing
 * from the array never reaches here at all (ungated), a `boolean` entry states
 * `allowed` and no `limit` (unmetered), and `limit: null` is unlimited. `used`
 * is the server's `current` when it sent one and `null` when it did not —
 * never left off, because the key *is* metered, and never defaulted to zero,
 * because an omitted tally is one nobody took.
 */
export function entitlementFromWire(body: EntitlementBody): RawEntitlement {
  const entry: RawEntitlement = {}
  const catalog = catalogFromWire(body)
  if (catalog) entry.catalog = catalog

  if (body.value_type === 'boolean') {
    // A verdict, with nothing to meter. An unset value reads as granted, the
    // same way an absent key does — this file never narrows towards denial.
    entry.allowed = body.value !== false
    return entry
  }

  // Numeric, or a `value_type` this build has not heard of that still sent a
  // number. Anything else is metadata about a feature with no allowance stated,
  // which is ungated and says so by carrying neither field.
  if (typeof body.value === 'number' || body.value === null) {
    entry.limit = body.value
    entry.used =
      typeof body.current === 'number' && Number.isFinite(body.current)
        ? body.current
        : null
    entry.reset = usageReset(body.reset)
    entry.resetsAt = null
  }
  return entry
}

/**
 * The array as a map, keyed the server's way.
 *
 * Exported alongside `versionFromWire` for the same reason: the pricing list's
 * rows carry the identical array, and a key dropped or renamed on the way in is
 * a gate that silently stops gating.
 */
export function entitlementsFromWire(
  body: TierVersionBody,
): Record<string, RawEntitlement> {
  const entitlements: Record<string, RawEntitlement> = {}
  for (const entry of body.entitlements ?? []) {
    if (entry.key) entitlements[entry.key] = entitlementFromWire(entry)
  }
  return entitlements
}

export function planFromWire(body: PlanBody): WorkspacePlan {
  return {
    tier: snapshotFromWire(body),
    billing: billingFromWire(body),
    entitlements: entitlementsFromWire(body),
  }
}

/** The plan the app reads — tier, allowances with their tallies, and billing. */
export function getWorkspacePlan(): Promise<WorkspacePlan> {
  return apiJson<PlanBody>(
    '/api/me/entitlements',
    'Unable to read your plan',
  ).then(planFromWire)
}
