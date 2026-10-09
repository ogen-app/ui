import { charCount, markdownToSocialText } from '@/lib/socialText'
import type { StatusTone } from '@/components/ui/status-badge'
import type { FirstCommentDelay, Post } from '@/types/posts'

/**
 * A post's first comment (CON-360/361): what the editor may say about it before
 * it goes out, and what it says once the workers have answered.
 *
 * Pure, no `t` — the route and the card turn these answers into copy. Per the
 * `src/lib/*` rule the server is the source of truth: the limit comes off the
 * post-type rule (`max_first_comment_chars`) and is never held here, and the
 * length is measured exactly as `platforms.checkFirstComment` measures it.
 */

/**
 * The comment's length as the platform will receive it — trimmed, as the
 * server stores it, then flattened and counted in code points, which is the
 * server's `VisibleLen(FlattenSocialText(…))` and the same counter the body
 * uses.
 */
export function firstCommentLength(text: string): number {
  return charCount(markdownToSocialText(text.trim()))
}

/** The post carries a comment worth sending. */
export function hasFirstComment(post: Pick<Post, 'first_comment'>): boolean {
  return (post.first_comment ?? '').trim() !== ''
}

/**
 * Where a comment stands against the post's platform and type.
 *
 * - `unknown` — no limit to measure against: no type picked yet, the rules are
 *   still loading, or the server predates CON-360. Nothing is claimed either
 *   way, so nothing is blocked.
 * - `unsupported` — the type takes no first comment (`0`).
 * - `over` / `ok` — measured against the limit.
 */
export type FirstCommentFit =
  | { state: 'unknown'; length: number }
  | { state: 'unsupported'; length: number }
  | { state: 'over' | 'ok'; length: number; limit: number }

export function firstCommentFit(
  text: string,
  limit: number | undefined,
): FirstCommentFit {
  const length = firstCommentLength(text)
  if (limit === undefined) return { state: 'unknown', length }
  if (limit <= 0) return { state: 'unsupported', length }
  return { state: length > limit ? 'over' : 'ok', length, limit }
}

/**
 * Whether a comment would stop the post leaving draft. Mirrors the server's
 * publish gate, which refuses both an over-limit comment and one on a type
 * that takes none — the text is kept rather than cleared on a switch, so
 * switching back costs nothing, and the gate is what makes keeping it safe.
 */
export function firstCommentBlocks(
  text: string,
  limit: number | undefined,
): boolean {
  if (text.trim() === '') return false
  const fit = firstCommentFit(text, limit)
  return fit.state === 'over' || fit.state === 'unsupported'
}

/**
 * The status line beside the card's heading once the post has left drafting,
 * as a key under `posts.firstComment.status` plus what it interpolates.
 */
export type FirstCommentStatusLine =
  | { key: 'withPost'; tone: StatusTone }
  | { key: 'afterPublish'; tone: StatusTone; minutes: number }
  | { key: 'postingIn'; tone: StatusTone; minutes: number }
  | { key: 'postingNow'; tone: StatusTone }
  | { key: 'delegated'; tone: StatusTone }
  | { key: 'posted'; tone: StatusTone; at: string | undefined }
  | {
      key: 'failed'
      tone: StatusTone
      error: string | undefined
      reconnect: boolean
    }
  | { key: 'skipped'; tone: StatusTone }

/**
 * What the status line says, or `null` when it should say nothing.
 *
 * `null` status means different things either side of publishing: before, it
 * is the plan, and the line states the delay; after, it means the post went
 * out without a comment — a type that took none, or a post published before
 * the feature — and there is nothing true to add.
 */
export function firstCommentStatusLine(
  post: Pick<
    Post,
    | 'status'
    | 'published_at'
    | 'first_comment_delay_minutes'
    | 'first_comment_status'
    | 'first_comment_posted_at'
    | 'first_comment_error'
  >,
  now: number,
): FirstCommentStatusLine | null {
  const delay = post.first_comment_delay_minutes ?? 0
  switch (post.first_comment_status ?? null) {
    case null:
      if (post.status === 'published') return null
      return delay === 0
        ? { key: 'withPost', tone: 'neutral' }
        : { key: 'afterPublish', tone: 'neutral', minutes: delay }
    case 'pending': {
      const remaining = minutesUntilComment(post.published_at, delay, now)
      return remaining === null || remaining <= 0
        ? { key: 'postingNow', tone: 'progress' }
        : { key: 'postingIn', tone: 'progress', minutes: remaining }
    }
    case 'delegated':
      return { key: 'delegated', tone: 'positive' }
    case 'posted':
      return {
        key: 'posted',
        tone: 'positive',
        at: post.first_comment_posted_at,
      }
    case 'failed':
      return {
        key: 'failed',
        tone: 'destructive',
        error: post.first_comment_error,
        reconnect: isPermissionError(post.first_comment_error),
      }
    case 'skipped':
      return { key: 'skipped', tone: 'neutral' }
  }
}

/**
 * Whole minutes until a pending comment is due, rounded up so "~1 min" holds
 * until the minute is really over. `null` when the post carries no publish
 * time to count from.
 */
function minutesUntilComment(
  publishedAt: string | null,
  delay: number,
  now: number,
): number | null {
  if (!publishedAt) return null
  const published = new Date(publishedAt).getTime()
  if (Number.isNaN(published)) return null
  return Math.ceil((published + delay * 60_000 - now) / 60_000)
}

/**
 * The failure is the account's permissions rather than the comment, which a
 * reconnect fixes. The server words a 403 as "the account lacks permission to
 * comment; reconnect it…" and passes anything else through as Zernio said it,
 * so this reads the sentence — there is no code on the field to switch on.
 */
export function isPermissionError(error: string | undefined): boolean {
  return /permission|forbidden|\b403\b/i.test(error ?? '')
}

/** The delay as the API stores it, defaulting a post that predates it to 0. */
export function firstCommentDelay(
  post: Pick<Post, 'first_comment_delay_minutes'>,
): FirstCommentDelay {
  return post.first_comment_delay_minutes ?? 0
}
