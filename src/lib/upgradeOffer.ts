import {
  TIER_FEATURE_ORDER,
  featureValue,
  isTierFeatureKey,
  type TierFeature,
  type TierFeatureKey,
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

/** How many gains a plan card lists; the rest are in the comparison. */
export const CARD_GAINS = 6

/**
 * The order a card lists its gains in — the pitch's order, not the price
 * list's. What only a bigger plan can do at all leads — separate workspaces,
 * several accounts on one network, campaign types of your own — because a
 * step that is merely "more" of what the card before already had reads as a
 * repeat of that card. The rest follow the order the product is used in.
 */
const GAIN_ORDER: readonly TierFeatureKey[] = [
  'workspaces',
  'multiple_accounts_per_platform',
  'custom_campaign_types',
  'connected_accounts',
  'active_campaigns',
  'team_seats',
  'quality_reviews_per_post',
  'media_storage_bytes',
  'all_campaign_types',
  'plan_runs_per_month',
  'posts_total',
  'content_bank_assets',
  'web_page_imports',
]

/** A feature a plan has more of than the card before it, and what that card had. */
export type CardGain = { key: TierFeatureKey; from: TierFeatureValue }

/**
 * What a plan card lists: the gains over the card to its left, or nothing.
 *
 * `plus` is true when the plan holds at least everything the previous card
 * does, and then the card says "Everything in …, plus:" over its gains. The
 * dominance check is what keeps that sentence from being said of a plan that
 * lacks something its neighbour has: the order of the list is the server's,
 * and the client does not rank. Otherwise — the first card, or a neighbour
 * neither contains — the card lists what the product does, which is copy and
 * not an allowance, so there is nothing to compute here.
 *
 * `from` is carried so a line can be worded by where it starts: inviting
 * teammates is new on a plan whose predecessor seats one person, and "even
 * more people" on one that already seats several.
 */
export function cardHighlights(
  tier: Tier,
  previous: Tier | null,
): { plus: boolean; gains: CardGain[] } {
  if (!previous) return { plus: false, gains: [] }
  const plus = TIER_FEATURE_ORDER.every(
    (key) =>
      grant(featureValue(tier.entitlements[key])) >=
      grant(featureValue(previous.entitlements[key])),
  )
  if (!plus) return { plus, gains: [] }
  const gains = GAIN_ORDER.filter((key) =>
    beats(tier.entitlements[key], previous.entitlements[key]),
  ).map((key) => ({ key, from: featureValue(previous.entitlements[key]) }))
  return { plus, gains: gains.slice(0, CARD_GAINS) }
}
