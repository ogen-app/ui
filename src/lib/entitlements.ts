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
  UsagePeriod,
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

/** The periods this build knows how to name. Anything else is not guessed at. */
const KNOWN_PERIODS: readonly UsagePeriod[] = [
  'day',
  'month',
  'post',
  'publish',
]

/**
 * Narrows the server's period word, dropping one this build has never heard of.
 *
 * The tier list is edited by hand, so a new period will exist before the client
 * knows it. Losing the phrase "this month" off a meter is a small cost; putting
 * the wrong one there is not.
 */
export function usagePeriod(value: unknown): UsagePeriod | null {
  return KNOWN_PERIODS.includes(value as UsagePeriod)
    ? (value as UsagePeriod)
    : null
}

/**
 * The metered half of an entry, or null when the key is a plain yes/no.
 *
 * A key that states neither a limit nor a use is not metered — `post_assistant`
 * and `multiple_accounts_per_platform` are verdicts, and inventing `0 of ∞` for
 * them would put a meter on screens that have nothing to measure.
 */
function toUsage(entry: RawEntitlement): Usage | null {
  if (entry.limit === undefined && entry.used === undefined) return null
  return {
    limit: entry.limit ?? null,
    used: entry.used ?? 0,
    period: usagePeriod(entry.period),
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
  if (usage.limit !== null && usage.used >= usage.limit) {
    return { state: 'denied', reason: 'limit', usage }
  }
  return { state: 'allowed', usage }
}

/** How many are left, or null when the allowance is unlimited. */
export function remaining(usage: Usage): number | null {
  if (usage.limit === null) return null
  return Math.max(0, usage.limit - usage.used)
}
