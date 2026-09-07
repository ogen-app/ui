/**
 * Thread sequences — a post that publishes as a *chain* of posts rather than
 * one (CON-196 / CON-284).
 *
 * X and Threads both take one: Zernio calls it `platformSpecificData.
 * threadItems`, "the first item is the root post and subsequent items become
 * replies in order" (docs.zernio.com/platforms/threads, /platforms/twitter).
 *
 * **The thread is the body, and nothing else.** The post is written in the one
 * Markdown editor every other post type uses, and the chain is *derived* from
 * it on every keystroke — there is no second copy of the words, no per-post
 * input, and nothing to keep in step. Three rules produce it:
 *
 * 1. **A divider is a break.** A `---` line is a real block in the editor, so
 *    the author sees the seam they typed. Where the body has dividers, they
 *    are the only breaks and blank lines stay inside a post.
 * 2. **With no divider, blank lines are the breaks** — the convention the
 *    preview card has drawn since it learned about threads, and how people
 *    write threads in practice.
 * 3. **Whatever is still past the per-post ceiling is cut to fit**, on a
 *    sentence boundary where there is one, and never leaving a scrap behind —
 *    see `splitToLimit`.
 *
 * That third step is why a thread has no "too long" state to report: the
 * length problem is solved rather than flagged, and what the author sees in
 * the preview is what publishes. It is also why the server's
 * `max_content_chars` failure never fires for a thread — we do not send an
 * over-length message for it to refuse.
 *
 * **What crosses the wire is the derivation, not the source.** CON-284 shipped
 * `posts.thread_segments`, so the chain we cut here is sent with the post and
 * the publisher no longer has to re-derive anything. The words still live in
 * `content` and are still authored there; `thread_segments` is egress.
 *
 * The one thing a body cannot express is **which post carries which file**, so
 * that — and only that — is stored per attachment, as CON-284's `segment_index`.
 * A file with no index rides the first post, which is what the X card always
 * drew.
 */
import { charCount, markdownToSocialText, splitThread } from '@/lib/socialText'
import { attachmentKind, type PostAttachment } from '@/types/attachments'
import type { ThreadSegment } from '@/types/posts'
import type { ResolvedPostTypeRule } from '@/types/validation'

/**
 * The post-type slug a sequence publishes under. The same one X has always
 * had — this is the feature that makes it mean something.
 */
export const SEQUENCE_SLUG = 'thread'

/**
 * A ceiling of ours *and* the server's: `platforms.MaxThreadSegments` is the
 * same 25 (CON-284 §6.5). Zernio documents no maximum item count for either
 * network and neither does Meta, but a body that splits into fifty posts is a
 * mistake rather than a thread.
 *
 * Keep the two in step — going over is one of the two `thread_segment_count`
 * failures, and it is the only one we can still produce.
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

/**
 * Under this share of the ceiling, a post our splitter produced is a scrap
 * rather than a message — see `splitToLimit`, which is the only thing that
 * reads it.
 */
const RUNT_FRACTION = 0.2

/**
 * Under this many characters, a message the *author* made is worth mentioning.
 *
 * Deliberately tiny, and deliberately not the fraction above. A short closing
 * line is a real thing people write, so the only runt worth a word is the one
 * nobody could have meant — a divider typed one line early, a stray character
 * after the last one. Reported, never refused: the server takes any non-empty
 * message, and second-guessing a two-word sign-off would be worse than the
 * slip it catches.
 */
const RUNT_REPORT_CHARS = 3

/** Which rule produced the breaks — what the note under the editor reports. */
export type SplitRule = 'divider' | 'blank-line'

/**
 * Whether this post type publishes as a chain.
 *
 * The server's answer, off the post-type rule (CON-284's `segmented`), rather
 * than the hard-coded set of Zernio ids this used to keep. It is the thing
 * that taught Threads the slug, so a third network that learns it needs no
 * release here — and the rule that says `segmented` is the same one carrying
 * the per-message `max_content_chars`, so the two can never disagree.
 */
export function publishesAsChain(
  rule: ResolvedPostTypeRule | null | undefined,
): boolean {
  return rule?.segmented === true
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
 *
 * **A cut never leaves a scrap.** Filling each post to the ceiling and letting
 * the remainder fall where it may is what produces a chain ending in four
 * words: 290 characters against X's 280 would go out as a full post and then a
 * post reading "and that's why." So when what is left is barely over one
 * post's worth, the cut falls in the *middle* instead and the pair comes out
 * even. This is the sanity check the derivation needs, and it belongs here
 * rather than in a pass afterwards — by the time two posts exist, the
 * information needed to balance them (that they were one part) is gone.
 */
export function splitToLimit(
  text: string,
  limit: number | null | undefined,
): string[] {
  if (limit == null || limit <= 0 || charCount(text) <= limit) return [text]

  const runt = limit * RUNT_FRACTION
  const out: string[] = []
  let rest = text
  while (charCount(rest) > limit && out.length < MAX_THREAD_POSTS) {
    const total = charCount(rest)
    // Barely over: this is the last cut, so take it in the middle rather than
    // at the ceiling. Both halves clear the limit comfortably — `total` is
    // under `limit * (1 + RUNT_FRACTION)` for this branch to be taken at all.
    const target = total - limit < runt ? Math.ceil(total / 2) : limit
    const cut = cutPoint(rest, target)
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
  /**
   * Short enough to be a slip rather than a message (`RUNT_REPORT_CHARS`).
   * Only ever the author's doing — `splitToLimit` no longer produces one.
   */
  runt: boolean
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
  /**
   * The body came to one message, so there is no chain here.
   *
   * Not a failure — it is the ordinary state of a thread somebody has started
   * writing, and the server would refuse it only at the publish gate
   * (`thread_segment_count` wants 2..25). What it means is that the post
   * publishes as a *post*: see `demotedFrom` in `lib/postTypeAuto`.
   */
  singular: boolean
}

export type PlanThreadInput<T> = {
  /** The post's body, exactly as the editor stores it. */
  content: string
  /** The post's attachments, in the order they publish (`position`). */
  attachments: T[]
  /**
   * The platform's character ceiling, which is per *post* here — the server
   * marks the rule `segmented` and puts the per-message limit on
   * `max_content_chars`. `null` is a platform with no limit; `undefined` is
   * one still loading.
   */
  charLimit: number | null | undefined
  /** Images one post may carry: 4 on X, 10 on Threads. */
  imageCap: number | null | undefined
  /** Videos one post may carry — 1 on both, from the server's video rules. */
  videoCap: number | null | undefined
}

/** What `planThread` needs off an attachment. */
type PlannableAttachment = Pick<
  PostAttachment,
  'id' | 'mime_type' | 'segment_index'
>

/**
 * The whole chain, derived from the body in one pass.
 *
 * The editor's note, the preview's cards, the pre-publish row and the payload
 * that goes to the server all read this one result, so "how many posts is
 * this, and which one is the problem" has exactly one answer on the screen and
 * the same one on the wire.
 */
export function planThread<T extends PlannableAttachment>(
  input: PlanThreadInput<T>,
): ThreadPlan<T> {
  const { content, attachments, charLimit, imageCap, videoCap } = input

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

  // Every file lands on a post that exists: an index outliving the post it
  // named (the author deleted a paragraph) rides the last one rather than
  // jumping back to the top, which is where the reader last saw it. The
  // server clamps nothing — it refuses an out-of-range `segment_index` with a
  // 422 — so this is also what keeps a stale index off the wire.
  const last = kept.length - 1
  const buckets: T[][] = kept.map(() => [])
  for (const attachment of attachments) {
    const wanted = attachment.segment_index ?? 0
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

    const count = charCount(entry.text)

    return {
      position: i + 1,
      text: entry.text,
      count,
      autoSplit: entry.autoSplit,
      // A part the ceiling cut can no longer be short, so a runt here is
      // always something the author typed — which is why it is worth saying
      // rather than fixing.
      runt: count > 0 && count < RUNT_REPORT_CHARS,
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
    // An empty body derives one empty post, which is a post nobody has written
    // rather than a chain — the same answer, and the one that keeps a new
    // thread out of the publish gate's way.
    singular: posts.filter((p) => p.text.trim().length > 0).length < 2,
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

/** The 1-based positions of any message too short to have been meant. */
export function runtPositions<T>(plan: ThreadPlan<T>): number[] {
  return plan.posts.filter((p) => p.runt).map((p) => p.position)
}

/**
 * The chain as the server stores it (CON-284).
 *
 * The one place a `ThreadSegment[]` is built, and it is built from the plan
 * rather than from the body a second time — so what is sent is by construction
 * the chain the author was shown. A post that came to one message sends `[]`:
 * it is not a thread, and `demotedFrom` will have moved its slug too.
 */
export function threadSegments<T>(plan: ThreadPlan<T>): ThreadSegment[] {
  if (plan.singular) return []
  return plan.posts
    .filter((p) => p.text.trim().length > 0)
    .map((p) => ({ content: p.text }))
}
