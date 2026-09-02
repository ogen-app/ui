/**
 * Thread sequences — a post that publishes as a *chain* of posts rather than
 * one (CON-196).
 *
 * X and Threads both take one: Zernio calls it `platformSpecificData.
 * threadItems`, "the first item is the root post and subsequent items become
 * replies in order" (docs.zernio.com/platforms/threads, /platforms/twitter).
 *
 * **The thread is the body, and nothing else.** The post is written in the one
 * Markdown editor every other post type uses, and the chain is *derived* from
 * it on every keystroke — there is no second copy of the words, no per-post
 * input, and nothing to keep in step. Two rules produce it:
 *
 * 1. **A divider is a break.** A `---` line is a real block in the editor, so
 *    the author sees the seam they typed. Where the body has dividers, they
 *    are the only breaks and blank lines stay inside a post.
 * 2. **With no divider, blank lines are the breaks** — the convention the
 *    preview card has drawn since it learned about threads, and how people
 *    write threads in practice.
 *
 * Then whatever is still past the platform's per-post ceiling is cut to fit,
 * on a sentence boundary where there is one. That last step is why a thread
 * has no "too long" state to report: the length problem is solved rather than
 * flagged, and what the author sees in the preview is what publishes.
 *
 * The one thing a body cannot express is **which post carries which file**, so
 * that — and only that — is stored: `ThreadAssignment`, a map from attachment
 * id to the post it rides. Attachments stay post-level rows, and a file nobody
 * assigned rides the first post, which is what the X card always drew.
 */
import { charCount, markdownToSocialText, splitThread } from '@/lib/socialText'
import { attachmentKind, type PostAttachment } from '@/types/attachments'

/**
 * The post-type slug a sequence publishes under. The same one X has always
 * had — this is the feature that makes it mean something.
 */
export const SEQUENCE_SLUG = 'thread'

/**
 * Zernio's ids for the networks that take `threadItems`. The overview table at
 * docs.zernio.com/platforms lists only X, but the Threads platform page
 * documents a "Thread Sequence" content type with the identical field, so both
 * are here. LinkedIn, Facebook, Instagram and YouTube have no equivalent.
 */
const SEQUENCE_NETWORKS: ReadonlySet<string> = new Set(['twitter', 'threads'])

/**
 * A ceiling of ours, not the platforms'. Zernio documents no maximum item
 * count for either network, and neither does Meta — but a body that splits
 * into fifty posts is a mistake rather than a thread, and it is better to say
 * so than to publish it.
 */
export const MAX_THREAD_POSTS = 25

/**
 * A divider line, matching `markdownToSocialText`'s own test for one so the
 * two can never disagree about what is a break and what is copy. BlockNote
 * parses `---` into a `divider` block and writes it back as `***`, so both
 * forms arrive here.
 */
const DIVIDER = /^\s*([-*_])(\s*\1){2,}\s*$/

/** A fence opening or closing, so a `---` inside a code block is not a break. */
const FENCE = /^\s*(```|~~~)/

/**
 * How full a post has to be before a nicer break is worth taking. Ending on a
 * sentence is better than ending mid-word, but not at the price of publishing
 * a post half the length it could have been.
 */
const MIN_FILL = 0.6

/** Which rule produced the breaks — what the note under the editor reports. */
export type SplitRule = 'divider' | 'blank-line'

/**
 * Which post of the thread carries an attachment, by attachment id. 0-based,
 * and absent means the first post.
 *
 * The only part of a thread that is stored, because it is the only part the
 * body cannot say. Everything else is derived from `content`.
 */
export type ThreadAssignment = Record<string, number>

export function supportsSequence(zernioId: string | undefined): boolean {
  return !!zernioId && SEQUENCE_NETWORKS.has(zernioId)
}

/** Whether this (platform, post type) pair publishes as a chain. */
export function isSequencePost(
  zernioId: string | undefined,
  postType: string,
): boolean {
  return postType === SEQUENCE_SLUG && supportsSequence(zernioId)
}

/**
 * The body cut at its dividers, or `null` when it has none.
 *
 * Returns the Markdown of each part rather than its text: flattening happens
 * once, per part, in `splitBody` — running it first would erase the very lines
 * this is looking for, since a thematic break has no plain-text equivalent.
 */
function splitAtDividers(markdown: string): string[] | null {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const parts: string[][] = [[]]
  let inFence = false
  let found = false

  for (const line of lines) {
    if (FENCE.test(line)) inFence = !inFence
    if (!inFence && DIVIDER.test(line)) {
      found = true
      parts.push([])
      continue
    }
    parts[parts.length - 1].push(line)
  }

  return found ? parts.map((part) => part.join('\n')) : null
}

/**
 * The body, broken into the posts the author asked for — before any ceiling is
 * applied. Empty parts are dropped: a divider typed against another one, or a
 * trailing one left while writing, is a seam rather than a post.
 */
export function splitBody(markdown: string): {
  parts: string[]
  rule: SplitRule
} {
  const dividers = splitAtDividers(markdown ?? '')
  if (dividers) {
    const parts = dividers
      .map((part) => markdownToSocialText(part))
      .filter((part) => part.length > 0)
    return { parts: parts.length > 0 ? parts : [''], rule: 'divider' }
  }
  const flat = markdownToSocialText(markdown ?? '')
  return { parts: splitThread(flat), rule: 'blank-line' }
}

/** The UTF-16 offset `codePoints` code points into `text`. */
function utf16IndexAt(text: string, codePoints: number): number {
  let i = 0
  for (let n = 0; n < codePoints && i < text.length; n++) {
    i += (text.codePointAt(i) as number) > 0xffff ? 2 : 1
  }
  return i
}

/** The end of the last sentence in `window`, or -1. */
function lastSentenceEnd(window: string): number {
  const pattern = /[.!?…]["'”’)\]]*(?=\s)/g
  let at = -1
  let match: RegExpExecArray | null
  while ((match = pattern.exec(window)) !== null) {
    at = match.index + match[0].length
  }
  return at
}

/**
 * Where to cut a post that is past the ceiling: the last sentence end that
 * leaves the post reasonably full, else a line break, else a space. A single
 * unbroken token longer than the limit — a URL, a pasted key — is cut where
 * the limit falls, because there is nowhere better and dropping it silently
 * would be worse.
 */
function cutPoint(text: string, limit: number): number {
  const hard = utf16IndexAt(text, limit)
  if (hard >= text.length) return text.length
  const window = text.slice(0, hard)
  const floor = hard * MIN_FILL

  const sentence = lastSentenceEnd(window)
  if (sentence > floor) return sentence

  const newline = window.lastIndexOf('\n')
  if (newline > floor) return newline

  const space = window.lastIndexOf(' ')
  if (space > 0) return space

  return hard
}

/**
 * One part of the body, cut into posts that fit. Returns the part unchanged
 * when it already does, or when there is no ceiling to fit it to — a limit
 * still loading (`undefined`) must never produce a split that then moves.
 */
export function splitToLimit(
  text: string,
  limit: number | null | undefined,
): string[] {
  if (limit == null || limit <= 0 || charCount(text) <= limit) return [text]

  const out: string[] = []
  let rest = text
  while (charCount(rest) > limit && out.length < MAX_THREAD_POSTS) {
    const cut = cutPoint(rest, limit)
    const head = rest.slice(0, cut).trimEnd()
    // A cut that consumed nothing would spin forever; it can only happen on
    // leading whitespace, which the trim below eats anyway.
    if (head.length === 0 && cut === 0) break
    out.push(head)
    rest = rest.slice(cut).trimStart()
  }
  if (rest.length > 0) out.push(rest)
  return out
}

/** One post of the chain, with its verdict and the files it carries. */
export type ThreadPost<T> = {
  /** 1-based, because the chain is counted the way the reader will read it. */
  position: number
  /** The plain text this post publishes. */
  text: string
  /** Code points, via `charCount` — the platforms' own unit. */
  count: number
  /** True when the ceiling cut this post out of a longer part of the body. */
  autoSplit: boolean
  attachments: T[]
  images: number
  videos: number
  issues: ThreadIssue[]
}

/**
 * Why one post of the chain would not publish as written.
 *
 * Length is not among them, and that is the point of deriving the chain: a
 * part past the ceiling is cut to fit rather than reported. What is left are
 * the two things the author has to decide, because moving a file is a choice
 * only they can make.
 */
export type ThreadIssue = 'too-many-images' | 'too-many-videos'

export type ThreadPlan<T> = {
  posts: ThreadPost<T>[]
  /** Which rule produced the breaks. */
  rule: SplitRule
  /**
   * How many parts the *author* made, before the ceiling cut any of them. One
   * means they made none — the whole chain is the limit's doing, and saying it
   * was "broken at blank lines" would be a sentence about nothing.
   */
  parts: number
  /** True while the platform's ceiling is still loading — no verdict yet. */
  pending: boolean
  /** The body needs more posts than a thread holds; the tail is not shown. */
  overflowed: boolean
}

export type PlanThreadInput<T> = {
  /** The post's body, exactly as the editor stores it. */
  content: string
  /** The post's attachments, in the order they publish (`position`). */
  attachments: T[]
  /** Which post carries which file. `{}` puts everything on the first. */
  assignment: ThreadAssignment
  /**
   * The platform's character ceiling, which is per *post* here. `null` is a
   * platform with no limit; `undefined` is one still loading.
   */
  charLimit: number | null | undefined
  /** Images one post may carry: 4 on X, 10 on Threads. */
  imageCap: number | null | undefined
  /** Videos one post may carry — 1 on both, from the server's video rules. */
  videoCap: number | null | undefined
}

/**
 * The whole chain, derived from the body in one pass.
 *
 * The editor's note, the preview's cards and the pre-publish row all read this
 * one result, so "how many posts is this, and which one is the problem" has
 * exactly one answer on the screen.
 */
export function planThread<T extends Pick<PostAttachment, 'id' | 'mime_type'>>(
  input: PlanThreadInput<T>,
): ThreadPlan<T> {
  const { content, attachments, assignment, charLimit, imageCap, videoCap } =
    input

  const { parts, rule } = splitBody(content)

  const texts: { text: string; autoSplit: boolean }[] = []
  for (const part of parts) {
    const pieces = splitToLimit(part, charLimit)
    for (const piece of pieces) {
      texts.push({ text: piece, autoSplit: pieces.length > 1 })
    }
  }

  const overflowed = texts.length > MAX_THREAD_POSTS
  const kept = overflowed ? texts.slice(0, MAX_THREAD_POSTS) : texts

  // Every file lands on a post that exists: an assignment outliving the post
  // it named (the author deleted a paragraph) rides the last one rather than
  // jumping back to the top, which is where the reader last saw it.
  const last = kept.length - 1
  const buckets: T[][] = kept.map(() => [])
  for (const attachment of attachments) {
    const wanted = assignment[attachment.id] ?? 0
    const index = Math.min(Math.max(wanted, 0), Math.max(last, 0))
    buckets[index]?.push(attachment)
  }

  const posts = kept.map((entry, i) => {
    const carried = buckets[i] ?? []
    const images = carried.filter(
      (a) => attachmentKind(a.mime_type) === 'image',
    ).length
    const videos = carried.filter(
      (a) => attachmentKind(a.mime_type) === 'video',
    ).length

    const issues: ThreadIssue[] = []
    if (imageCap != null && images > imageCap) issues.push('too-many-images')
    if (videoCap != null && videos > videoCap) issues.push('too-many-videos')

    return {
      position: i + 1,
      text: entry.text,
      count: charCount(entry.text),
      autoSplit: entry.autoSplit,
      attachments: carried,
      images,
      videos,
      issues,
    }
  })

  return {
    posts,
    rule,
    parts: parts.length,
    pending: charLimit === undefined,
    overflowed,
  }
}

/** True when any post of the chain would be refused as written. */
export function threadHasIssues<T>(plan: ThreadPlan<T>): boolean {
  return plan.overflowed || plan.posts.some((p) => p.issues.length > 0)
}

/** How many posts our own splitter cut out of longer parts of the body. */
export function autoSplitCount<T>(plan: ThreadPlan<T>): number {
  return plan.posts.filter((p) => p.autoSplit).length
}

/**
 * Parses the stored assignment, or `{}` when there is nothing usable there.
 *
 * Never throws and never half-trusts a row: the value comes out of a
 * workspace-wide key/value store that anything can write, and the worst case
 * of ignoring it is that files ride the first post — which is where they rode
 * before anyone assigned them.
 */
export function parseAssignment(raw: string | null): ThreadAssignment {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {}
    }
    const out: ThreadAssignment = {}
    for (const [id, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
        out[id] = value
      }
    }
    return out
  } catch {
    return {}
  }
}

/**
 * Moves one attachment onto a post of the chain.
 *
 * Putting a file back on the first post *records* it there rather than
 * forgetting it: an explicit choice should survive the next edit that changes
 * how the body splits, and a file is only unassigned because nobody has had
 * the conversation about it yet.
 */
export function assignAttachment(
  assignment: ThreadAssignment,
  attachmentId: string,
  index: number,
): ThreadAssignment {
  if (index < 0) return assignment
  return { ...assignment, [attachmentId]: index }
}

/**
 * The assignment with entries for files that are no longer on the post taken
 * out. Deleting a file from the media card knows nothing about the thread, so
 * a stale entry is the normal state rather than a corruption.
 *
 * Returns the same object when there is nothing to drop — this runs on every
 * render, and a fresh one would re-run every memo below it.
 */
export function reconcileAssignment(
  assignment: ThreadAssignment,
  attachments: Pick<PostAttachment, 'id'>[],
): ThreadAssignment {
  const live = new Set(attachments.map((a) => a.id))
  const ids = Object.keys(assignment)
  if (ids.every((id) => live.has(id))) return assignment
  const out: ThreadAssignment = {}
  for (const id of ids) if (live.has(id)) out[id] = assignment[id]
  return out
}
