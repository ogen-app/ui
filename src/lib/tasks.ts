import type { FixTarget } from '@/lib/campaignReadiness'
import type { WorkspaceWarning } from '@/lib/workspaceWarnings'

/**
 * Tasks (CON-225) — the workspace's work, as records.
 *
 * **A task is not a warning.** A warning (`lib/workspaceWarnings.ts`) is a
 * condition: derived, ownerless, true only while it is true. A task is a
 * *thing somebody made* — by the system, watching the warnings, or by a person
 * typing one — and it has the properties a condition cannot have: an author,
 * an assignee, a moment it was created, and a moment it was finished. It
 * outlives the warning that caused it.
 *
 * Most tasks come from warnings, and that is the only relationship between
 * them: `source` records which rule and campaign a task was raised from, so
 * the system can recognise its own work and not raise it twice. A task with no
 * warning behind it is just as real.
 *
 * What follows from that, and is worth stating because the first draft of this
 * file got it wrong:
 *
 * - **Closing a task does not fix anything.** The warning goes when the work
 *   is done, not when the row is ticked. A task ticked while its condition
 *   still holds is a judgement ("we know, it's fine"), which is a thing people
 *   need to be able to say.
 * - **A cleared warning does not delete its task** — it *resolves* it, with
 *   `closedReason: 'auto'`, so the record and its assignee survive as history.
 *   That closure is an edge, and edges belong in the feed.
 * - **Only `alert` and `risk` warnings raise tasks.** The hygiene nudges are
 *   real advice and terrible work items; a list that fills with them is a list
 *   nobody opens.
 * - **Any task can be deleted, and deleting is final.** "I don't care about
 *   this one" is a legitimate answer to work the system raised, so a rule task
 *   is deletable exactly like a hand-written one. Its id is derived from the
 *   rule, though, so a removed row would be raised again on the next pass —
 *   which is what `dismissed` is: a tombstone that keeps the deletion from
 *   undoing itself. The *warning* is untouched and stays on its campaign, where
 *   the fix is; it simply never becomes work again.
 */

/**
 * `dismissed` is a deleted task, not a third kind of closure the user picks —
 * nothing renders it. It is a row that exists only so its id stays taken.
 */
export type TaskStatus = 'open' | 'done' | 'dismissed'

/** Why a task exists: the system saw a warning, or a person wrote it. */
export type TaskSource =
  | { kind: 'rule'; campaignId: string; ruleId: string }
  | { kind: 'manual' }

export type Task = {
  id: string
  title: string
  /**
   * The task in more than a line — what the work actually is.
   *
   * Only a person's words live here. A rule task's explanation is the *rule's*,
   * not this row's: it is the same paragraph for every campaign that trips it,
   * it is catalogue copy, and freezing a copy of it into each raised row would
   * mean a re-wording never reaching the tasks already raised — and, in a
   * translated build, whichever language happened to be loaded when the warning
   * appeared. So rule tasks store `''` and the screen reads their description
   * from the catalogue by rule id (`hooks/useTaskDescription`).
   */
  description: string
  source: TaskSource
  /** The campaign this is about, when it is about one. Manual tasks may not be. */
  campaignId: string | null
  /** Where the work is done — the warning's single destination, when it had one. */
  fix: FixTarget | null
  /**
   * A membership id from this workspace (`/api/users`). Ids are per-workspace
   * since CON-147, which is right here: the task lives in the workspace too.
   */
  assigneeId: string | null
  status: TaskStatus
  createdAt: string
  /** The membership that wrote it, or `null` when the system raised it. */
  createdBy: string | null
  closedAt: string | null
  /** Who ticked it, or `null` when the warning cleared and it resolved itself. */
  closedBy: string | null
  closedReason: 'completed' | 'auto' | 'dismissed' | null
}

/**
 * The tombstone a deleted task leaves. Only a rule task needs one — nothing
 * would ever write a manual task again, so that row is simply gone.
 */
export function dismissTask(
  task: Task,
  by: string | null,
  now: Date = new Date(),
): Task {
  return {
    ...task,
    status: 'dismissed',
    closedAt: now.toISOString(),
    closedBy: by,
    closedReason: 'dismissed',
  }
}

/**
 * Warnings worth a task. `todo` and `info` are advice — they belong on the
 * campaign's rail, where the fix is, and would otherwise arrive as work
 * nobody asked for.
 */
export const TASK_RAISING_SEVERITIES = ['alert', 'risk'] as const

/**
 * The id a warning's task always gets, so raising it is idempotent: two tabs,
 * a refetch and a reload all converge on the same row instead of three.
 */
export function ruleTaskId(campaignId: string, ruleId: string): string {
  return `rule:${campaignId}:${ruleId}`
}

/** A manual task's id. Random, because two people can write the same title. */
export function manualTaskId(seed: string): string {
  return `manual:${seed}`
}

/**
 * Reads the stored list, dropping anything that isn't a task.
 *
 * The store is a key/value row holding JSON (see `hooks/useTasks`), so it can
 * hold whatever an older build of this feature wrote. A malformed row is
 * skipped rather than thrown on: losing one task is better than a screen that
 * won't render.
 */
export function parseTasks(raw: string | null): Task[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  // `description` is newer than the first rows written here, and the store is
  // schemaless. A row without one is filled in rather than dropped — the field
  // is not what makes it a task.
  return parsed
    .filter(isTask)
    .map((task) => ({ ...task, description: task.description ?? '' }))
}

function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false
  const task = value as Partial<Task>
  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    (task.status === 'open' ||
      task.status === 'done' ||
      task.status === 'dismissed') &&
    typeof task.createdAt === 'string' &&
    typeof task.source === 'object' &&
    task.source !== null
  )
}

export function serializeTasks(tasks: Task[]): string {
  return JSON.stringify(tasks)
}

/**
 * Brings the stored tasks in line with what is currently wrong.
 *
 * Three moves, and nothing else — in particular it never edits a title, an
 * assignee or a manual task, because those are somebody's:
 *
 * 1. a warning with no task raises one, authored by the system;
 * 2. a warning whose task was resolved and which is *back* reopens it, rather
 *    than raising a second row for the same rule;
 * 3. an open system task whose warning has gone resolves itself.
 *
 * A dismissed task is none of the three: it is a tombstone, and the loop steps
 * over it so a deleted task cannot come back.
 *
 * Pure and `now`-injected, like every rule file here. It returns `null` when
 * nothing changed, so the caller can tell "already correct" from "written" and
 * not put a request behind every render.
 */
export function reconcileTasks(
  stored: Task[],
  warnings: WorkspaceWarning[],
  now: Date = new Date(),
): Task[] | null {
  const raising = new Set<string>(TASK_RAISING_SEVERITIES)
  const live = new Map(
    warnings
      .filter((warning) => raising.has(warning.severity))
      .map((warning) => [
        ruleTaskId(warning.campaignId, warning.item.id),
        warning,
      ]),
  )
  const at = now.toISOString()
  let changed = false

  const next = stored.map((task) => {
    if (task.source.kind !== 'rule') return task
    // A deleted task is finished with. Its row is here to keep the id taken —
    // reopening or re-raising it is precisely what the user said no to.
    if (task.status === 'dismissed') return task
    const warning = live.get(task.id)

    if (warning && task.status === 'done' && task.closedReason === 'auto') {
      // It came back. Reopening keeps one row per rule, so the history of this
      // particular problem stays in one place instead of accumulating a row
      // per recurrence.
      changed = true
      return {
        ...task,
        status: 'open' as const,
        closedAt: null,
        closedBy: null,
        closedReason: null,
      }
    }

    if (!warning && task.status === 'open') {
      changed = true
      return {
        ...task,
        status: 'done' as const,
        closedAt: at,
        closedBy: null,
        closedReason: 'auto' as const,
      }
    }

    return task
  })

  const known = new Set(next.map((task) => task.id))
  for (const [id, warning] of live) {
    if (known.has(id)) continue
    changed = true
    next.push({
      id,
      title: warning.item.label,
      // Empty by design — see `Task.description`. What this task is about is
      // the rule's paragraph, read from the catalogue at render.
      description: '',
      source: {
        kind: 'rule',
        campaignId: warning.campaignId,
        ruleId: warning.item.id,
      },
      campaignId: warning.campaignId,
      fix: warning.item.fix,
      assigneeId: null,
      status: 'open',
      createdAt: at,
      createdBy: null,
      closedAt: null,
      closedBy: null,
      closedReason: null,
    })
  }

  return changed ? next : null
}

export function openTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.status === 'open')
}

/**
 * Reading order: open before done, and inside each, newest first.
 *
 * Deliberately not by severity. A task is not a warning — its urgency belongs
 * to the person who owns it, and the campaign's rail is where the severities
 * are ranked. Sorting work by the machine's opinion of it would put a hygiene
 * item somebody took on below a failure nobody has looked at.
 */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1
    const aAt = a.status === 'open' ? a.createdAt : (a.closedAt ?? a.createdAt)
    const bAt = b.status === 'open' ? b.createdAt : (b.closedAt ?? b.createdAt)
    return Date.parse(bAt) - Date.parse(aAt)
  })
}
