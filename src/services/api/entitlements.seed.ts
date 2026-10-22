import seed from './entitlements.seed.json'

/**
 * A verbatim copy of the server's feature catalog (CON-243).
 *
 * `catalog` holds the same fifteen entries the server sends — same keys, same
 * `value_type` and `reset` words — lifted out of a live
 * `GET /api/public/pricing` rather than transcribed. It earns its place by being
 * testable: `entitlements.seed.test.ts` asserts that every `EntitlementKey` this
 * build asks about exists in it with the type the client assumes, so a key
 * renamed on the server fails a test here instead of silently resolving to
 * *ungated* on every screen. That failure mode is the one worth paying for —
 * under the default-allow rule a stale key does not throw, it quietly unlocks
 * the feature it was supposed to gate.
 *
 * Re-sync it by re-reading the endpoint, not by hand. It mirrors
 * `src/domain/entitlements/catalog.json` in the Go repo, which is the authority.
 *
 * It used to hold invented usage counters too, laid over the tier stub so the
 * meters could be looked at. The plan read carries the real tally (`current`)
 * since CON-325, and the stub is gone, so they went with it.
 */

type SeedCatalogEntry = {
  key: string
  name: string
  category: string
  linear_issue: string
  status: string
  value_type: string
  is_material: boolean
  reset?: string
  description: string
}

export const SEED_CATALOG: readonly SeedCatalogEntry[] = seed.catalog
