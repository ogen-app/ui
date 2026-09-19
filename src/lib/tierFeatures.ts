import type {
  EntitlementKey,
  RawEntitlement,
  UsagePeriod,
} from '@/types/entitlements'
import type { Tier } from '@/types/tiers'

/**
 * Turning a tier's allowances into the lines a comparison table is made of.
 *
 * Pure and keyless-of-copy on purpose: this decides *what each tier says about
 * a feature*, and the component decides how to word it. The two are separated
 * because the wording is translated and this isn't — and because "is 3 versions
 * a limit or an exclusion?" is a question with one right answer that should not
 * be re-derived inside JSX.
 */

/**
 * The order the features are read in, and the only place that order lives.
 *
 * Grouped by what a reader is comparing rather than by the shape of the value:
 * who can use it, what they can point it at, what the AI will do, what the
 * brand section holds, then storage. A table sorted by "booleans first" would
 * be tidier and would answer nobody's question.
 *
 * Typed as `EntitlementKey[]`, so a key added to the union without a line here
 * is a silent omission rather than a compile error — which is the right way
 * round. Not every entitlement is worth a row on a price list, and a tier list
 * that grows a key the client has never heard of must not break this screen.
 */
export const TIER_FEATURE_ORDER: readonly EntitlementKey[] = [
  'seats',
  'social_accounts',
  'multiple_accounts_per_platform',
  'campaigns',
  'custom_campaign_types',
  'content_plan_runs',
  'post_assistant',
  'post_quality_reviews',
  'post_versions',
  'brand_personas',
  'brand_voices',
  'media_storage_bytes',
]

/** Keys whose numbers are byte sizes, not tallies. */
const BYTE_KEYS: readonly EntitlementKey[] = ['media_storage_bytes']

export function isByteKey(key: EntitlementKey): boolean {
  return BYTE_KEYS.includes(key)
}

export type TierFeatureValue =
  | { kind: 'included' }
  | { kind: 'excluded' }
  | { kind: 'unlimited' }
  | { kind: 'limit'; limit: number; period: UsagePeriod | null }

export type TierFeature = {
  key: EntitlementKey
  value: TierFeatureValue
}

/**
 * What one tier says about one feature.
 *
 * The three absences mean what they mean everywhere else in this seam, and the
 * first is the one worth stating: **a key the tier does not mention is
 * included**, because a feature the tier list is silent about is one nobody
 * decided to charge for. That is the same rule `resolveEntitlement` applies, and
 * it has to be the same rule — a price list promising less than the app allows
 * is a worse bug than the reverse.
 */
export function featureValue(
  entry: RawEntitlement | undefined,
): TierFeatureValue {
  if (!entry) return { kind: 'included' }
  if (entry.allowed === false) return { kind: 'excluded' }
  // Allowed, with nothing metered against it: a plain yes.
  if (entry.limit === undefined) return { kind: 'included' }
  if (entry.limit === null) return { kind: 'unlimited' }
  return { kind: 'limit', limit: entry.limit, period: entry.period ?? null }
}

export function tierFeatures(tier: Tier): TierFeature[] {
  return TIER_FEATURE_ORDER.map((key) => ({
    key,
    value: featureValue(tier.entitlements[key]),
  }))
}

/**
 * A byte size in whole units — "100 MB", "10 GB".
 *
 * Its own rather than `assetStatus`'s or `platformMedia`'s: both of those stop
 * at MB, which would print a tier's ten gigabytes as "10240 MB". The digits go
 * through the caller's formatter so they group in the app's language; the unit
 * does not, because MB and GB are not translated.
 */
export function formatStorage(
  bytes: number,
  format: (value: number) => string,
): string {
  const GB = 1024 * 1024 * 1024
  const MB = 1024 * 1024
  if (bytes >= GB) return `${format(round(bytes / GB))} GB`
  if (bytes >= MB) return `${format(round(bytes / MB))} MB`
  return `${format(round(bytes / 1024))} KB`
}

/** One decimal at most — a tier's allowance is a round number or nearly one. */
function round(value: number): number {
  return Math.round(value * 10) / 10
}
