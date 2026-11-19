import {
  MAX_RHYTHM_EVERY,
  MAX_RHYTHM_TIMES,
  SERIES_WEEKDAYS,
  type CampaignSeriesRun,
  type SeriesRhythm,
} from '@/types/series'
import { calendarParts, postGoalTotal, type GoalCadence } from './postGoal'

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
 * The days a rhythm reserves over a campaign (CON-496) — a port of the
 * server's `seriesplan.Days` over `campaigngoal.Windows`, because no endpoint
 * says how many slots a run claims and the content plan is what has to agree
 * with Strategy. When the two disagree, the server is right and this is the
 * bug.
 *
 * - **Periods** are the goal's: a week is a 7-day span counted from the
 *   campaign's start date — not a calendar week — and a month is a calendar
 *   month, clipped to the campaign at both ends.
 * - **`every`** runs the series in the first period and then in one out of
 *   every `every`.
 * - **`weekday`** puts the period's one post on that day; a trailing part-week
 *   without it gets none.
 * - **Otherwise** `times` posts spread evenly from the period's first day — a
 *   trailing part-period still gets all of them, squeezed in.
 *
 * Days are `YYYY-MM-DD`, read off the dates' own digits: the server cuts the
 * campaign to calendar days in its timezone and counts in those, so no clock
 * or zone is involved. An undated campaign has no periods and reserves
 * nothing — the plan places no series without dates.
 */
export function seriesDays(
  rhythm: SeriesRhythm | null,
  startDate: string | null,
  endDate: string | null,
): string[] {
  // Occasional: it runs when there is something for it, and claims nothing.
  if (!rhythm || !validRhythm(rhythm)) return []
  const every = rhythm.every && rhythm.every > 0 ? rhythm.every : 1
  const weekday = rhythm.weekday
    ? (SERIES_WEEKDAYS.indexOf(rhythm.weekday) + 1) % 7
    : null
  const out: string[] = []
  goalWindows(rhythm.per, startDate, endDate).forEach((w, i) => {
    if (i % every !== 0) return
    if (weekday !== null) {
      for (let d = w.start; d < w.end; d += DAY_MS) {
        if (new Date(d).getUTCDay() === weekday) {
          out.push(isoDay(d))
          break
        }
      }
      return
    }
    const n = Math.round((w.end - w.start) / DAY_MS)
    for (let k = 0; k < rhythm.times; k++)
      out.push(isoDay(w.start + Math.floor((k * n) / rhythm.times) * DAY_MS))
  })
  return out
}

/**
 * What one rhythm claims over the campaign: a slot per day it reserves.
 *
 * One function, in one place, because both the Strategy line and the series'
 * own row ask it. A series' period need not match the campaign's goal
 * cadence: both resolve to absolute counts over the same dates.
 */
export function rhythmClaim(
  rhythm: SeriesRhythm | null,
  startDate: string | null,
  endDate: string | null,
): number {
  return seriesDays(rhythm, startDate, endDate).length
}

/** Whether a rhythm may name a weekday: once a week, and nothing else. */
export function takesWeekday(rhythm: Pick<SeriesRhythm, 'times' | 'per'>) {
  return rhythm.times === 1 && rhythm.per === 'week'
}

/** The server's `SeriesRhythm.Valid`: a rhythm it would plan at all. */
function validRhythm(r: SeriesRhythm): boolean {
  if (!Number.isInteger(r.times) || r.times < 1 || r.times > MAX_RHYTHM_TIMES)
    return false
  if (r.per !== 'week' && r.per !== 'month') return false
  if (r.every !== undefined && (r.every < 0 || r.every > MAX_RHYTHM_EVERY))
    return false
  return !r.weekday || takesWeekday(r)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** A goal period: its first day and the day after its last, UTC ms. */
type Window = { start: number; end: number }

/** `campaigngoal.Windows`: the periods that tile the campaign, in order. */
function goalWindows(
  per: GoalCadence,
  startDate: string | null,
  endDate: string | null,
): Window[] {
  const from = startDate ? calendarParts(startDate) : null
  const to = endDate ? calendarParts(endDate) : null
  if (!from || !to) return []
  const start = Date.UTC(from.y, from.m - 1, from.d)
  const last = Date.UTC(to.y, to.m - 1, to.d)
  if (last < start) return []
  const endExclusive = last + DAY_MS
  const out: Window[] = []
  if (per === 'week') {
    const n = Math.ceil((endExclusive - start) / DAY_MS / 7)
    for (let i = 0; i < n; i++)
      out.push({
        start: start + 7 * i * DAY_MS,
        end: Math.min(start + 7 * (i + 1) * DAY_MS, endExclusive),
      })
    return out
  }
  const months = (to.y - from.y) * 12 + (to.m - from.m) + 1
  for (let i = 0; i < months; i++) {
    const monthStart = Date.UTC(from.y, from.m - 1 + i, 1)
    out.push({
      start: Math.max(monthStart, start),
      end: Math.min(Date.UTC(from.y, from.m + i, 1), endExclusive),
    })
  }
  return out
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
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
    occasional: !run.rhythm,
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
