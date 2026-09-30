import { apiJson } from './http'
import { withSeededUsage } from './entitlements.seed'
import { STUBBED, stubWorkspacePlan } from './tiers.stub'
import { usageReset } from '@/lib/entitlements'
import type {
  CatalogEntry,
  RawEntitlement,
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
 *       "tier_id": "trial",
 *       "version_id": "ttv-trial-v1",
 *       "version": 1,
 *       "status": "active",
 *       "purchasable": true,
 *       "change_reason": "Initial published version.",
 *       "prices": [
 *         {"currency": "EUR", "billing_interval": "month", "net_minor": 0}
 *       ],
 *       "entitlements": [
 *         {"key": "team_seats", "name": "Team seats & invitations",
 *          "category": "workspace_team", "linear_issue": "CON-26",
 *          "status": "live", "value_type": "numeric", "is_material": true,
 *          "reset": "standing", "description": "Owner / member roles, email invites.",
 *          "value": 1}
 *       ]
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
 * **There are no counters, and that is the gap that matters.** Nothing on the
 * API reports what a workspace has *used* — CON-243 has a usage read as
 * explicitly future — so a limit arrives with nothing to measure it against.
 * `entitlements.seed.ts` supplies held-still ones to the *stub* meanwhile —
 * never to this read, whose limits are real and must not be denied on an
 * invented tally; `Usage.used` is `number | null` so the day the usage read
 * lands, nothing changes but the parse.
 *
 * **There is no name, no start date, and no scheduled change.** The payload
 * carries no display name for the tier (raised on CON-243; Serhii offered to
 * add one), no `effective_from` — the date lives in `tenant_tier_assignments`,
 * which this read does not expose — and no pending-change state, because a
 * version is assigned by an operator through Harbor rather than announced in
 * advance. `name` is derived from the slug below; the other two are `null`.
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
  currency: string
  billing_interval: 'month' | 'year'
  net_minor: number
  country_code?: string | null
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
    amount: body.net_minor,
    currency: body.currency,
    interval: body.billing_interval,
    countryCode: body.country_code ?? null,
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

function snapshotFromWire(body: TierVersionBody): TierSnapshot {
  return {
    ...versionFromWire(body),
    // The four the payload does not carry. Null rather than a default: there is
    // no neutral billing period, and a start date or a renewal invented here
    // would be printed as though somebody had looked it up.
    effectiveFrom: null,
    billingPeriod: null,
    renewsAt: null,
    scheduled: null,
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
 * is set to `null` rather than left off — the key *is* metered, it has simply
 * never been counted, and those are different facts.
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
    entry.used = null
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

export function planFromWire(body: TierVersionBody): WorkspacePlan {
  return {
    tier: snapshotFromWire(body),
    entitlements: entitlementsFromWire(body),
  }
}

/**
 * The request itself, kept as its own function so the contract above stays
 * asserted while the stub is standing in for it (`entitlements.test.ts` drives
 * this one). Without the split, switching the app onto the stub would quietly
 * stop testing the shape the server actually sends — which is the one thing
 * this file exists to hold still.
 *
 * It returns the payload as it arrives, counters and all — which is to say
 * without any, and `getWorkspacePlan` passes it on that way: the seeded
 * counters are the stub's, so that neither a test of this function nor a real
 * workspace can be told something the endpoint never said.
 */
export function fetchWorkspacePlan(): Promise<WorkspacePlan> {
  return apiJson<TierVersionBody>(
    '/api/me/entitlements',
    'Unable to read your plan',
  ).then(planFromWire)
}

/**
 * The plan the app reads.
 *
 * `STUBBED` points the call at `tiers.stub.ts`, which answers a whole tier
 * matrix off a JSON seed so the plan screen can be driven before there is any
 * way to *change* tier — there is no plan-selection endpoint, only Harbor.
 *
 * **The seeded counters ride on the stub and never on the server's answer.**
 * `withSeededUsage` invents a tally so the meters and the denied-by-limit branch
 * can be looked at; put on a real plan, it would tell a real trial workspace
 * with a campaign cap of three that it is full, and sell it an upgrade with no
 * refusal behind it. The real read stays uncounted until the usage read lands,
 * and an uncounted limit cannot deny. See `entitlements.seed.ts`.
 */
export function getWorkspacePlan(): Promise<WorkspacePlan> {
  return STUBBED
    ? stubWorkspacePlan().then(withSeededUsage)
    : fetchWorkspacePlan()
}
