import type { Post } from '@/types/posts'
import { DELETABLE_STATUSES } from '@/types/posts'
import { canEditScheduledAt } from '@/lib/postStatusMachine'
import { fromLocalParts, toLocalParts } from '@/lib/postSchedule'

/**
 * Splitting a bulk action into the rows it will touch and the rows it must
 * leave alone, so the caller can report both.
 *
 * Every bulk action here is "apply the same edit to each of these posts", and
 * the interesting part is always what it refuses to do: a `scheduled` post's
 * date belongs to the Zernio submission, not to us (`canEditScheduledAt`), and
 * silently rewriting it would move the displayed date without moving the
 * actual publish.
 */
export type BulkPlan = {
  /** Posts the edit applies to, already carrying their new value. */
  changes: { post: Post; scheduled_at: string | null }[]
  /** Posts left untouched, and why — one reason per group, for one message. */
  skipped: { count: number; reason: string }[]
}

function plan(
  posts: Post[],
  next: (post: Post) => string | null | undefined,
  extraReason?: (post: Post) => string | undefined,
): BulkPlan {
  const changes: BulkPlan['changes'] = []
  const reasons = new Map<string, number>()
  const skip = (reason: string) => reasons.set(reason, (reasons.get(reason) ?? 0) + 1)

  for (const post of posts) {
    if (!canEditScheduledAt(post.status)) {
      skip(post.status === 'published' ? 'already published' : 'already scheduled')
      continue
    }
    const reason = extraReason?.(post)
    if (reason) {
      skip(reason)
      continue
    }
    const scheduled_at = next(post)
    if (scheduled_at === undefined) continue
    if (scheduled_at === post.scheduled_at) continue
    changes.push({ post, scheduled_at })
  }

  return {
    changes,
    skipped: [...reasons].map(([reason, count]) => ({ count, reason })),
  }
}

/**
 * Move every selected post to `dateStr` ("YYYY-MM-DD"), keeping each post's
 * own time of day. A post with no date yet gets the default hour, the same as
 * picking a day on the calendar does.
 */
export function planSetDate(posts: Post[], dateStr: string): BulkPlan {
  return plan(posts, (post) => {
    const { timeStr } = toLocalParts(post.scheduled_at)
    return fromLocalParts(dateStr, timeStr)
  })
}

/**
 * Move every selected post to `timeStr` ("HH:MM") on the day it already sits
 * on. Posts with no date are skipped rather than invented onto today — a bulk
 * edit that schedules previously-unscheduled posts is not what "set the time"
 * asks for.
 */
export function planSetTime(posts: Post[], timeStr: string): BulkPlan {
  return plan(
    posts,
    (post) => {
      const { dateStr } = toLocalParts(post.scheduled_at)
      return fromLocalParts(dateStr, timeStr)
    },
    (post) => (post.scheduled_at ? undefined : 'have no date yet'),
  )
}

/** Clear the schedule on every selected post that still owns its date. */
export function planClearDate(posts: Post[]): BulkPlan {
  return plan(posts, () => null)
}

/** Which of the selected posts may actually be deleted. */
export function planDelete(posts: Post[]): { deletable: Post[]; blocked: number } {
  const deletable = posts.filter((p) => DELETABLE_STATUSES.includes(p.status))
  return { deletable, blocked: posts.length - deletable.length }
}

/** "3 posts updated · 2 already scheduled" — one line covering both halves. */
export function describeResult(applied: number, skipped: BulkPlan['skipped']): string {
  const head = applied === 1 ? '1 post updated' : `${applied} posts updated`
  if (skipped.length === 0) return head
  const tail = skipped.map((s) => `${s.count} ${s.reason}`).join(', ')
  return `${head} · ${tail}`
}
