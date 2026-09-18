// The pure derivations behind Activity (CON-225): what goes in the feed, and in
// what order. Everything here is a pure function of already-fetched data, with
// `now` injected, so the rules stay unit-testable. No fetching, no stores. Same
// shape as `campaignReadiness`, and for the same reasons.
//
// **This is Phase 2**: the notifications table exists (CON-242), so what
// happened is *recorded* rather than inferred. The feed has two sources and
// they are different in kind:
//
// - **Notifications** — rows the server wrote at the moment something happened,
//   carrying their own read state. History, and it does not get undone.
// - **Daily reports** — one per local day that had anything on it, counted by
//   the server (CON-285). This file no longer computes them. CON-225 §5
//   specified the arithmetic here, over the campaign summaries the Campaigns
//   list fetches anyway, and the reason was the day boundary: the server had no
//   way to know the reader's midnight. CON-285 answered that by asking for it
//   — every call carries an IANA `tz` — and took the arithmetic with it. What
//   the trade bought is the two facts `PostSummary` could not reach: who
//   created a post, and why one failed.
//
// The derived post *exceptions* Phase 1 carried are gone. They were a stand-in
// for `post.publish_failed`, and keeping both would report one failure twice —
// once as a record and once as a re-reading of current state that disappears
// the moment the post is edited. What the recorded half does not yet cover is
// written down in the `activity` flag's comment, because it is a question for
// the back end rather than a gap to paper over here.
//
// The rule deciding what is allowed in here at all is edges vs levels — an
// entry is a fact with a timestamp that stays true forever, never a condition
// that stops being true when it is fixed. See `docs/activity.md`.

import type { Task } from '@/lib/tasks'
import type { AppNotification } from '@/types/notifications'
import type { ActivityReportSummary } from '@/types/activity'

export type ActivityEntry =
  // A day's headline totals. The row carries only what the list endpoint sends;
  // opening it fetches the day itself.
  | { kind: 'report'; id: string; at: string; report: ActivityReportSummary }
  // One recorded notification, carried whole: the entry adds nothing the row
  // does not already say, and flattening it here would mean re-deciding what a
  // notification is every time the server grows a producer.
  | {
      kind: 'notification'
      id: string
      at: string
      notification: AppNotification
    }
  // What happened *to a task*, never the task itself. A task is a level — it
  // sits in the card above until it is finished — but a task being written,
  // finished or resolving itself is a fact with a time on it, and this is
  // where facts with times live.
  | {
      kind: ActivityTaskKind
      id: string
      at: string
      taskId: string
      title: string
      campaignId: string | null
    }

const TASK_KINDS = ['task_created', 'task_completed', 'task_resolved'] as const
export type ActivityTaskKind = (typeof TASK_KINDS)[number]

/** Narrows an entry to the task ones — the union has three shapes now. */
export function isTaskEntry(
  entry: ActivityEntry,
): entry is Extract<ActivityEntry, { kind: ActivityTaskKind }> {
  return (TASK_KINDS as readonly string[]).includes(entry.kind)
}

/** Narrows to a recorded notification — the entries with a server row behind them. */
export function isNotificationEntry(
  entry: ActivityEntry,
): entry is Extract<ActivityEntry, { kind: 'notification' }> {
  return entry.kind === 'notification'
}

/**
 * The local calendar day a moment falls in, `YYYY-MM-DD`.
 *
 * Local, not UTC, and deliberately not `toISOString().slice(0, 10)` — that
 * reads the UTC day, so anything happening in the evening west of Greenwich
 * would land under tomorrow's heading. The day boundary is the reader's own,
 * which is the same boundary the report is cut by: the zone this produces a key
 * in is the zone sent to the server as `tz` (`browserTimeZone`), and the two
 * disagreeing is what would put a notification under the wrong day's card.
 */
export function dayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Parses a `YYYY-MM-DD` day key back to local midnight, or null if malformed. */
export function parseDayKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  // Rejects the dates that only look valid — 2026-02-31 rolls into March.
  return dayKey(date) === key ? date : null
}

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Everything that happened to the tasks, as entries.
 *
 * Three moments, and deliberately not a fourth: a task the *system* raised is
 * not news — the task itself is the notification, and logging "the computer
 * noticed something" beside it says the same thing twice. What a person did
 * (wrote it, finished it) and what the system did without being asked
 * (resolved it) are both worth a line.
 */
export function taskEntries(tasks: Task[]): ActivityEntry[] {
  const entries: ActivityEntry[] = []

  for (const task of tasks) {
    if (task.source.kind === 'manual') {
      entries.push({
        kind: 'task_created',
        id: `task_created:${task.id}`,
        at: task.createdAt,
        taskId: task.id,
        title: task.title,
        campaignId: task.campaignId,
      })
    }

    if (task.status === 'done' && task.closedAt) {
      const kind =
        task.closedReason === 'auto' ? 'task_resolved' : 'task_completed'
      entries.push({
        kind,
        id: `${kind}:${task.id}`,
        at: task.closedAt,
        taskId: task.id,
        title: task.title,
        campaignId: task.campaignId,
      })
    }
  }

  return entries
}

/** Everything the feed is built from. */
export type ActivitySources = {
  /** The days that had something on them, newest first (CON-285). */
  reports?: ActivityReportSummary[]
  /** Recorded notifications, newest first (CON-242). */
  notifications?: AppNotification[]
  tasks?: Task[]
}

/**
 * The feed: what was recorded as it happened, what happened to the tasks, plus
 * one report entry per day.
 *
 * The classes are the whole design. A notification is something that went wrong
 * or now needs a person or finished without them, and it appears at the moment
 * it happened. Everything routine — created, published — rolls into the day's
 * report, because successful auto-publishing is the highest-volume thing that
 * happens and listing it one line at a time is what teaches people to stop
 * reading the badge.
 *
 * Future-dated entries are dropped from every half. A clock skew on the server
 * or a zone the two ends disagree about must not park a row above today's,
 * permanently first and never reachable by scrolling down.
 */
export function activityFeed(
  sources: ActivitySources,
  now: Date = new Date(),
): ActivityEntry[] {
  const entries: ActivityEntry[] = []

  for (const entry of taskEntries(sources.tasks ?? [])) {
    if (Date.parse(entry.at) > now.getTime()) continue
    entries.push(entry)
  }

  for (const notification of sources.notifications ?? []) {
    const at = parseDate(notification.created_at)
    if (!at || at.getTime() > now.getTime()) continue
    entries.push({
      kind: 'notification',
      // Prefixed rather than bare: entry ids share one namespace across three
      // kinds, and a sqid colliding with a day key is only unlikely.
      id: `notification:${notification.id}`,
      at: at.toISOString(),
      notification,
    })
  }

  const today = dayKey(now)
  for (const report of sources.reports ?? []) {
    // A report is a *day*, not a moment, so it is placed at the day's local
    // midnight. That is also what puts it last inside its own card: the card's
    // entries run newest first, and nothing that happened on a day is earlier
    // than the day began — so the summary closes the group it summarises
    // rather than heading it, which is where it was placed when this was
    // computed here and the last event of the day was its timestamp.
    const midnight = parseDayKey(report.date)
    if (!midnight || report.date > today) continue
    entries.push({
      kind: 'report',
      id: `report:${report.date}`,
      at: midnight.toISOString(),
      report,
    })
  }

  // Same instant puts the report last — the midnight case, for anything
  // recorded exactly as the day opened — so the day's summary still reads as
  // closing the group above it rather than heading it.
  return entries.sort(
    (a, b) =>
      new Date(b.at).getTime() - new Date(a.at).getTime() ||
      (a.kind === 'report' ? 1 : 0) - (b.kind === 'report' ? 1 : 0),
  )
}
