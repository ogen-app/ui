import type { BillingBody } from './billing'
import type { EntitlementBody, PlanBody } from './entitlements'
import type { TierBody } from './tiers'

/**
 * A tier list and a plan, with no server behind either (CON-232).
 *
 * **This whole file is scaffolding.** It exists so the plan screen and the
 * entitlement seam can be built and driven before `GET /api/entitlements` and
 * `GET /api/tiers` answer — pick a tier here and every gated surface in the app
 * changes with it, which is the only way to see whether the gating reads right.
 * Delete it, and the `STUBBED` branch in `tiers.ts` and `entitlements.ts`, on
 * the commit that wires the real endpoints.
 *
 * A JSON seed plus `localStorage`, not a fetch-level mock: the request layer
 * stays honest, so nothing can pass a test against an interceptor and then fail
 * against the server. Same shape the rest of the stubs in this app take.
 *
 * Two things it deliberately does that the client must never do:
 *
 * 1. **It ranks tiers.** `rank` decides whether a choice is an upgrade or a
 *    downgrade, and therefore whether it lands now or at the next billing
 *    boundary. That is the server's judgement — tiers are configurable, so only
 *    the thing that owns the list can order it — and it is why `direction`
 *    arrives on the wire. `rank` is stripped before anything leaves this file.
 * 2. **It reads the clock to make a decision.** The renewal date, and the
 *    boundary a downgrade lands on, are computed here. On the real thing both
 *    come off the subscription; the client only ever displays them.
 *
 * It also answers `GET /api/billing` (see `stubBilling`), which is a smaller
 * job than it sounds: no payment provider is connected, so the truthful answer
 * is no subscription and no portal.
 */

/** Flip to false to point the same call sites at the real API. */
export const STUBBED = true

const STORAGE_KEY = 'stub-plan'

const MB = 1024 * 1024
const GB = 1024 * MB

/**
 * The tier matrix as decided (2026-08-19), written in the shape the endpoint
 * will send so the seed can become its fixture unchanged.
 *
 * Absences are meaningful and are the same three the contract describes:
 * `{allowed: false}` is *not in this tier*, `{limit: null}` is unlimited, and a
 * key left out entirely would be ungated. Nothing here is left out — a tier
 * list that is silent about a feature is a decision nobody made.
 */
type SeedTier = TierBody & {
  rank: number
  /**
   * How often this tier bills — `null` for the free one.
   *
   * Stub-only, like `rank`, and stripped by `toBody` for the same reason: the
   * *tier list* says what a tier costs, while how often a given workspace is
   * charged is a property of its subscription. On the real thing this comes off
   * the subscription, which is why it is reported on the plan
   * (`billing_period`) rather than on the catalogue entry.
   */
  billingPeriod: 'month' | 'year' | null
}

const TIERS: readonly SeedTier[] = [
  {
    rank: 0,
    billingPeriod: null,
    id: 'tier_trial_2026_08_01',
    name: 'Ogen Trial',
    tagline: 'Enough to see whether Ogen works for you.',
    effective_from: '2026-08-01T00:00:00Z',
    price: null,
    available: true,
    entitlements: {
      seats: { limit: 1 },
      social_accounts: { limit: 2 },
      campaigns: { limit: 1 },
      custom_campaign_types: { allowed: false },
      content_plan_runs: { limit: 3, period: 'month' },
      post_assistant: { allowed: true },
      post_quality_reviews: { limit: 1, period: 'post' },
      post_versions: { limit: 3 },
      media_storage_bytes: { limit: 100 * MB },
      brand_personas: { allowed: false },
      brand_voices: { allowed: false },
      multiple_accounts_per_platform: { allowed: false },
    },
  },
  {
    rank: 1,
    billingPeriod: 'month',
    id: 'tier_pro_2026_08_01',
    name: 'Ogen Pro',
    tagline: 'One brand, run properly, with a couple of people on it.',
    effective_from: '2026-08-01T00:00:00Z',
    price: null,
    available: true,
    entitlements: {
      seats: { limit: 3 },
      social_accounts: { limit: 6 },
      campaigns: { limit: 5 },
      custom_campaign_types: { allowed: false },
      content_plan_runs: { limit: 10, period: 'month' },
      post_assistant: { allowed: true },
      post_quality_reviews: { limit: 5, period: 'post' },
      post_versions: { limit: null },
      media_storage_bytes: { limit: GB },
      brand_personas: { limit: 1 },
      brand_voices: { limit: 1 },
      multiple_accounts_per_platform: { allowed: false },
    },
  },
  {
    rank: 2,
    billingPeriod: 'month',
    id: 'tier_max_2026_08_01',
    name: 'Ogen Max',
    tagline: 'Every part of it, at the size an agency works at.',
    effective_from: '2026-08-01T00:00:00Z',
    price: null,
    available: true,
    entitlements: {
      seats: { limit: null },
      social_accounts: { limit: 30 },
      campaigns: { limit: null },
      custom_campaign_types: { allowed: true },
      content_plan_runs: { limit: 100, period: 'month' },
      post_assistant: { allowed: true },
      post_quality_reviews: { limit: 10, period: 'post' },
      post_versions: { limit: null },
      media_storage_bytes: { limit: 10 * GB },
      brand_personas: { limit: null },
      brand_voices: { limit: null },
      multiple_accounts_per_platform: { allowed: true },
    },
  },
  {
    /**
     * A superseded version, kept in the seed on purpose: a workspace that
     * bought it stays on it, so the screen has to render a current plan that is
     * not among the ones on offer. Ranked with the Pro that replaced it.
     */
    rank: 1,
    billingPeriod: 'month',
    id: 'tier_pro_2026_01_01',
    name: 'Ogen Pro',
    tagline: 'One brand, run properly, with a couple of people on it.',
    effective_from: '2026-01-01T00:00:00Z',
    price: null,
    available: false,
    entitlements: {
      seats: { limit: 2 },
      social_accounts: { limit: 4 },
      campaigns: { limit: 3 },
      custom_campaign_types: { allowed: false },
      content_plan_runs: { limit: 10, period: 'month' },
      post_assistant: { allowed: true },
      post_quality_reviews: { limit: 5, period: 'post' },
      post_versions: { limit: null },
      media_storage_bytes: { limit: GB },
      brand_personas: { limit: 1 },
      brand_voices: { limit: 1 },
      multiple_accounts_per_platform: { allowed: false },
    },
  },
]

/**
 * What the workspace has spent, held still.
 *
 * Fixed rather than counted off the real campaigns and assets, because the
 * point of the stub is the *gating*, and a counter that moves with the fixtures
 * would make every tier read the same. These numbers are chosen to straddle the
 * tiers: three campaigns is over Trial's limit and inside Pro's, seven plan
 * runs is inside Pro's ten and over Trial's three — so switching tier flips
 * real surfaces between allowed, denied-by-limit and denied-by-tier.
 */
const USED: Readonly<Record<string, number>> = {
  seats: 2,
  social_accounts: 3,
  campaigns: 3,
  content_plan_runs: 7,
  post_quality_reviews: 1,
  post_versions: 2,
  media_storage_bytes: 384 * MB,
}

const DEFAULT_TIER_ID = 'tier_trial_2026_08_01'

type Selection = {
  tierId: string
  /** When the workspace landed on `tierId`. Display data. */
  since: string
  scheduled: { tierId: string; effectiveFrom: string } | null
}

function seed(): Selection {
  return {
    tierId: DEFAULT_TIER_ID,
    since: '2026-08-01T00:00:00Z',
    scheduled: null,
  }
}

function tierById(id: string): SeedTier | undefined {
  return TIERS.find((tier) => tier.id === id)
}

/** localStorage throws in private-mode Safari and when storage is disabled. */
function read(): Selection {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return seed()
    const parsed = JSON.parse(stored) as Partial<Selection>
    // A tier id from an older seed is not worth honouring — it would resolve to
    // no allowances at all, which reads as a bug rather than as a stale stub.
    if (typeof parsed.tierId !== 'string' || !tierById(parsed.tierId))
      return seed()
    return {
      tierId: parsed.tierId,
      since: typeof parsed.since === 'string' ? parsed.since : seed().since,
      scheduled:
        parsed.scheduled && tierById(parsed.scheduled.tierId)
          ? parsed.scheduled
          : null,
    }
  } catch {
    return seed()
  }
}

function write(selection: Selection): Selection {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection))
  } catch {
    // Nothing to do about it, and nothing to tell the user: this is a stub, and
    // the choice still applies for the life of the tab.
  }
  return selection
}

/**
 * The next monthly anniversary of the day the workspace joined this tier —
 * standing in for the end of the current billing cycle.
 *
 * One function for the renewal date *and* the boundary a downgrade lands on,
 * because on the real thing they are one date: a subscription's cycle ends,
 * the invoice is issued, and the tier that was scheduled is the one that gets
 * billed. Two clocks here would have let the plan screen and the billing screen
 * disagree about the same day.
 *
 * Anniversary arithmetic overflows the way `Date` does — a cycle that started
 * on the 31st lands on the 3rd in a short month. The real date comes off the
 * subscription, which is the reason it is a field on the wire and not something
 * the client works out.
 */
function nextRenewal(since: string, now: Date): string {
  const start = new Date(since)
  if (Number.isNaN(start.getTime())) return nextRenewal(seed().since, now)
  const next = new Date(start)
  while (next.getTime() <= now.getTime()) {
    next.setUTCMonth(next.getUTCMonth() + 1)
  }
  return next.toISOString()
}

function toBody(tier: SeedTier): TierBody {
  // Neither leaves this file. `rank` because the client is not allowed to order
  // tiers, `billingPeriod` because it belongs to a subscription rather than to
  // the price list.
  const { rank: _rank, billingPeriod: _billingPeriod, ...body } = tier
  return body
}

export function stubListTiers(): Promise<TierBody[]> {
  return Promise.resolve(TIERS.map(toBody))
}

/**
 * Choosing a tier, with the rule the product actually has: an upgrade lands
 * now, a downgrade lands at the next billing boundary and nothing is deleted in
 * between. Choosing the tier you are already on cancels a pending downgrade,
 * which is the only way back from one.
 *
 * There is no payment step, here or anywhere yet. Nothing in this flow charges
 * anyone.
 */
export function stubSelectTier(
  tierId: string,
  now: Date = new Date(),
): Promise<PlanBody> {
  const target = tierById(tierId)
  const current = read()
  const held = tierById(current.tierId)
  if (!target || !held) return Promise.resolve(stubPlanFrom(current))

  if (target.id === held.id) {
    // Same tier: the click means "call the downgrade off", or it means nothing.
    return Promise.resolve(stubPlanFrom(write({ ...current, scheduled: null })))
  }

  const next: Selection =
    target.rank > held.rank
      ? { tierId: target.id, since: now.toISOString(), scheduled: null }
      : {
          ...current,
          scheduled: {
            tierId: target.id,
            // The boundary *is* the renewal date — the downgrade takes effect
            // on the invoice that would otherwise have charged for this tier.
            effectiveFrom: nextRenewal(current.since, now),
          },
        }

  return Promise.resolve(stubPlanFrom(write(next)))
}

export function stubWorkspacePlan(): Promise<PlanBody> {
  return Promise.resolve(stubPlanFrom(read()))
}

/** Only for tests and for a hard reset while poking at the screen. */
export function stubResetPlan(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // See `write`.
  }
}

/**
 * The tier's allowances plus what has been spent against them — the join the
 * endpoint has to do, and the reason the counters can't be a second call.
 */
function withUsage(
  entitlements: Record<string, EntitlementBody>,
  resetsAt: string,
): Record<string, EntitlementBody> {
  const merged: Record<string, EntitlementBody> = {}
  for (const [key, entry] of Object.entries(entitlements)) {
    // A boolean entry carries no allowance, so there is nothing to count
    // against it. `limit: null` is unlimited and still worth counting — the
    // meter says "4" rather than "4 of ∞".
    const metered = entry.limit !== undefined
    merged[key] = metered
      ? {
          ...entry,
          used: USED[key] ?? 0,
          ...(entry.period ? { resets_at: resetsAt } : {}),
        }
      : entry
  }
  return merged
}

function stubPlanFrom(selection: Selection, now: Date = new Date()): PlanBody {
  const tier = tierById(selection.tierId) ?? TIERS[0]
  const scheduledTier = selection.scheduled
    ? tierById(selection.scheduled.tierId)
    : undefined
  const renewsAt = nextRenewal(selection.since, now)

  return {
    tier: {
      id: tier.id,
      name: tier.name,
      effective_from: selection.since,
      // Nothing renews while no provider is connected — nobody is billed
      // monthly and no invoice is coming, whatever the tier's price says. Same
      // rule as `stubBilling`: reporting a period and a date here put "It
      // auto-renews on…" on the card directly above "Nothing is being charged
      // for this workspace." The billed states live on `/design/plan-billing`.
      billing_period: null,
      renews_at: null,
      scheduled_change:
        selection.scheduled && scheduledTier
          ? {
              id: scheduledTier.id,
              name: scheduledTier.name,
              effective_from: selection.scheduled.effectiveFrom,
              // Ranked here because the server ranks it there.
              direction:
                scheduledTier.rank > tier.rank ? 'upgrade' : 'downgrade',
            }
          : null,
    },
    entitlements: withUsage(tier.entitlements ?? {}, renewsAt),
  }
}

/**
 * The billing side, with nothing behind it — because there *is* nothing behind
 * it. No payment provider is connected, so there is no subscription and no
 * portal, whichever tier the stub has been told the workspace is on.
 *
 * It reported a subscription on the paid tiers once, and that was a lie with a
 * visible consequence: the card said "Your payment method is held by Lemon
 * Squeezy" directly above "Billing isn't connected yet… no payment details are
 * held." Choosing a tier here changes what the workspace is *allowed to do*; it
 * does not buy anything, and nothing downstream should pretend it did.
 *
 * It also does not invent a card or a price. A fake "visa •••• 4242" on a screen
 * somebody is reviewing is a claim that a payment method exists. The states that
 * do involve one are worth seeing, but they belong on `/design/plan-billing`,
 * where nobody can mistake them for this workspace's.
 */
export function stubBilling(): Promise<BillingBody> {
  return Promise.resolve({ subscription: null, portal: false })
}

/**
 * There is no portal, so this rejects rather than resolving to a dead URL.
 *
 * Unreachable through the UI — `portal: false` is what keeps the button off the
 * screen — and it stays here so that wiring the provider is one file's worth of
 * change rather than a new call site. Developer-facing, hence a bare `Error`.
 */
export function stubBillingPortal(): Promise<{
  url: string
  expires_at?: string | null
}> {
  return Promise.reject(
    new Error(
      'No payment provider is connected: services/api/tiers.stub.ts is standing in.',
    ),
  )
}
