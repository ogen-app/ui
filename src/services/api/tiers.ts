import { apiJson } from './http'
import {
  entitlementsFromWire,
  planFromWire,
  versionFromWire,
  type TierVersionBody,
} from './entitlements'
import { STUBBED, stubListTiers, stubSelectTier } from './tiers.stub'
import type { WorkspacePlan } from '@/types/entitlements'
import type { Tier } from '@/types/tiers'

/**
 * The tiers on offer, and moving a workspace onto one (CON-232, CON-243).
 *
 * The first of those is live. The second has no endpoint at all, and may never
 * have one in this shape.
 *
 * ## The list — `GET /api/public/pricing`
 *
 * **Unauthenticated, CDN-cacheable, and not about any workspace.** It carries no
 * session and must carry no `X-Workspace-Id` (see `isAccountScoped` in
 * `base.ts`): it is the same list a logged-out visitor reads on the marketing
 * site, which is what lets it be cached at the edge for everyone at once.
 *
 *     200 { "tiers": [ …tier version… ] }
 *
 * Each row is exactly the body `GET /api/me/entitlements` answers with — one
 * immutable version, its price rows in minor units, and its entitlements as
 * catalog entries. So this file holds no wire types and no parser of its own; it
 * calls `entitlements.ts`'s, which is the only way the price list and the lock
 * on a button can be guaranteed to mean the same thing by a limit.
 *
 * **It publishes only what is purchasable**, and that is the one thing to design
 * around. A superseded version somebody is grandfathered onto is not in it, and
 * neither is the internal `default` tier every workspace sits on today — so the
 * plan screen renders the tier in force from `WorkspacePlan` and never by
 * looking its id up here. A lookup that missed would blank out the name of the
 * plan somebody is paying for. What the screen does with this list is compare
 * against it, and notice when the held version is absent.
 *
 * **Today it publishes one tier**: `trial` v1, at €0/month. Pro and Max have no
 * published version, which is the other half of why the stub is still switched
 * on — a plan screen with one card on it cannot be looked at.
 *
 * **The rows are editorial data, and they are not translated.** The catalog
 * ships each feature's name and description in one language, and that is a real
 * gap the day a second language ships. It belongs to whoever edits the catalog:
 * the client cannot put server copy in a catalogue.
 *
 * ## The change — nothing
 *
 * `POST /api/workspace/plan` was invented here and has no counterpart. A
 * workspace's version is assigned by an operator through Harbor's gRPC
 * `PlanAdminService` (CON-294); there is no self-serve plan change on the API and
 * no payment provider behind one. `tiers.stub.ts` is what stands in, and it is
 * the reason CHANGE PLAN works at all — picking a tier there re-answers every
 * `useEntitlement` in the app, which is how the gating gets looked at before any
 * of this can be bought.
 *
 * The rules that endpoint would have to implement, if it is ever written as one,
 * are asserted in `tiers.stub.test.ts` rather than described here.
 */

type TiersBody = { tiers?: TierVersionBody[] | null }

export function tierFromWire(body: TierVersionBody): Tier {
  return { ...versionFromWire(body), entitlements: entitlementsFromWire(body) }
}

/**
 * The request itself, split from `listTiers` for the same reason
 * `fetchWorkspacePlan` is split from `getWorkspacePlan`: the contract stays
 * asserted against the shape the server actually sends, even while the app is
 * reading the stub. Without the split, switching the screen onto the stub would
 * quietly stop testing the endpoint.
 */
export function fetchTiers(): Promise<Tier[]> {
  return apiJson<TiersBody>(
    '/api/public/pricing',
    'Unable to load the plans',
  ).then((payload) => (payload.tiers ?? []).map(tierFromWire))
}

export function listTiers(): Promise<Tier[]> {
  return STUBBED ? stubListTiers() : fetchTiers()
}

/**
 * Moves the workspace onto a tier, and answers with the plan that results.
 *
 * The path below is a guess at an endpoint nobody has written — kept only so
 * that wiring one is a `STUBBED` flip rather than a new call site. It 404s.
 */
export function selectTier(tierId: string): Promise<WorkspacePlan> {
  if (STUBBED) return stubSelectTier(tierId)
  return apiJson<TierVersionBody>(
    '/api/workspace/plan',
    'Unable to change your plan',
    { method: 'POST', body: { tier_id: tierId } },
  ).then(planFromWire)
}
