// The pure derivations behind Activity (CON-225): the feed's entries and the
// daily report. Everything here is a pure function of already-fetched data —
// the batched campaign summaries the Campaigns list reads anyway (CON-152) —
// with `now` injected, so the rules stay unit-testable. No fetching, no stores.
// Same shape as `campaignReadiness`, and for the same reasons.
//
// **This is Phase 1: there is no notifications table yet.** So every entry is
// *derived* from current post state rather than recorded when it happened, and
// that ceiling is worth naming:
//
// - An entry disappears if the state it was derived from changes. Re-publish a
//   failed post and the failure leaves the feed, where a persisted notification
//   would stay — it is history, and history doesn't get undone.
// - Only outcomes visible in `PostSummary` can appear. Assistant turns, content
//   plans, asset processing and connection health leave no trace in it, so the
//   two things the feed is most wanted for — "your long run finished" and "this
//   connection expired" — are exactly what Phase 1 cannot show.
// - `published_at` is the only timestamp the server records for an *outcome*.
//   A failure is dated by when the post was due (`scheduled_at`), falling back
//   to `updated_at`, which a later edit would move.
//
// CON-224 replaces all of it with recorded events. What survives is the report:
// it is a count over posts, so computing it is not a stand-in for anything.
//
// The rule deciding what is allowed in here at all is edges vs levels — an
// entry is a fact with a timestamp that stays true forever, never a condition
// that stops being true when it is fixed. See `docs/activity.md`.

import type { PostSummary } from '@/types/posts'
import type { Task } from '@/lib/tasks'

/**
 * What can happen to a post that a person would want to read about later.
 *
 * `created` is in the report but never in the feed: it is routine, high-volume,
 * and usually the reader's own doing. `published` likewise — successful
 * auto-publishing is the highest-volume thing that happens and the lowest-value
 * thing to list, which is the whole argument for having a report.
 */
export type ActivityEventKind =
  | 'published'
  | 'failed'
  | 'not_published'
  | 'created'

/** The kinds that reach the feed on their own, as exceptions. */
const EXCEPTION_KINDS = ['failed', 'not_published'] as const
export type ActivityExceptionKind = (typeof EXCEPTION_KINDS)[number]

export type PostEvent = {
  kind: ActivityEventKind
  at: Date
  campaignId: string
  post: PostSummary
}

export type CountsByKind = Record<ActivityEventKind, number>

export type ChannelCount = {
  platformId: string
  count: number
}

export type CampaignBreakdown = {
  campaignId: string
  counts: CountsByKind
  total: number
}

export type DailyReport = {
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string
  /** When the last thing on this day happened — the entry's own timestamp. */
  lastEventAt: string
  counts: CountsByKind
  total: number
  /** Published only, biggest first: "3 LinkedIn, 2 Instagram, 1 X". */
  publishedByChannel: ChannelCount[]
  /** Busiest campaign first — the per-campaign half of the report. */
  campaigns: CampaignBreakdown[]
}

export type ActivityEntry =
  | { kind: 'report'; id: string; at: string; report: DailyReport }
  | {
      kind: ActivityExceptionKind
      id: string
      at: string
      postId: string
      campaignId: string
      platformId: string
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

/** Narrows to a post exception, the only entries with a post behind them. */
export function isExceptionEntry(
  entry: ActivityEntry,
): entry is Extract<ActivityEntry, { kind: ActivityExceptionKind }> {
  return (EXCEPTION_KINDS as readonly string[]).includes(entry.kind)
}

/**
 * The local calendar day a moment falls in, `YYYY-MM-DD`.
 *
 * Local, not UTC, and deliberately not `toISOString().slice(0, 10)` — that
 * reads the UTC day, so anything published in the evening west of Greenwich
 * would land in tomorrow's report. The day boundary is the reader's own; there
 * is no timezone to hand the server, the same reason the clock-dependent
 * readiness rules stayed client-side.
 */
export function dayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Midnight at the start of the local day a moment falls in. */
export function startOfDay(date: Date): Date {
  const out = new Date(date)
  out.setHours(0, 0, 0, 0)
  return out
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

function emptyCounts(): CountsByKind {
  return { published: 0, failed: 0, not_published: 0, created: 0 }
}

/**
 * What this post says happened, and when.
 *
 * A post is not one event: it was created on one day and may have published on
 * another, and both belong in their own day's report. Only its *current* status
 * can be read, so it contributes at most one outcome — the last one.
 */
export function postEvents(post: PostSummary, campaignId: string): PostEvent[] {
  const events: PostEvent[] = []

  const created = parseDate(post.created_at)
  if (created) events.push({ kind: 'created', at: created, campaignId, post })

  // `scheduled_at` — when it was *due* — is the truthful moment for an outcome
  // that never produced a `published_at`. `updated_at` is the fallback and a
  // poor one: any later edit moves it, and the entry silently changes day.
  const attempted = parseDate(post.scheduled_at) ?? parseDate(post.updated_at)

  switch (post.status) {
    case 'published': {
      const at = parseDate(post.published_at)
      if (at) events.push({ kind: 'published', at, campaignId, post })
      break
    }
    case 'failed':
      if (attempted)
        events.push({ kind: 'failed', at: attempted, campaignId, post })
      break
    case 'not_published':
      if (attempted)
        events.push({ kind: 'not_published', at: attempted, campaignId, post })
      break
    default:
      // draft / ready_for_publish / scheduled — nothing has happened to them
      // yet. A future publish date is a level, not an edge: it rewrites itself
      // daily and vanishes when the post goes out, so it is the calendar's
      // business and eventually a task's, never the feed's.
      break
  }

  return events
}

/** Every event in the workspace, newest first. */
export function activityEvents(
  summaries: Record<string, PostSummary[]>,
): PostEvent[] {
  const events: PostEvent[] = []
  for (const [campaignId, posts] of Object.entries(summaries)) {
    for (const post of posts) events.push(...postEvents(post, campaignId))
  }
  return events.sort((a, b) => b.at.getTime() - a.at.getTime())
}

function addTo(counts: CountsByKind, kind: ActivityEventKind) {
  counts[kind] += 1
}

/**
 * One report per local day that had anything happen on it, newest first.
 *
 * A day with nothing gets no entry rather than an empty one — a feed of "0
 * posts published" rows for every quiet weekend is noise, and the absence says
 * the same thing.
 *
 * Events dated in the future are dropped: a clock skew or a bad `scheduled_at`
 * must not park a report above today's, permanently unread and never reachable
 * by scrolling.
 */
export function dailyReports(
  summaries: Record<string, PostSummary[]>,
  now: Date = new Date(),
): DailyReport[] {
  type Draft = {
    counts: CountsByKind
    total: number
    lastEventAt: Date
    byChannel: Map<string, number>
    byCampaign: Map<string, { counts: CountsByKind; total: number }>
  }
  const days = new Map<string, Draft>()

  for (const event of activityEvents(summaries)) {
    if (event.at.getTime() > now.getTime()) continue
    const key = dayKey(event.at)
    let draft = days.get(key)
    if (!draft) {
      draft = {
        counts: emptyCounts(),
        total: 0,
        lastEventAt: event.at,
        byChannel: new Map(),
        byCampaign: new Map(),
      }
      days.set(key, draft)
    }

    addTo(draft.counts, event.kind)
    draft.total += 1
    if (event.at > draft.lastEventAt) draft.lastEventAt = event.at

    if (event.kind === 'published') {
      const platformId = event.post.platform_id
      draft.byChannel.set(
        platformId,
        (draft.byChannel.get(platformId) ?? 0) + 1,
      )
    }

    let campaign = draft.byCampaign.get(event.campaignId)
    if (!campaign) {
      campaign = { counts: emptyCounts(), total: 0 }
      draft.byCampaign.set(event.campaignId, campaign)
    }
    addTo(campaign.counts, event.kind)
    campaign.total += 1
  }

  return [...days.entries()]
    .map(
      ([date, draft]): DailyReport => ({
        date,
        lastEventAt: draft.lastEventAt.toISOString(),
        counts: draft.counts,
        total: draft.total,
        publishedByChannel: [...draft.byChannel.entries()]
          .map(([platformId, count]) => ({ platformId, count }))
          .sort(
            (a, b) =>
              b.count - a.count || a.platformId.localeCompare(b.platformId),
          ),
        campaigns: [...draft.byCampaign.entries()]
          .map(([campaignId, entry]) => ({ campaignId, ...entry }))
          .sort(
            (a, b) =>
              b.total - a.total || a.campaignId.localeCompare(b.campaignId),
          ),
      }),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** The report for one day, or null if nothing happened on it. */
export function reportForDay(
  summaries: Record<string, PostSummary[]>,
  date: string,
  now: Date = new Date(),
): DailyReport | null {
  return (
    dailyReports(summaries, now).find((report) => report.date === date) ?? null
  )
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

/**
 * The feed: exceptions as they happened, what happened to the tasks, plus one
 * report entry per day.
 *
 * The classes are the whole design. An exception is something that went wrong
 * or now needs a person, and it appears at the moment it happened. Everything
 * routine — created, published — rolls into the day's report, so the unread
 * count keeps meaning "things you would want to know about".
 */
export function activityFeed(
  summaries: Record<string, PostSummary[]>,
  now: Date = new Date(),
  tasks: Task[] = [],
): ActivityEntry[] {
  const entries: ActivityEntry[] = []

  for (const entry of taskEntries(tasks)) {
    if (Date.parse(entry.at) > now.getTime()) continue
    entries.push(entry)
  }

  for (const event of activityEvents(summaries)) {
    if (event.at.getTime() > now.getTime()) continue
    if (!(EXCEPTION_KINDS as readonly string[]).includes(event.kind)) continue
    entries.push({
      kind: event.kind as ActivityExceptionKind,
      id: `${event.kind}:${event.post.id}`,
      at: event.at.toISOString(),
      postId: event.post.id,
      campaignId: event.campaignId,
      platformId: event.post.platform_id,
    })
  }

  for (const report of dailyReports(summaries, now)) {
    entries.push({
      kind: 'report',
      id: `report:${report.date}`,
      at: report.lastEventAt,
      report,
    })
  }

  // Same instant puts the report last, so the day's summary reads as closing
  // the group of individual entries above it rather than heading it.
  return entries.sort(
    (a, b) =>
      new Date(b.at).getTime() - new Date(a.at).getTime() ||
      (a.kind === 'report' ? 1 : 0) - (b.kind === 'report' ? 1 : 0),
  )
}

/**
 * How many entries the user has not seen.
 *
 * With nothing stored — the first visit, or a workspace the user has never
 * opened Activity in — only today counts. The alternative is honest and
 * useless: a badge showing every failure in the workspace's history on first
 * run, which teaches the reader to ignore it before they have read one entry.
 */
export function unreadCount(
  entries: ActivityEntry[],
  lastSeen: string | null,
  now: Date = new Date(),
): number {
  const since = parseDate(lastSeen) ?? startOfDay(now)
  return entries.filter((entry) => new Date(entry.at) > since).length
}

/** Whether one entry is unread, on the same rule as the count. */
export function isUnread(
  entry: ActivityEntry,
  lastSeen: string | null,
  now: Date = new Date(),
): boolean {
  const since = parseDate(lastSeen) ?? startOfDay(now)
  return new Date(entry.at) > since
}
