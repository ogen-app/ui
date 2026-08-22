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
 * 2. **It reads the clock to make a decision.** The boundary date is computed
 *    here. On the real thing it comes off the subscription; the client only
 *    ever displays it.
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
type SeedTier = TierBody & { rank: number }

const TIERS: readonly SeedTier[] = [
  {
    rank: 0,
    id: 'tier_trial_2026_08_01',
    name: 'Trial',
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
    id: 'tier_pro_2026_08_01',
    name: 'Pro',
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
    id: 'tier_max_2026_08_01',
    name: 'Max',
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
    id: 'tier_pro_2026_01_01',
    name: 'Pro',
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
  return { tierId: DEFAULT_TIER_ID, since: '2026-08-01T00:00:00Z', scheduled: null }
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
    if (typeof parsed.tierId !== 'string' || !tierById(parsed.tierId)) return seed()
    return {
      tierId: parsed.tierId,
      since: typeof parsed.since === 'string' ? parsed.since : seed().since,
      scheduled:
        parsed.scheduled && tierById(parsed.scheduled.tierId) ? parsed.scheduled : null,
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
 * The first of next month, UTC — standing in for the next billing boundary.
 *
 * The real one comes off the subscription and can be any day of the month. It
 * is a date the server supplies for exactly this reason.
 */
function nextBoundary(now: Date): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0),
  ).toISOString()
}

function toBody(tier: SeedTier): TierBody {
  // `rank` never leaves this file — the client is not allowed to order tiers.
  const { rank: _rank, ...body } = tier
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
export function stubSelectTier(tierId: string, now: Date = new Date()): Promise<PlanBody> {
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
          scheduled: { tierId: target.id, effectiveFrom: nextBoundary(now) },
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
  const scheduledTier = selection.scheduled ? tierById(selection.scheduled.tierId) : undefined
  const resetsAt = nextBoundary(now)

  return {
    tier: {
      id: tier.id,
      name: tier.name,
      effective_from: selection.since,
      scheduled_change:
        selection.scheduled && scheduledTier
          ? {
              id: scheduledTier.id,
              name: scheduledTier.name,
              effective_from: selection.scheduled.effectiveFrom,
              // Ranked here because the server ranks it there.
              direction: scheduledTier.rank > tier.rank ? 'upgrade' : 'downgrade',
            }
          : null,
    },
    entitlements: withUsage(tier.entitlements ?? {}, resetsAt),
  }
}
