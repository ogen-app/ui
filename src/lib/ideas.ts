/**
 * Ideas — what a workspace could make, and what it has decided about each one.
 *
 * **An idea is a question, and triage is the answer.** That is the whole
 * model, and it is what keeps this from being another task list: a task is
 * work somebody owes, an idea is a proposal nobody owes anything about until
 * it has been answered. So an idea has no assignee and no due date. It has a
 * sentence, and eventually a verdict.
 *
 * Three verdicts, because three is what people actually say when they read a
 * list of proposals: **yes**, **not now**, **no**. Two would force every
 * "interesting, but not this quarter" into one of the other piles, and both
 * are lies — filing it under *yes* pollutes the list of things being made,
 * filing it under *no* throws away a good idea because of its timing.
 *
 * **`later` carries a date, and that is the point of it.** A "maybe" pile with
 * no wake-up is an archive that people feel better about, and the whole reason
 * this module exists is that thoughts do not survive the week they were had
 * in. So a postponed idea names the day it comes back, and on that day it
 * returns to the inbox to be asked again. An idea can be postponed repeatedly
 * — that is a workspace deciding, over and over, that it is not ready, which
 * is information — but it can never be postponed into silence.
 *
 * Everything here is pure and takes `now`, like the other rule files in
 * `lib/`. Nothing in this file reads the clock, the store or the catalogue:
 * the hook (`hooks/useIdeas`) moves these records to and from the API, and the
 * components turn them into words.
 */

/**
 * A verdict, or `null` for an idea nobody has answered yet.
 *
 * `no` rather than `archived`: the pile is named for the decision that put
 * things in it, not for where they ended up. Nothing is deleted by saying no —
 * an archived idea is still readable, and can be sent back to the inbox, which
 * is the only honest way to offer a "no" that costs one keystroke to give.
 */
export type IdeaVerdict = 'yes' | 'later' | 'no'

export type Idea = {
  id: string
  /** The idea itself, in one line. This is the field the list is made of. */
  title: string
  /**
   * The rest of it, when one line was not enough.
   *
   * Optional on purpose and second on purpose: an idea that needs a paragraph
   * before anyone can decide about it is usually an idea whose sentence has
   * not been found yet. Capture is meant to cost one line.
   */
  note: string
  /**
   * The campaign this belongs to, when it belongs to one.
   *
   * Most ideas start with no campaign — that is what the workspace-level list
   * is: everything no campaign has claimed. Naming one is a decision of the
   * same kind as the verdict, and it is why the campaign's own Ideas page is
   * this module filtered rather than a separate store.
   */
  campaignId: string | null
  /** `null` while the idea is still a question. */
  verdict: IdeaVerdict | null
  createdAt: string
  /** The membership that wrote it (`/api/users`), or `null` if unknown. */
  createdBy: string | null
  decidedAt: string | null
  decidedBy: string | null
  /**
   * When a postponed idea returns to the inbox. Meaningful only for `later`,
   * and cleared by every other verdict — see `decideIdea`.
   */
  remindAt: string | null
}

/** How long "not now" lasts. The options the postpone control offers. */
export const POSTPONE_HORIZONS = ['week', 'month', 'quarter'] as const

export type PostponeHorizon = (typeof POSTPONE_HORIZONS)[number]

const HORIZON_DAYS: Record<PostponeHorizon, number> = {
  week: 7,
  month: 30,
  quarter: 90,
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The moment a postponed idea comes back.
 *
 * Whole days added to the clock rather than calendar arithmetic: "a month"
 * here is a rough horizon somebody picked off a menu, not a date they care
 * about, and the difference between 30 days and the 31st of the month is not
 * one anybody will ever notice or want to argue about.
 *
 * Elapsed milliseconds rather than `setDate`, which counts in *local* days: a
 * quarter's horizon crosses a daylight-saving boundary in most of the world,
 * and `setDate` holds the wall clock and moves the instant by an hour to do
 * it. Nobody would be harmed by that hour, but it makes the function's answer
 * depend on the machine's time zone — so the same code gives two results on a
 * developer's laptop and on a UTC CI runner, which is a thing to find out from
 * a test rather than from a flake.
 */
export function postponeUntil(now: Date, horizon: PostponeHorizon): string {
  return new Date(now.getTime() + HORIZON_DAYS[horizon] * DAY_MS).toISOString()
}

/**
 * Whether a postponed idea's day has come.
 *
 * A `later` with no `remindAt` never wakes. That should not happen — every
 * postponement sets one — but the store is schemaless and a row written by an
 * older build of this feature could be missing it, and the safe failure is an
 * idea that stays in the Later pile rather than one that reappears in the
 * inbox every render.
 */
export function hasWokenUp(idea: Idea, now: Date): boolean {
  if (idea.verdict !== 'later' || !idea.remindAt) return false
  const at = Date.parse(idea.remindAt)
  return Number.isFinite(at) && at <= now.getTime()
}

/** Whether this idea is currently a question: never answered, or back again. */
export function isWaiting(idea: Idea, now: Date): boolean {
  return idea.verdict === null || hasWokenUp(idea, now)
}

/**
 * When this idea started waiting for its answer — the sort key of the inbox.
 *
 * Not `createdAt`: a postponed idea that has just woken has been waiting since
 * it woke, not since it was written months ago, and ordering by creation would
 * bury today's returning ideas under everything that was ever captured. The
 * question the inbox is sorted by is "how long has this gone unanswered", and
 * for a woken idea the clock restarted.
 */
export function waitingSince(idea: Idea): string {
  return idea.verdict === 'later' && idea.remindAt
    ? idea.remindAt
    : idea.createdAt
}

/**
 * The inbox, oldest first.
 *
 * Oldest first, and deliberately: a queue that shows the newest idea first
 * never reaches the bottom, which is exactly how a backlog becomes a place
 * things go to be forgotten. The one that has waited longest is the one that
 * most needs an answer.
 */
export function triageQueue(ideas: Idea[], now: Date): Idea[] {
  return ideas
    .filter((idea) => isWaiting(idea, now))
    .sort((a, b) => Date.parse(waitingSince(a)) - Date.parse(waitingSince(b)))
}

/**
 * One decided pile, newest decision first.
 *
 * A woken `later` is not in its own pile any more — it is back in the inbox,
 * and showing it in both would make the counts add up to more than the list.
 */
export function decidedIdeas(
  ideas: Idea[],
  verdict: IdeaVerdict,
  now: Date,
): Idea[] {
  return ideas
    .filter((idea) => idea.verdict === verdict && !isWaiting(idea, now))
    .sort(
      (a, b) =>
        Date.parse(b.decidedAt ?? b.createdAt) -
        Date.parse(a.decidedAt ?? a.createdAt),
    )
}

export type IdeaCounts = Record<IdeaVerdict | 'waiting', number>

/**
 * What each pile holds right now. Every idea is counted exactly once, which is
 * the property worth having: these numbers are drawn as tabs, and a set of
 * tabs whose figures do not sum to the list is a bug people report as "the
 * count is wrong" long after they have stopped trusting the screen.
 */
export function countIdeas(ideas: Idea[], now: Date): IdeaCounts {
  const counts: IdeaCounts = { waiting: 0, yes: 0, later: 0, no: 0 }
  for (const idea of ideas) {
    if (isWaiting(idea, now)) counts.waiting += 1
    else if (idea.verdict) counts[idea.verdict] += 1
  }
  return counts
}

/** A freshly captured idea: a sentence and nothing decided about it. */
export function newIdea(fields: {
  id: string
  title: string
  note?: string
  campaignId?: string | null
  by?: string | null
  at: Date
}): Idea {
  return {
    id: fields.id,
    title: fields.title.trim(),
    note: fields.note?.trim() ?? '',
    campaignId: fields.campaignId ?? null,
    verdict: null,
    createdAt: fields.at.toISOString(),
    createdBy: fields.by ?? null,
    decidedAt: null,
    decidedBy: null,
    remindAt: null,
  }
}

/**
 * Answering an idea.
 *
 * `remindAt` is set for `later` and **cleared for everything else**, which is
 * the one rule in here it would be easy to leave out and expensive to get
 * wrong: postpone an idea to next month, archive it this afternoon, and a
 * surviving wake-up would pull it back out of the archive on a day nobody
 * remembers choosing. A verdict replaces the one before it whole.
 */
export function decideIdea(
  idea: Idea,
  verdict: IdeaVerdict,
  options: { at: Date; by?: string | null; remindAt?: string | null },
): Idea {
  return {
    ...idea,
    verdict,
    decidedAt: options.at.toISOString(),
    decidedBy: options.by ?? null,
    remindAt: verdict === 'later' ? (options.remindAt ?? null) : null,
  }
}

/**
 * Putting an idea back to the question it was.
 *
 * Every decision is reversible, and this is what makes saying no cheap enough
 * to be honest: triage is only fast if a wrong answer costs nothing. The
 * record of the previous decision goes with it — keeping `decidedAt` on an
 * undecided idea would leave a row claiming to have been answered and not to
 * have a verdict, and something would eventually believe one half of it.
 */
export function returnToInbox(idea: Idea): Idea {
  return {
    ...idea,
    verdict: null,
    decidedAt: null,
    decidedBy: null,
    remindAt: null,
  }
}

/**
 * Reads a stored list, dropping anything that isn't an idea.
 *
 * Same contract as `parseTasks`: the store is schemaless and can hold whatever
 * an older build wrote, so a malformed row is skipped rather than thrown on.
 * Losing one idea is better than a screen that will not render.
 */
export function parseIdeas(raw: unknown): Idea[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isIdea).map((idea) => ({ ...idea, note: idea.note ?? '' }))
}

function isVerdict(value: unknown): value is IdeaVerdict {
  return value === 'yes' || value === 'later' || value === 'no'
}

function isIdea(value: unknown): value is Idea {
  if (typeof value !== 'object' || value === null) return false
  const idea = value as Partial<Idea>
  return (
    typeof idea.id === 'string' &&
    typeof idea.title === 'string' &&
    // Absent is the migration `parseIdeas` fills in; present must be text.
    (idea.note === undefined || typeof idea.note === 'string') &&
    (idea.campaignId === null || typeof idea.campaignId === 'string') &&
    (idea.verdict === null || isVerdict(idea.verdict)) &&
    typeof idea.createdAt === 'string' &&
    (idea.createdBy === null || typeof idea.createdBy === 'string') &&
    (idea.decidedAt === null || typeof idea.decidedAt === 'string') &&
    (idea.decidedBy === null || typeof idea.decidedBy === 'string') &&
    (idea.remindAt === null || typeof idea.remindAt === 'string')
  )
}
