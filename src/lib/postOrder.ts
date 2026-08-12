import type { Post } from '@/types/posts'

/**
 * The one order the app walks a campaign's posts in: oldest first, by the
 * moment the post is meant to go out.
 *
 * `scheduled_at` is the field, not `published_at`, so that this agrees with
 * where the calendar puts the post. A published post keeps the slot it was
 * published from; moving it to its actual publish instant would make stepping
 * through posts disagree with the grid the user just stepped off.
 */
function publishTime(post: Post): number {
  if (!post.scheduled_at) return Number.POSITIVE_INFINITY
  const time = new Date(post.scheduled_at).getTime()
  // An unparseable date is not a date. Treating it as "no date" puts it with
  // the unscheduled posts instead of at the epoch, which is where NaN would
  // otherwise sort it — first, ahead of everything real.
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

/**
 * Oldest → newest, with the unscheduled posts last.
 *
 * Unscheduled sorts as *furthest in the future* rather than as "no position":
 * a post with no date is one nothing has been decided about yet, which is
 * ahead of everything already placed.
 *
 * Ties break on `id`. Any stable rule would do — what matters is that it never
 * changes, because the order is walked one step at a time from wherever the
 * user is. A tie-break that depended on anything editable (title, status,
 * updated_at) could reorder two posts *while* the user was between them, and
 * → then ← would not come back to where they started.
 */
export function comparePostOrder(a: Post, b: Post): number {
  const timeA = publishTime(a)
  const timeB = publishTime(b)
  // Both unscheduled compare equal here (Infinity !== Infinity is false) and
  // fall through to the id, which is the point — subtracting them would give
  // NaN and leave the sort undefined.
  if (timeA !== timeB) return timeA - timeB
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

export type PostNeighbours = {
  /** The next post back in time, or null at the start of the campaign. */
  previous: Post | null
  /** The next post forward, or null at the end. */
  next: Post | null
}

/** Who sits either side of this post in the campaign's order. */
export function postNeighbours(posts: Post[], postId: string): PostNeighbours {
  const ordered = [...posts].sort(comparePostOrder)
  const index = ordered.findIndex((post) => post.id === postId)
  // The post isn't in the list — a stale id, or a list that hasn't arrived
  // yet. No neighbours means the keys stay unbound rather than jumping
  // somewhere arbitrary.
  if (index === -1) return { previous: null, next: null }
  return {
    previous: ordered[index - 1] ?? null,
    next: ordered[index + 1] ?? null,
  }
}
