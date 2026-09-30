import type { CampaignPhaseWindow, PhaseWindowInput } from '@/types/campaigns'

/**
 * Editing a campaign's phase windows (CON-166) without ever working them out.
 *
 * The windows themselves are the server's: with nothing stored it splits the
 * campaign dates evenly, and that split is what content generation plans into,
 * so a second copy of it here could only disagree. What the client does is
 * narrower — it moves **one boundary** of a plan it was given. A plan is valid
 * when its windows are back to back from the start date to the end date, each
 * at least a day long; moving the end of one phase and the start of the next
 * together can't break the first rule, and bounding the move keeps the second.
 * So every plan this module hands to the PUT is one the server will take.
 *
 * Dates are the wire's inclusive `YYYY-MM-DD` calendar days, and all the
 * arithmetic is done in UTC so a day is always a day — the campaign's own
 * timezone already decided which day is which.
 */

const DAY_MS = 86_400_000

function toDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / DAY_MS
}

function fromDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10)
}

/** `iso` moved by `days` calendar days. */
export function addDays(iso: string, days: number): string {
  return fromDay(toDay(iso) + days)
}

/** How many days a window covers, both ends counted. */
export function windowDays(start: string, end: string): number {
  return toDay(end) - toDay(start) + 1
}

/** A phase whose window is known — every phase of a dated plan. */
export type DatedPhase = CampaignPhaseWindow & {
  start_date: string
  end_date: string
}

export function isDated(phase: CampaignPhaseWindow): phase is DatedPhase {
  return phase.start_date !== null && phase.end_date !== null
}

/**
 * Whether the plan has boundaries anyone could move: two or more dated phases,
 * and a campaign with at least a day for each of them. A campaign shorter than
 * its phase count is still *answered* — the server gives every phase the whole
 * range, which is also what generation uses — but no contiguous plan exists
 * for it, so it can't be edited.
 */
export function canSplit(phases: CampaignPhaseWindow[]): boolean {
  if (phases.length < 2 || !phases.every(isDated)) return false
  const first = phases[0] as DatedPhase
  const last = phases[phases.length - 1] as DatedPhase
  return windowDays(first.start_date, last.end_date) >= phases.length
}

/**
 * The days the boundary after phase `index` may land on: at the earliest its
 * own first day, at the latest the day before the next phase's last, so both
 * keep at least one day.
 */
export function boundaryRange(
  phases: DatedPhase[],
  index: number,
): { min: string; max: string } {
  return {
    min: phases[index].start_date,
    max: addDays(phases[index + 1].end_date, -1),
  }
}

/**
 * The whole plan with phase `index` ending on `end` and the next phase
 * starting the day after — or `null` when `end` is outside
 * `boundaryRange`, which would empty one of the two.
 *
 * Whole because that is the only thing the PUT takes: the server stores a
 * plan entire or not at all.
 */
export function moveBoundary(
  phases: DatedPhase[],
  index: number,
  end: string,
): PhaseWindowInput[] | null {
  if (index < 0 || index >= phases.length - 1) return null
  const { min, max } = boundaryRange(phases, index)
  if (toDay(end) < toDay(min) || toDay(end) > toDay(max)) return null
  return phases.map((p, i) => ({
    phase_id: p.phase_id,
    start_date: i === index + 1 ? addDays(end, 1) : p.start_date,
    end_date: i === index ? end : p.end_date,
  }))
}
