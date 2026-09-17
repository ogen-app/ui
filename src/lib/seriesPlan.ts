import type { CampaignSeriesRun, SeriesRhythm } from '@/components/series/types'
import { periodsInRange, postGoalTotal, type GoalCadence } from './postGoal'

/**
 * How much of a campaign's plan its series already account for (CON-264).
 *
 * **The mix is derived, never typed.** A campaign does not set proportions; it
 * sets a rhythm per series, and the share falls out of multiplying each rhythm
 * by the window and comparing the sum to `postGoalTotal`. The first design had
 * a percentage picker on Strategy, and it was wrong twice over: a mix you type
 * is a plan you have broken by week two and are then nagged about, and it puts
 * a second control over a number the rhythms already decide. What Strategy
 * shows instead is arithmetic — *12 a month, 7 spoken for, 5 open* — which
 * cannot go stale because nothing stores it.
 *
 * Everything here is pure and takes its inputs; nothing reads a clock. The
 * campaign's window is the campaign's, and a plan that quietly measured against
 * *today* would give two answers on two machines.
 */

/**
 * What one rhythm claims over a window — `times` × the periods it spans.
 *
 * One multiplication, in one place, because both the Strategy line and the
 * series' own row ask it. Two copies of this is how the analytics tile and the
 * chart under it came to disagree about whether a series was accumulated.
 *
 * A series' period need not match the campaign's goal cadence: both sides
 * resolve to absolute counts over the same dates, so a weekly series and a
 * monthly goal compare without a conversion step.
 *
 * An undated campaign spans one period (`periodsInRange`'s own answer), so a
 * rhythm counts once rather than refusing to count. That matches what the goal
 * does with the same missing dates, which is the only way the two numbers stay
 * comparable — and the readout says the window is unset rather than presenting
 * the total as a schedule.
 */
export function rhythmClaim(
  rhythm: SeriesRhythm | null,
  startDate: string | null,
  endDate: string | null,
): number {
  // Occasional: it runs when there is something for it, and claims nothing.
  if (!rhythm || rhythm.times <= 0) return 0
  return rhythm.times * periodsInRange(rhythm.per, startDate, endDate)
}

/** One series' share of the campaign, as the page lists it. */
export type SeriesPlanLine = {
  seriesId: string
  /** Posts claimed over the whole campaign. Zero when occasional. */
  posts: number
  /** Picked up, but claiming no slots — see `SeriesRhythm`. */
  occasional: boolean
}

export type SeriesPlan = {
  /**
   * The campaign's own goal, or `null` when it has no usable post count.
   *
   * Null rather than zero: a campaign nobody has given a rate to has *no* plan
   * to measure against, which is a different sentence from one whose plan is
   * empty, and only the second is a shortfall worth mentioning.
   */
  total: number | null
  /** Whether the campaign has both dates — the goal's own `dated`. */
  dated: boolean
  /** Everything the series between them claim. */
  claimed: number
  /** Slots the series have not spoken for. Zero once they are oversubscribed. */
  open: number
  /**
   * How far past the goal the series run, if they do.
   *
   * Reported rather than prevented. A campaign may genuinely want more series
   * output than its stated rate and then raise the rate; refusing the rhythm
   * would be the app deciding which of two numbers the user meant.
   */
  over: number
  lines: SeriesPlanLine[]
}

/**
 * The whole readout, from the campaign's goal and the series it runs.
 *
 * Takes the goal's four fields rather than a campaign object so the harness and
 * the tests can call it with a window and nothing else — and so this file never
 * has to know what shape a campaign is.
 */
export function seriesPlan({
  postsPerPeriod,
  cadence,
  startDate,
  endDate,
  runs,
}: {
  postsPerPeriod: number | null
  cadence: GoalCadence
  startDate: string | null
  endDate: string | null
  runs: CampaignSeriesRun[]
}): SeriesPlan {
  const lines: SeriesPlanLine[] = runs.map((run) => ({
    seriesId: run.seriesId,
    posts: rhythmClaim(run.rhythm, startDate, endDate),
    occasional: !run.rhythm || run.rhythm.times <= 0,
  }))

  const claimed = lines.reduce((sum, line) => sum + line.posts, 0)
  const goal = postGoalTotal(postsPerPeriod, cadence, startDate, endDate)

  if (goal.kind === 'needs-count') {
    return { total: null, dated: false, claimed, open: 0, over: 0, lines }
  }

  return {
    total: goal.total,
    dated: goal.dated,
    claimed,
    open: Math.max(0, goal.total - claimed),
    over: Math.max(0, claimed - goal.total),
    lines,
  }
}
