import type { BillingBody } from './billing'
import type { RawEntitlement, WorkspacePlan } from '@/types/entitlements'
import type { Tier } from '@/types/tiers'

/**
 * A tier list and a plan, standing in for a plan change nobody can make
 * (CON-232, CON-243).
 *
 * **This whole file is scaffolding.** It exists so the plan screen and the
 * entitlement seam can be built and driven before there is any way to *choose* a
 * tier — pick one here and every gated surface in the app changes with it, which
 * is the only way to see whether the gating reads right. Delete it, and the
 * `STUBBED` branch in `tiers.ts` and `entitlements.ts`, on the commit that wires
 * the real endpoints.
 *
 * **Both reads it answers now exist**, which is new and is why what follows
 * matters more than it used to. `GET /api/me/entitlements` and
 * `GET /api/public/pricing` are live, so the only thing missing is the *write* —
 * a workspace's version is assigned by an operator through Harbor (CON-294), and
 * there is no self-serve change. The stub is therefore no longer a substitute
 * for the server's answers but a substitute for an action, and it has to agree
 * with the server about everything it is not substituting for: Trial below is
 * the published version, ids and all. Two published tiers short of a comparison
 * screen is the other reason it is still switched on.
 *
 * A JSON seed plus `localStorage`, not a fetch-level mock: the request layer
 * stays honest, so nothing can pass a test against an interceptor and then fail
 * against the server. Same shape the rest of the stubs in this app take.
 *
 * **It answers with `WorkspacePlan`, not with a wire body, and that changed with
 * CON-243.** It used to emit the payload of `GET /api/entitlements` and go
 * through the real parser, which was the better arrangement while that endpoint
 * was a proposal. It turned out not to exist: what shipped is
 * `GET /api/me/entitlements`, whose body is a tier *version* and has no room for
 * the three things this stub exists to exercise — a billing period, a renewal
 * date and a scheduled downgrade. A stub emitting the real body could not
 * express the states the plan screen was built to show, so it produces the
 * client-side type instead. The wire stays honest a different way: the contract
 * test drives `fetchWorkspacePlan` against the real payload, which is exactly
 * the reason that function is split out from `getWorkspacePlan`.
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
type SeedTier = Tier & {
  rank: number
  /**
   * How often this tier bills — `null` for the free one.
   *
   * Stub-only, like `rank`, and stripped by `toTier` for the same reason: the
   * *tier list* says what a tier costs, while how often a given workspace is
   * charged is a property of its subscription. On the real thing this comes off
   * the subscription, which is why it is reported on the plan rather than on the
   * catalogue entry.
   */
  billingPeriod: 'month' | 'year' | null
}

/**
 * **Trial is the published version, copied; Pro and Max are proposals.**
 *
 * `GET /api/public/pricing` publishes exactly one tier today — `trial` v1 — so
 * the Trial row below is that version: its `version_id`, its `tier_id`, its one
 * price row and its fifteen allowances, read off the live endpoint and matching
 * it key for key. A stub that agreed with the server about everything except the
 * ids would be useless the moment `STUBBED` flips.
 *
 * Pro and Max have no published version, so theirs are the decided matrix
 * (2026-08-19) and CON-243 §11 mapped onto the server's key names: a proposal,
 * not a reading. Their ids follow the server's `ttv-<tier>-v<n>` convention for
 * the same reason, and they are priced at nothing — **`prices: []` is "nobody
 * has decided", which is not the same as free** and renders as no line rather
 * than as €0. Re-sync the day their versions are published, and take
 * `entitlements.seed.json` with them.
 *
 * Two keys in §11's sketch have no stated Pro/Max value anywhere —
 * `content_bank_assets` and `web_page_imports` — so the numbers here are ours,
 * and are the first thing to check against whatever gets published.
 */
const TIERS: readonly SeedTier[] = [
  {
    rank: 0,
    billingPeriod: null,
    id: 'ttv-trial-v1',
    tierId: 'trial',
    name: 'Trial',
    purchasable: true,
    changeReason: 'Initial published version.',
    prices: [
      { amount: 0, currency: 'EUR', interval: 'month', countryCode: null },
    ],
    entitlements: {
      workspaces: { limit: 1, reset: 'standing' },
      team_seats: { limit: 1, reset: 'standing' },
      connected_accounts: { limit: 2, reset: 'standing' },
      active_campaigns: { limit: 1, reset: 'standing' },
      all_campaign_types: { allowed: false },
      custom_campaign_types: { allowed: false },
      plan_runs_per_month: { limit: 3, reset: 'monthly' },
      assistant_multiplier: { limit: 1, reset: 'standing' },
      quality_reviews_per_post: { limit: 1, reset: 'per_post' },
      posts_total: { limit: 15, reset: 'total' },
      media_storage_bytes: { limit: 100 * MB, reset: 'standing' },
      content_bank_assets: { limit: 10, reset: 'standing' },
      web_page_imports: { limit: 3, reset: 'standing' },
      multiple_accounts_per_platform: { allowed: false },
      // In the catalog, on every tier, and gated by nobody — its own description
      // ends "never gated". It is here so that Trial matches the published
      // version key for key; no screen asks about it.
      semantic_grounding: { allowed: true },
    },
  },
  {
    rank: 1,
    billingPeriod: 'month',
    id: 'ttv-pro-v1',
    tierId: 'pro',
    name: 'Pro',
    purchasable: true,
    changeReason: 'Initial published version.',
    prices: [],
    entitlements: {
      workspaces: { limit: 1, reset: 'standing' },
      team_seats: { limit: 3, reset: 'standing' },
      connected_accounts: { limit: 6, reset: 'standing' },
      active_campaigns: { limit: 5, reset: 'standing' },
      all_campaign_types: { allowed: true },
      custom_campaign_types: { allowed: false },
      plan_runs_per_month: { limit: 10, reset: 'monthly' },
      assistant_multiplier: { limit: 5, reset: 'standing' },
      quality_reviews_per_post: { limit: 5, reset: 'per_post' },
      posts_total: { limit: null, reset: 'total' },
      media_storage_bytes: { limit: GB, reset: 'standing' },
      content_bank_assets: { limit: 100, reset: 'standing' },
      web_page_imports: { limit: 25, reset: 'standing' },
      multiple_accounts_per_platform: { allowed: false },
      semantic_grounding: { allowed: true },
    },
  },
  {
    rank: 2,
    billingPeriod: 'month',
    id: 'ttv-max-v1',
    tierId: 'max',
    name: 'Max',
    purchasable: true,
    changeReason: 'Initial published version.',
    prices: [],
    entitlements: {
      workspaces: { limit: 5, reset: 'standing' },
      team_seats: { limit: null, reset: 'standing' },
      connected_accounts: { limit: 30, reset: 'standing' },
      active_campaigns: { limit: null, reset: 'standing' },
      all_campaign_types: { allowed: true },
      custom_campaign_types: { allowed: true },
      plan_runs_per_month: { limit: 100, reset: 'monthly' },
      assistant_multiplier: { limit: 20, reset: 'standing' },
      quality_reviews_per_post: { limit: 10, reset: 'per_post' },
      posts_total: { limit: null, reset: 'total' },
      media_storage_bytes: { limit: 10 * GB, reset: 'standing' },
      content_bank_assets: { limit: null, reset: 'standing' },
      web_page_imports: { limit: null, reset: 'standing' },
      multiple_accounts_per_platform: { allowed: true },
      semantic_grounding: { allowed: true },
    },
  },
  {
    /**
     * A superseded version, kept in the seed on purpose: a workspace that bought
     * it stays on it, so the screen has to render a current plan that is not
     * among the ones on offer. Ranked with the Pro that replaced it.
     *
     * `stubListTiers` leaves it out, because `GET /api/public/pricing` does —
     * only purchasable versions are published. Reaching it means being *put* on
     * it, which is what the endpoint has no counterpart for (Harbor does it) and
     * what a hand-edited `stub-plan` key does here.
     */
    rank: 1,
    billingPeriod: 'month',
    id: 'ttv-pro-v0',
    tierId: 'pro',
    name: 'Pro',
    purchasable: false,
    changeReason: 'Superseded by v1.',
    prices: [],
    entitlements: {
      workspaces: { limit: 1, reset: 'standing' },
      team_seats: { limit: 2, reset: 'standing' },
      connected_accounts: { limit: 4, reset: 'standing' },
      active_campaigns: { limit: 3, reset: 'standing' },
      all_campaign_types: { allowed: true },
      custom_campaign_types: { allowed: false },
      plan_runs_per_month: { limit: 10, reset: 'monthly' },
      assistant_multiplier: { limit: 5, reset: 'standing' },
      quality_reviews_per_post: { limit: 5, reset: 'per_post' },
      posts_total: { limit: null, reset: 'total' },
      media_storage_bytes: { limit: GB, reset: 'standing' },
      content_bank_assets: { limit: 50, reset: 'standing' },
      web_page_imports: { limit: 25, reset: 'standing' },
      multiple_accounts_per_platform: { allowed: false },
      semantic_grounding: { allowed: true },
    },
  },
]

/*
 * The counters this stub used to hold are gone — they live in
 * `entitlements.seed.json` now, and `getWorkspacePlan` applies them to whichever
 * branch answered. Two tables of what a workspace has spent, one for the stub
 * and one for the real endpoint, would have drifted the first time somebody
 * tuned the numbers to make a lock appear.
 */

const DEFAULT_TIER_ID = 'ttv-trial-v1'

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

/**
 * Lands a scheduled change whose boundary has passed — the third place the
 * stub reads the clock, and for the same reason as the other two: on the real
 * thing the *server* applies the change when the billing cycle rolls over, so
 * a plan read after the boundary already answers with the new tier. Without
 * this, a stored downgrade would sit "scheduled" forever. Persisted, so the
 * landing survives a reload the same way the choice did.
 */
function reconcile(selection: Selection, now: Date): Selection {
  const due = selection.scheduled
  if (!due || new Date(due.effectiveFrom).getTime() > now.getTime()) {
    return selection
  }
  return write({
    tierId: due.tierId,
    since: due.effectiveFrom,
    scheduled: null,
  })
}

function toTier(tier: SeedTier): Tier {
  // Neither leaves this file. `rank` because the client is not allowed to order
  // tiers, `billingPeriod` because it belongs to a subscription rather than to
  // the price list.
  const { rank: _rank, billingPeriod: _billingPeriod, ...rest } = tier
  return rest
}

/**
 * The purchasable versions, which is what `GET /api/public/pricing` publishes.
 *
 * The superseded one is filtered out here rather than left out of the table, so
 * that a plan *on* it still resolves to its allowances — that is the whole point
 * of keeping it. A list that included it would be a list the real endpoint
 * cannot produce, and the plan screen's "no longer offered" case would be
 * exercised by nothing.
 */
export function stubListTiers(): Promise<Tier[]> {
  return Promise.resolve(TIERS.filter((tier) => tier.purchasable).map(toTier))
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
): Promise<WorkspacePlan> {
  const target = tierById(tierId)
  // A change already due has landed by the time this click happens, so the
  // ranks below compare against the tier the workspace is actually on — not
  // the one it left at the last boundary.
  const current = reconcile(read(), now)
  const held = tierById(current.tierId)
  if (!target || !held) return Promise.resolve(stubPlanFrom(current, now))

  if (target.id === held.id) {
    // Same tier: the click means "call the downgrade off", or it means nothing.
    return Promise.resolve(
      stubPlanFrom(write({ ...current, scheduled: null }), now),
    )
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

  return Promise.resolve(stubPlanFrom(write(next), now))
}

export function stubWorkspacePlan(
  now: Date = new Date(),
): Promise<WorkspacePlan> {
  return Promise.resolve(stubPlanFrom(reconcile(read(), now), now))
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
 * Stamps the reset date onto the allowances that have one.
 *
 * The counters that used to be joined on here are `withSeededUsage`'s job now
 * (`entitlements.seed.ts`), applied one layer out so the stub and the real
 * endpoint are counted from the same table. What is left is the date, which only
 * the stub can supply: it is the renewal, and the real endpoint reports no
 * renewal at all.
 */
function withResetDate(
  entitlements: Record<string, RawEntitlement>,
  resetsAt: string,
): Record<string, RawEntitlement> {
  const merged: Record<string, RawEntitlement> = {}
  for (const [key, entry] of Object.entries(entitlements)) {
    // Only an allowance that actually refills has a date to give. A `standing`
    // ceiling and a lifetime `total` never return to zero, and a boolean carries
    // no allowance at all.
    merged[key] =
      entry.reset === 'monthly' ? { ...entry, resetsAt } : { ...entry }
  }
  return merged
}

function stubPlanFrom(
  selection: Selection,
  now: Date = new Date(),
): WorkspacePlan {
  const tier = tierById(selection.tierId) ?? TIERS[0]
  const scheduledTier = selection.scheduled
    ? tierById(selection.scheduled.tierId)
    : undefined
  const renewsAt = nextRenewal(selection.since, now)

  return {
    tier: {
      id: tier.id,
      tierId: tier.tierId,
      name: tier.name,
      purchasable: tier.purchasable,
      changeReason: tier.changeReason,
      prices: tier.prices,
      effectiveFrom: selection.since,
      // Nothing renews while no provider is connected — nobody is billed
      // monthly and no invoice is coming, whatever the tier's price says. Same
      // rule as `stubBilling`: reporting a period and a date here put "It
      // auto-renews on…" on the card directly above "Nothing is being charged
      // for this workspace." The billed states live on `/design/plan-billing`.
      billingPeriod: null,
      renewsAt: null,
      scheduled:
        selection.scheduled && scheduledTier
          ? {
              id: scheduledTier.id,
              name: scheduledTier.name,
              effectiveFrom: selection.scheduled.effectiveFrom,
              // Ranked here because the server ranks it there.
              direction:
                scheduledTier.rank > tier.rank ? 'upgrade' : 'downgrade',
            }
          : null,
    },
    entitlements: withResetDate(tier.entitlements, renewsAt),
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
