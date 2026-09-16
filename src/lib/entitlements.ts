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
 */
function toUsage(entry: RawEntitlement): Usage | null {
  if (entry.limit === undefined && entry.used === undefined) return null
  return {
    limit: entry.limit ?? null,
    used: entry.used ?? null,
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
