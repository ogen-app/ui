import seed from './entitlements.seed.json'
import type { RawEntitlement, WorkspacePlan } from '@/types/entitlements'

/**
 * The counters `GET /api/me/entitlements` does not send yet (CON-243).
 *
 * **The limits are real; only the tally is invented here.** The endpoint ships
 * a tier's full allowance set — `team_seats: 3`, `posts_total: 15`,
 * `media_storage_bytes: null` — but there is no "N of M used" read anywhere on
 * the API, and Serhii has it as explicitly future. So a limit arrives with
 * nothing to measure it against, and every surface that would say "3 of 5" can
 * only say "5".
 *
 * That gap is what this file fills, and the reason it fills it rather than
 * waiting: the meters, the near-limit wording and `resolveEntitlement`'s
 * denied-by-limit branch are the half of the seam that is hardest to get right
 * from a description, and none of them can be looked at without numbers. The
 * counters below are held still on purpose — counting the real campaigns and
 * assets would make every tier read the same, and the point is the *gating*.
 * They are chosen to straddle the decided tiers, so switching tier flips real
 * surfaces between allowed, denied-by-limit and denied-by-tier.
 *
 * ## Why the catalog is copied in too
 *
 * `catalog` is a **verbatim** copy of what the server sends — the same fifteen
 * entries, same keys, same `value_type` and `reset` words, lifted out of a live
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
 * **Delete this file when the usage read lands.** Nothing else has to change:
 * `used` arrives on the wire, `withSeededUsage` stops being called, and the
 * parser already carries a counter through when it is given one.
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

const SEED_USAGE: Readonly<Record<string, number>> = seed.used

/**
 * Merges the held-still counters into a plan the server answered.
 *
 * Applied by `getWorkspacePlan` to the **stub's** answer only. On the real
 * read an invented tally is not scaffolding but a false refusal — a trial
 * workspace with a campaign cap of three would be told it is full — and it
 * would also make the contract test agree with something the endpoint never
 * said.
 *
 * Only metered entries are touched. A boolean entitlement is a verdict with
 * nothing to count against it, and `0 of ∞` under *Multiple accounts per
 * platform* is a meter on a screen that has nothing to measure.
 */
export function withSeededUsage(plan: WorkspacePlan): WorkspacePlan {
  const entitlements: Record<string, RawEntitlement> = {}
  for (const [key, entry] of Object.entries(plan.entitlements)) {
    const metered =
      entry.limit !== undefined &&
      // Only where the server said nothing. It sends no tally today, so this
      // reads as always-true — and that is exactly why the condition is here
      // rather than in the commit that deletes the file. A seed that overwrote
      // a real counter would not fail a test or look wrong on screen; it would
      // quietly report yesterday's number under a meter somebody is reading to
      // decide whether to pay, and it would do it on the deploy that finally
      // made the number real.
      entry.used == null &&
      key in SEED_USAGE
    entitlements[key] = metered ? { ...entry, used: SEED_USAGE[key] } : entry
  }
  return { ...plan, entitlements }
}
