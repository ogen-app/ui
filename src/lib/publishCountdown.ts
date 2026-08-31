import type { Post } from '@/types/posts'

/**
 * How long until a post goes out, as a unit and a signed count — never as a
 * formatted string.
 *
 * The wording is the caller's business: the phrase is built per render from
 * the catalogue (`posts.publishStatus.*`) and `Intl.RelativeTimeFormat`, so a
 * module here that returned "in 2 days" would bake English into a constant and
 * freeze whichever language loaded first. See `docs/technical-decisions.md#i18n`.
 */
export type CountdownUnit =
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'

export type PublishCountdown = {
  /** Signed: positive is ahead, negative is overdue. Zero reads as "now". */
  value: number
  unit: CountdownUnit
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
/** Not a calendar month — the coarsest bucket, for dates far enough out that
 *  the difference between 30 and 31 days stops being information. */
const MONTH = 30 * DAY

/**
 * The largest unit that still describes the gap honestly.
 *
 * Each step rounds *before* it decides, rather than picking the unit from the
 * raw distance and rounding after: 59 minutes 40 seconds is "in 1 hour", not
 * "in 60 minutes".
 */
export function publishCountdown(
  iso: string | null,
  now: number,
): PublishCountdown | null {
  if (!iso) return null
  const target = new Date(iso).getTime()
  if (Number.isNaN(target)) return null

  const diff = target - now
  const minutes = Math.round(diff / MINUTE)
  // Under a minute either way is "now": naming the seconds would imply a
  // precision the publisher worker's polling interval doesn't have.
  if (Math.abs(minutes) < 1) return { value: 0, unit: 'second' }
  if (Math.abs(minutes) < 60) return { value: minutes, unit: 'minute' }

  const hours = Math.round(diff / HOUR)
  if (Math.abs(hours) < 24) return { value: hours, unit: 'hour' }

  const days = Math.round(diff / DAY)
  if (Math.abs(days) < 7) return { value: days, unit: 'day' }

  const weeks = Math.round(diff / WEEK)
  if (Math.abs(weeks) < 5) return { value: weeks, unit: 'week' }

  return { value: Math.round(diff / MONTH), unit: 'month' }
}

/**
 * How often the phrase has to be recomputed to stay true: often enough that
 * the number on screen is never stale, rarely enough that a post editor left
 * open for an afternoon isn't waking up every second.
 */
export function countdownRefreshMs(unit: CountdownUnit): number {
  switch (unit) {
    case 'second':
    case 'minute':
      return 15_000
    case 'hour':
      return 60_000
    default:
      return 5 * 60_000
  }
}

/** Which promise the status is allowed to make. */
export type PublishMethodKind = 'auto' | 'manual'

export type PublishTiming = {
  method: PublishMethodKind
  countdown: PublishCountdown
}

/**
 * The countdown, but only where "will be published" is actually true.
 *
 * A `draft` or `ready_for_publish` post has a `scheduled_at` too, and it is
 * tempting to count down to it — but nothing publishes it until someone
 * presses SCHEDULE, so the sentence would be a promise the app can't keep.
 * The quick-settings bar says "Planned for …" for those, which is the honest
 * form. Terminal statuses have no future to describe at all.
 *
 * `scheduled_for_manual_publishing` is separated from `scheduled` for the same
 * reason: nothing publishes it either. What arrives on the date is a reminder,
 * and the copy has to say so (see `lib/postStatusMachine`'s cancel/schedule
 * notes for the other places this distinction is load-bearing).
 */
export function publishTiming(post: Post, now: number): PublishTiming | null {
  const method: PublishMethodKind | null =
    post.status === 'scheduled'
      ? 'auto'
      : post.status === 'scheduled_for_manual_publishing'
        ? 'manual'
        : null
  if (!method) return null

  const countdown = publishCountdown(post.scheduled_at, now)
  return countdown ? { method, countdown } : null
}
