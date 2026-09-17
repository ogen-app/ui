import type { TFunction } from 'i18next'

import type {
  EntitlementKey,
  RawEntitlement,
  UsageReset,
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
 *
 * **`assistant_multiplier` is left out deliberately.** It is a real entitlement
 * and the app may ask about it, but the catalog's own description ends "never a
 * published number" — the allowance behind the Post Assistant is a token budget
 * priced off current model rates, and printing ×1 / ×5 / ×20 on a price list
 * would commit us to a figure that moves with what the models cost. It is the
 * one key whose *value* is not ours to show.
 */
export const TIER_FEATURE_ORDER = [
  'team_seats',
  'workspaces',
  'connected_accounts',
  'multiple_accounts_per_platform',
  'active_campaigns',
  'all_campaign_types',
  'custom_campaign_types',
  'plan_runs_per_month',
  'quality_reviews_per_post',
  'posts_total',
  'content_bank_assets',
  'web_page_imports',
  'media_storage_bytes',
] as const satisfies readonly EntitlementKey[]

/**
 * The keys that have a row, which is narrower than every key the app can ask
 * about.
 *
 * Narrower on purpose, and it is what makes the omission above safe rather than
 * merely allowed: the catalogue needs a heading for each of *these* and not for
 * every entitlement, so leaving `assistant_multiplier` off the table does not
 * oblige anybody to write a label for a number we have decided never to print.
 */
export type TierFeatureKey = (typeof TIER_FEATURE_ORDER)[number]

/**
 * Whether a key the server named is one this build has a heading for.
 *
 * The question is asked wherever a feature arrives from outside the price list
 * — a refusal, a near-limit warning — because those carry whichever key the
 * catalog holds, including `assistant_multiplier` and anything added since this
 * build. A key with no name here is not an error: the caller says less rather
 * than printing `plan_runs_per_month` at somebody.
 */
export function isTierFeatureKey(value: unknown): value is TierFeatureKey {
  return TIER_FEATURE_ORDER.includes(value as TierFeatureKey)
}

/**
 * What a feature is called on screen, in the app's language.
 *
 * One lookup rather than a template literal at each call site, so the price
 * list, a lock and a notification cannot drift into calling the same allowance
 * three things.
 */
export function featureLabel(t: TFunction, key: TierFeatureKey): string {
  return t(`tiers.features.${key}` as const)
}

/** Keys whose numbers are byte sizes, not tallies. */
const BYTE_KEYS: readonly TierFeatureKey[] = ['media_storage_bytes']

export function isByteKey(key: TierFeatureKey): boolean {
  return BYTE_KEYS.includes(key)
}

export type TierFeatureValue =
  | { kind: 'included' }
  | { kind: 'excluded' }
  | { kind: 'unlimited' }
  | { kind: 'limit'; limit: number; reset: UsageReset | null }

export type TierFeature = {
  key: TierFeatureKey
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
  return { kind: 'limit', limit: entry.limit, reset: entry.reset ?? null }
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
