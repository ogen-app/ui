import {
  TIER_FEATURE_ORDER,
  featureValue,
  isTierFeatureKey,
  type TierFeature,
  type TierFeatureValue,
} from '@/lib/tierFeatures'
import type {
  EntitlementKey,
  RawEntitlement,
  TierVersionPrice,
} from '@/types/entitlements'
import type { Tier } from '@/types/tiers'

/**
 * What the upgrade dialog offers somebody a plan has just stopped (CON-232).
 *
 * Pure, so the three decisions the dialog rests on — *which* plan, *which*
 * benefits, *which* prices — are tested rather than re-derived in JSX, and so
 * the design harness can feed them fixtures the stub cannot price.
 */

/**
 * How much of a feature a value grants, as one comparable number.
 *
 * `included` ranks with `unlimited` because that is what it means for a key the
 * tier does not meter: a capability that is simply on. An exclusion is below
 * every allowance, including a limit of zero, so "off" never beats "0".
 */
export function grant(value: TierFeatureValue): number {
  switch (value.kind) {
    case 'excluded':
      return -1
    case 'limit':
      return value.limit
    case 'unlimited':
    case 'included':
      return Number.POSITIVE_INFINITY
  }
}

function beats(
  offered: RawEntitlement | undefined,
  held: RawEntitlement | undefined,
): boolean {
  return grant(featureValue(offered)) > grant(featureValue(held))
}

/**
 * The one plan the dialog puts forward: the cheapest purchasable plan that
 * grants more of the refused feature than the workspace holds.
 *
 * **The server may take this over.** Harbor is expected to name a recommended
 * plan per tier; when it does, its answer replaces this function's and nothing
 * else in the dialog moves. Until then the rule is ours, and it is the one a
 * salesperson would give — the smallest step that actually clears the wall.
 *
 * "Cheapest" is the monthly default price, compared only within one currency
 * (the client has no exchange rates). An unpriced plan — `prices: []`, which is
 * "nobody has decided" — sorts after every priced one, and ties fall back to
 * the smaller grant of the refused feature and then to wire order, so an
 * unpriced catalogue still offers the nearest step up rather than the biggest.
 *
 * Null when nothing on sale beats what the workspace has: the top plan, or a
 * refusal about a key no tier grants more of. The dialog then sends people to
 * the comparison rather than inventing an offer.
 */
export function recommendedTier(
  feature: EntitlementKey,
  held: Record<string, RawEntitlement>,
  tiers: readonly Tier[],
): Tier | null {
  const candidates = tiers
    .map((tier, order) => ({ tier, order }))
    .filter(
      ({ tier }) =>
        tier.purchasable && beats(tier.entitlements[feature], held[feature]),
    )
  if (candidates.length === 0) return null

  const monthly = monthlyIn(candidates.map(({ tier }) => tier))
  candidates.sort((a, b) => {
    const pa = monthly(a.tier)
    const pb = monthly(b.tier)
    if (pa !== pb) {
      if (pa === null) return 1
      if (pb === null) return -1
      return pa - pb
    }
    const ga = grant(featureValue(a.tier.entitlements[feature]))
    const gb = grant(featureValue(b.tier.entitlements[feature]))
    if (ga !== gb) return ga - gb
    return a.order - b.order
  })
  return candidates[0].tier
}

/** How many benefits sit under the primary one — enough to match the price column's height. */
export const SECONDARY_BENEFITS = 4

/**
 * The benefits the dialog lists for the offered plan: the refused feature
 * first, then the next features where the plan beats the workspace's own, in
 * the price list's order.
 *
 * The refused feature leads even when it is the only improvement, because it
 * is the answer to the question the click asked. It is left out only when the
 * price list has no heading for it (`assistant_multiplier`), whose allowance is
 * never a number we print. Everything after it is capped at
 * `SECONDARY_BENEFITS`; the rest are one link away, on the comparison.
 */
export function offerBenefits(
  feature: EntitlementKey,
  held: Record<string, RawEntitlement>,
  offered: Tier,
): { primary: TierFeature | null; secondary: TierFeature[] } {
  const primary = isTierFeatureKey(feature)
    ? { key: feature, value: featureValue(offered.entitlements[feature]) }
    : null

  const secondary = TIER_FEATURE_ORDER.filter(
    (key) => key !== feature && beats(offered.entitlements[key], held[key]),
  )
    .slice(0, SECONDARY_BENEFITS)
    .map((key) => ({ key, value: featureValue(offered.entitlements[key]) }))

  return { primary, secondary }
}

/**
 * The monthly and yearly price of a plan, or null for an interval it is not
 * sold on.
 *
 * Same first rule as `displayPrice` — never a country-specific row — and the
 * yearly row is taken only in the monthly one's currency, so the switcher can
 * never flip between euros and dollars. The switcher itself is shown only when
 * both come back.
 */
export function billingOptions(tier: Tier): {
  month: TierVersionPrice | null
  year: TierVersionPrice | null
} {
  const published = tier.prices.filter((price) => price.countryCode === null)
  const month = published.find((price) => price.interval === 'month') ?? null
  const year =
    published.find(
      (price) =>
        price.interval === 'year' &&
        (month === null || price.currency === month.currency),
    ) ?? null
  return { month, year }
}

/**
 * Each plan's monthly amount, where it can be compared with the others'.
 *
 * The client has no exchange rates, so the first priced plan's currency is the
 * unit and a price in any other reads as unpriced — sorted after every plan it
 * could be compared with, rather than beating one because 29 yen is fewer than
 * 29 euros.
 */
function monthlyIn(tiers: readonly Tier[]): (tier: Tier) => number | null {
  const currency = tiers
    .map((tier) => billingOptions(tier).month)
    .find((price) => price !== null)?.currency
  return (tier) => {
    const month = billingOptions(tier).month
    return month && month.currency === currency ? month.amount : null
  }
}

/**
 * What paying yearly saves over twelve monthly payments, in minor units — zero
 * or less means there is no saving worth announcing.
 */
export function yearlySaving(
  month: TierVersionPrice,
  year: TierVersionPrice,
): number {
  return month.amount * 12 - year.amount
}

/**
 * The largest yearly saving across these plans, as a whole percentage of
 * twelve monthly payments — or `null` when none saves anything (CON-328, the
 * chip beside `/plans`'s billing switch).
 *
 * Within one plan's own currency, by `billingOptions`, so it is never an
 * exchange rate. Floored, so the chip never promises a point more than the
 * prices give.
 */
export function yearlySavingPercent(tiers: readonly Tier[]): number | null {
  let best = 0
  for (const tier of tiers) {
    const { month, year } = billingOptions(tier)
    if (!month || !year || month.amount <= 0) continue
    best = Math.max(best, yearlySaving(month, year) / (month.amount * 12))
  }
  const percent = Math.floor(best * 100)
  return percent > 0 ? percent : null
}

/**
 * The plan `/plans` puts forward in its frame: the cheapest purchasable plan
 * that costs anything.
 *
 * The same salesperson's rule as `recommendedTier`, with no wall to clear — the
 * first paid step is the one most people choosing a plan are choosing between.
 * Free and unpriced plans are never it: framing the plan somebody is already on
 * for nothing reads as the page recommending that they don't pay. Null when no
 * plan has a monthly price above zero, and then nothing is framed.
 *
 * Like `recommendedTier`, this is the server's to take over the day Harbor
 * names a recommended plan.
 */
export function recommendedPlan(tiers: readonly Tier[]): Tier | null {
  const purchasable = tiers.filter((tier) => tier.purchasable)
  const monthly = monthlyIn(purchasable)
  let best: { tier: Tier; amount: number } | null = null
  for (const tier of purchasable) {
    const amount = monthly(tier) ?? 0
    if (amount <= 0) continue
    if (!best || amount < best.amount) best = { tier, amount }
  }
  return best?.tier ?? null
}
