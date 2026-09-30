/**
 * Turning the workspace's plan into an answer about one feature (CON-232).
 *
 * Pure, and separate from the hook that feeds it, because this is the part with
 * rules in it — and the rules are the sort that are easier to get wrong quietly
 * than loudly. `lib/*` mirrors server behaviour elsewhere in this app
 * (`postStatusMachine`, `assetStatus`); this file is the same idea for tiers,
 * with one difference worth stating: it does not mirror the *enforcement*. The
 * server refuses what isn't granted. What is decided here is only what the UI
 * offers, which is why every ambiguous case below resolves towards showing the
 * feature rather than hiding it.
 *
 * ## What the server actually counts (CON-295, as of 2026-09-19)
 *
 * Worth having written down, because "the server refuses what isn't granted" is
 * true of the *design* and only partly true of the deployment, and a gate
 * pointed at a key nothing counts is not a stricter gate — it is a different
 * one, refusing on a number this client made up.
 *
 * | key | checked at | counted as |
 * | --- | --- | --- |
 * | `team_seats` | `POST /api/users` **only** | members in the tenant |
 * | `active_campaigns` | campaign create | campaigns not archived |
 * | `content_bank_assets` | note create, file upload, URL import | rows in the bank |
 * | `media_storage_bytes` | post-attachment upload | `SUM(size)` of post attachments |
 * | `all_campaign_types` / `custom_campaign_types` | campaign create/update | boolean gate |
 *
 * Nothing else has a counter registered, and an unregistered key is logged and
 * **allowed**. Two of those rows have an edge a reader will otherwise discover
 * the hard way: the seat cap is on the direct-create route and not on the
 * invitation flow, which is the path this product actually uses; and the byte
 * cap counts post attachments and not the content bank, so a bank upload is
 * charged as one row rather than as its size.
 *
 * Two more facts about the deployment, both of which can make every rule above
 * look inert: enforcement is **warn-first** (`ENTITLEMENT_ENFORCEMENT_MODE`
 * defaults to `warn`, which logs the would-block and lets the create through),
 * and the check is advisory rather than a reservation — it reads committed
 * usage, so two creates at the boundary can both pass.
 */
import type {
  Entitlement,
  RawEntitlement,
  Usage,
  UsageReset,
  WorkspacePlan,
} from '@/types/entitlements'

/**
 * The answer for a feature nobody has decided to charge for.
 *
 * Also the answer while tier gating is switched off entirely, which is what
 * keeps the flag's off-branch honest: with no plan in play every call site
 * takes the same path it took before this feature existed.
 */
export const UNGATED: Entitlement = Object.freeze({
  state: 'allowed',
  usage: null,
})

const PENDING: Entitlement = Object.freeze({ state: 'pending' })

/** The reset words this build knows how to name. Anything else is not guessed at. */
const KNOWN_RESETS: readonly UsageReset[] = [
  'standing',
  'monthly',
  'total',
  'per_post',
]

/**
 * Narrows the server's reset word, dropping one this build has never heard of.
 *
 * The feature catalog is edited server-side, so a new word will exist before the
 * client knows it. Losing the phrase "this month" off a meter is a small cost;
 * putting the wrong one there is not.
 */
export function usageReset(value: unknown): UsageReset | null {
  return KNOWN_RESETS.includes(value as UsageReset)
    ? (value as UsageReset)
    : null
}

/**
 * The metered half of an entry, or null when the key is a plain yes/no.
 *
 * A key that states neither a limit nor a use is not metered —
 * `multiple_accounts_per_platform` and the campaign-type keys are verdicts, and
 * inventing `0 of ∞` for them would put a meter on screens that have nothing to
 * measure.
 *
 * `used` passes through as `null` rather than falling back to zero. The server
 * ships allowances and no tally, so nearly every entry arrives uncounted, and
 * "0 of 5" is not a cautious reading of that — it is a claim that nothing has
 * been used, which unlocks a control that may well be exhausted.
 *
 * A `per_post` allowance is uncounted whatever arrives with it. It is spent
 * post by post and the plan is the workspace's, so a tally on it is about no
 * post in particular — read as the workspace's, one review anywhere would lock
 * reviews on every post. Until something counts per post, the server's 402 is
 * the only refusal.
 */
function toUsage(entry: RawEntitlement): Usage | null {
  if (entry.limit === undefined && entry.used === undefined) return null
  const reset = usageReset(entry.reset)
  return {
    limit: entry.limit ?? null,
    used: reset === 'per_post' ? null : (entry.used ?? null),
    reset: usageReset(entry.reset),
    resetsAt: entry.resetsAt ?? null,
  }
}

/**
 * What the plan says about one feature.
 *
 * The order of these branches is the policy:
 *
 * 1. **No plan yet → pending.** Not allowed, not denied. A caller that treats
 *    this as denial shows a paying customer an upgrade wall because a request
 *    was in flight.
 * 2. **No entry → allowed.** The default-allow rule: a key the tier settings
 *    don't mention is a feature nobody has gated.
 * 3. **`allowed: false` → denied, by tier.** The only outright verdict.
 * 4. **Over a stated limit → denied, by limit.** Separate reason, because it is
 *    a different sentence and sometimes answered by waiting rather than paying.
 *
 * `used >= limit` rather than `>`: a limit of 5 means five may exist, so the
 * sixth is refused while five are held — the check answers "may I add one
 * more", which is what every call site is actually asking.
 *
 * **An uncounted limit cannot deny.** With no tally there is no way to know
 * whether the allowance is spent, and the rule the whole file follows applies:
 * every ambiguous case resolves towards offering the feature. The server refuses
 * what isn't granted — it answers 402 with the numbers attached — so the cost of
 * being wrong this way is a denial arriving one click later than it might have,
 * against the cost the other way, which is a paying workspace locked out of
 * something it has not used. The usage is still carried on the `allowed` answer,
 * so a meter beside the control can say the limit even while it cannot say the
 * tally.
 */
export function resolveEntitlement(
  key: string,
  plan: WorkspacePlan | undefined,
): Entitlement {
  if (!plan) return PENDING

  const entry = plan.entitlements[key]
  if (!entry) return UNGATED
  if (entry.allowed === false) return { state: 'denied', reason: 'tier' }

  const usage = toUsage(entry)
  if (!usage) return UNGATED
  if (
    usage.limit !== null &&
    usage.used !== null &&
    usage.used >= usage.limit
  ) {
    return { state: 'denied', reason: 'limit', usage }
  }
  return { state: 'allowed', usage }
}

/**
 * How many are left, or null when that cannot be said.
 *
 * Null covers both an unlimited allowance and an uncounted one, because the
 * caller does the same thing with either: it has no number to print. Which of
 * the two it is stays readable on the `Usage` itself — `limit === null` is
 * unlimited, `used === null` is uncounted — for the one caller that needs to
 * word them differently.
 */
export function remaining(usage: Usage): number | null {
  if (usage.limit === null || usage.used === null) return null
  return Math.max(0, usage.limit - usage.used)
}
