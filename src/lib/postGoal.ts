import type { Campaign } from '@/types/campaigns'

/**
 * A campaign's post goal (CON-156 §3).
 *
 * The goal is expressed **per connected account**, not as a lump sum: "3 posts
 * a week on each account" is how a plan is actually decided, and it stays true
 * when a platform is added or a second account is connected. What the rest of
 * the app reads — the campaign's `estimated_post_count` — is the *total* this
 * works out to over the campaign, computed by `postGoalTotal` and written by
 * the settings form.
 *
 * Accounts, not platforms, because a platform can hold several (CON-150) and
 * each one publishes its own posts: a workspace with two Instagram accounts
 * posting three times a week is producing six Instagram posts, not three.
 */

export type PostGoalPeriod = 'total' | 'monthly' | 'weekly'

/**
 * `default` applies one goal to every account the campaign posts to. `custom`
 * is per-platform numbers, which the UI offers but does not implement yet.
 */
export type PostGoalMode = 'default' | 'custom'

export type PostGoal = {
  /** False means the campaign has no goal at all — nothing to plan against. */
  enabled: boolean
  /** Posts on each connected account, per `period`. */
  perAccount: number
  period: PostGoalPeriod
  mode: PostGoalMode
}

const PERIODS: PostGoalPeriod[] = ['total', 'monthly', 'weekly']
const MODES: PostGoalMode[] = ['default', 'custom']

const DAY_MS = 24 * 60 * 60 * 1000

/** How one period is named in a sentence, singular. */
export const PERIOD_UNIT: Record<PostGoalPeriod, string> = {
  total: 'the campaign',
  monthly: 'month',
  weekly: 'week',
}

/**
 * What the stored goal is when a campaign has never had one: off, and empty.
 * `seedPostGoal` reads the campaign before falling back to this.
 */
export const NO_POST_GOAL: PostGoal = {
  enabled: false,
  perAccount: 0,
  period: 'total',
  mode: 'default',
}

/**
 * Reads the stored blob back. Returns `null` — not a default — when there is
 * nothing stored, so the caller can tell "no goal was ever configured" (seed
 * it from the campaign) from "the goal is switched off".
 *
 * Anything malformed reads as nothing stored: a hand-edited value must not
 * take the settings page down, and the next save overwrites it.
 */
export function parsePostGoal(raw: string | null): PostGoal | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const { enabled, perAccount, period, mode } = parsed as Partial<PostGoal>
    return {
      enabled: enabled === true,
      perAccount:
        typeof perAccount === 'number' && Number.isFinite(perAccount) && perAccount > 0
          ? Math.floor(perAccount)
          : 0,
      period: PERIODS.includes(period as PostGoalPeriod)
        ? (period as PostGoalPeriod)
        : NO_POST_GOAL.period,
      mode: MODES.includes(mode as PostGoalMode)
        ? (mode as PostGoalMode)
        : NO_POST_GOAL.mode,
    }
  } catch {
    return null
  }
}

/**
 * The goal a campaign with no stored blob starts from.
 *
 * `estimated_post_count` predates the goal and means the campaign total, so a
 * campaign that has one already has a goal — it just isn't broken down yet.
 * Spreading it evenly across the accounts it publishes through round-trips
 * exactly when it divides, and drifts by at most one post per account when it
 * doesn't. Nothing is written until the user edits the card, so an untouched
 * campaign keeps the total it has either way.
 */
export function seedPostGoal(campaign: Campaign, accounts: number): PostGoal {
  const count = campaign.estimated_post_count
  if (count == null || count <= 0) return NO_POST_GOAL
  return {
    enabled: true,
    perAccount: Math.max(1, Math.ceil(count / Math.max(1, accounts))),
    period: 'total',
    mode: 'default',
  }
}

/**
 * How many times the goal repeats over a campaign's dates. `null` when the
 * dates can't answer it — the goal is set but its total is not knowable yet.
 *
 * Both bounds are inclusive days: `end_date` is stored as the day at
 * `T00:00:00` (see `toISODateTime`), the same reading `campaignReadiness` uses
 * for the campaign window.
 */
export function periodsInRange(
  period: PostGoalPeriod,
  startDate: string | null,
  endDate: string | null,
): number | null {
  if (period === 'total') return 1

  const start = startDate ? Date.parse(startDate) : NaN
  const end = endDate ? Date.parse(endDate) : NaN
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null

  if (period === 'weekly') {
    const days = Math.floor((end - start) / DAY_MS) + 1
    return Math.max(1, Math.ceil(days / 7))
  }

  // Calendar months the campaign runs in, not 30-day blocks: a monthly goal is
  // read off a calendar, so Jan 1 – Feb 15 is two months' worth even though it
  // is barely one month long.
  const from = new Date(start)
  const to = new Date(end)
  const months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth()) +
    1
  return Math.max(1, months)
}

/**
 * The campaign total, or the one thing missing before it can be worked out.
 * The missing cases are distinct because each has its own way out — a platform
 * is added here, an account is connected in Workspace Settings — and the card
 * says which.
 */
export type PostGoalTotal =
  | { kind: 'ok'; total: number; periods: number; accounts: number }
  | { kind: 'needs-count' }
  | { kind: 'needs-platforms' }
  | { kind: 'needs-accounts' }
  | { kind: 'needs-dates' }

export type PostGoalContext = {
  /** How many platforms the campaign targets. */
  platforms: number
  /** How many connected accounts those platforms hold, in total. */
  accounts: number
  startDate: string | null
  endDate: string | null
}

/** Posts per account × accounts × periods — the campaign's total post target. */
export function postGoalTotal(goal: PostGoal, ctx: PostGoalContext): PostGoalTotal {
  if (!goal.enabled || goal.perAccount <= 0) return { kind: 'needs-count' }
  if (ctx.platforms <= 0) return { kind: 'needs-platforms' }
  if (ctx.accounts <= 0) return { kind: 'needs-accounts' }

  const periods = periodsInRange(goal.period, ctx.startDate, ctx.endDate)
  if (periods === null) return { kind: 'needs-dates' }

  return {
    kind: 'ok',
    total: goal.perAccount * ctx.accounts * periods,
    periods,
    accounts: ctx.accounts,
  }
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/**
 * The total spelled out as the arithmetic behind it, so the number the
 * campaign is planned against is never just asserted at the user.
 */
export function describePostGoalTotal(goal: PostGoal, total: PostGoalTotal): string {
  switch (total.kind) {
    case 'needs-count':
      return 'Number of posts total will appear here.'
    case 'needs-platforms':
      return 'Add a platform below — the total counts the goal once per account.'
    case 'needs-accounts':
      return 'No accounts connected for these platforms — connect one in Workspace Settings.'
    case 'needs-dates':
      return `Set the campaign dates — a ${PERIOD_UNIT[goal.period]}ly goal is counted over them.`
    case 'ok': {
      const per = plural(goal.perAccount, 'post', 'posts')
      const accounts = plural(total.accounts, 'account', 'accounts')
      const span =
        goal.period === 'total'
          ? ''
          : ` × ${plural(total.periods, PERIOD_UNIT[goal.period], `${PERIOD_UNIT[goal.period]}s`)}`
      return `${per} × ${accounts}${span} = ${plural(total.total, 'post', 'posts')} in total.`
    }
  }
}
