/**
 * A campaign's post goal (CON-182), mirroring the Go `campaigngoal` package.
 *
 * The goal is a **rate**: `estimated_post_count` posts per `goal_cadence`
 * period, where a period is a week or a calendar month. The content-plan flow
 * multiplies the two to decide how much to generate, and the campaign overview
 * reports progress period by period.
 *
 * Note this is not what `estimated_post_count` used to mean. It was the
 * campaign's absolute total until CON-182 reinterpreted it, and the server
 * backfilled every existing campaign to a monthly cadence — so an old total of
 * 12 on a three-month campaign is now read as 36. Anything that treats the
 * column as a whole-campaign figure is wrong; use `postGoalTotal`.
 */

export type GoalCadence = 'week' | 'month'

export const GOAL_CADENCES: readonly GoalCadence[] = ['week', 'month']

/** What the server applies to a campaign that leaves the cadence unset. */
export const DEFAULT_GOAL_CADENCE: GoalCadence = 'month'

const DAY_MS = 24 * 60 * 60 * 1000

/** How one period is named in a sentence, singular. */
export const CADENCE_UNIT: Record<GoalCadence, string> = {
  week: 'week',
  month: 'month',
}

export function normalizeGoalCadence(value: string | null | undefined): GoalCadence {
  return GOAL_CADENCES.includes(value as GoalCadence)
    ? (value as GoalCadence)
    : DEFAULT_GOAL_CADENCE
}

/**
 * How many periods the campaign's dates span, rounding a partial trailing
 * period **up** — a campaign running into the first week of a month owes that
 * week's posts.
 *
 * Returns 1 for a missing or backwards window, exactly as `campaigngoal.Periods`
 * does: without dates the server treats the per-period count as the whole
 * campaign's total rather than refusing to plan.
 *
 * Both bounds are inclusive days: `end_date` is stored as the day at
 * `T00:00:00` (see `toISODateTime`), the same reading `campaignReadiness` uses
 * for the campaign window.
 */
/**
 * The date's own digits, no clock involved. `Date.parse` would read a
 * `T00:00:00` value in the browser's zone, and then a range crossing a DST
 * shift is short one hour's worth of day, and local midnight east of UTC
 * lands `getUTCMonth` in the previous month.
 */
function calendarParts(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  // Round-trip through UTC to reject dates the calendar doesn't have —
  // Date.UTC would silently roll "2026-02-31" into March and the range would
  // count a month that was never asked for.
  const probe = new Date(Date.UTC(y, m - 1, d))
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    return null
  }
  return { y, m, d }
}

export function periodsInRange(
  cadence: GoalCadence,
  startDate: string | null,
  endDate: string | null,
): number {
  const from = startDate ? calendarParts(startDate) : null
  const to = endDate ? calendarParts(endDate) : null
  if (!from || !to) return 1

  // Both midnights UTC by construction, so the difference is whole days.
  const start = Date.UTC(from.y, from.m - 1, from.d)
  const end = Date.UTC(to.y, to.m - 1, to.d)
  if (end < start) return 1

  if (cadence === 'week') {
    const days = Math.floor((end - start) / DAY_MS) + 1
    return Math.max(1, Math.ceil(days / 7))
  }

  // Calendar months the campaign runs in, not 30-day blocks: a monthly goal is
  // read off a calendar, so Jan 1 – Feb 15 is two months' worth even though it
  // is barely one month long.
  const months = (to.y - from.y) * 12 + (to.m - from.m) + 1
  return Math.max(1, months)
}

/**
 * What the goal works out to over the whole campaign — the number of drafts a
 * full content plan produces.
 *
 * `dated` is false when the campaign has no usable window: the goal still
 * counts, once, and the card says so rather than pretending to a schedule the
 * campaign hasn't got.
 */
export type PostGoalTotal =
  | { kind: 'ok'; total: number; periods: number; dated: boolean }
  | { kind: 'needs-count' }

/** Posts per period × periods — what `campaigngoal.EffectiveCount` returns. */
export function postGoalTotal(
  postsPerPeriod: number | null,
  cadence: GoalCadence,
  startDate: string | null,
  endDate: string | null,
): PostGoalTotal {
  if (postsPerPeriod == null || postsPerPeriod <= 0) return { kind: 'needs-count' }

  const dated = Boolean(startDate) && Boolean(endDate)
  const periods = periodsInRange(cadence, startDate, endDate)
  return {
    kind: 'ok',
    total: postsPerPeriod * periods,
    periods,
    dated: dated && periods >= 1,
  }
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/**
 * The total spelled out as the arithmetic behind it, so the number the
 * campaign is planned against is never just asserted at the user.
 */
export function describePostGoalTotal(
  postsPerPeriod: number | null,
  cadence: GoalCadence,
  total: PostGoalTotal,
): string {
  if (total.kind === 'needs-count') return 'Number of posts total will appear here.'

  const unit = CADENCE_UNIT[cadence]
  const rate = `${plural(postsPerPeriod ?? 0, 'post', 'posts')} a ${unit}`
  const sum = `${plural(total.total, 'post', 'posts')} in total`

  if (!total.dated) {
    return `${rate}. Set the campaign dates — without them the goal counts once, for ${sum}.`
  }
  return `${rate} × ${plural(total.periods, unit, `${unit}s`)} = ${sum}.`
}
