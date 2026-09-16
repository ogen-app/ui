import type { RawEntitlement, TierVersion } from './entitlements'

/**
 * The tiers a workspace can move onto — the catalogue, as opposed to the one
 * version it holds (`WorkspacePlan` in `types/entitlements.ts`).
 *
 * Two different questions, and they stay two types even though they are now one
 * shape on the wire. "What does this workspace allow?" is asked on every gated
 * screen and has to be cheap; "what could it be on instead?" is asked on one
 * screen and only when someone opens it. Folding the second into the first would
 * put the whole price list behind every lock icon in the app.
 */

/**
 * One row of `GET /api/public/pricing`: a tier version, plus what it grants.
 *
 * Everything about the version itself — its ids, its name, its price rows — is
 * `TierVersion`, shared with the plan read, because the server sends one
 * artifact and there is no honest way to hold two types for it. What this adds
 * is the allowances, which the plan read also carries; what it lacks is the
 * subscription half, which only a *held* version has.
 *
 * Two fields this used to have and the endpoint does not send:
 *
 * - **`tagline`.** There is no per-tier line of copy anywhere in the catalog, so
 *   the card omits it rather than keeping a table of taglines keyed on a tier
 *   slug — one that would be blank for the first tier somebody publishes without
 *   telling this build. `changeReason` is the only prose on a version and it is
 *   not a tagline; it is why the version exists.
 * - **`effectiveFrom`.** A version's dates live on the assignment that binds a
 *   workspace to it, and the public list has no workspace to speak of.
 */
export type Tier = TierVersion & {
  /**
   * Keyed and shaped exactly like `WorkspacePlan.entitlements`, and parsed by
   * the same function.
   *
   * One consequence of sharing that parse: a metered key arrives carrying
   * `used: null`. On a plan that means *not counted yet*; here it means there is
   * nothing to count, a tier having allowances and only a workspace having a
   * tally. Both readings are "no number", which is why nothing on a plan card
   * reads the field.
   */
  entitlements: Record<string, RawEntitlement>
}
