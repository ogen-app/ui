/**
 * Thread sequences — a post that publishes as a *chain* of posts rather than
 * one (CON-196 / CON-284).
 *
 * X and Threads both take one: Zernio calls it `platformSpecificData.
 * threadItems`, "the first item is the root post and subsequent items become
 * replies in order" (docs.zernio.com/platforms/threads, /platforms/twitter).
 *
 * **The thread is the body, and nothing else.** The post is written in the one
 * Markdown editor every other post type uses, and the chain is derived from it
 * — there is no second copy of the words, no per-message input, and nothing to
 * keep in step. That was this client's position before the server had one, and
 * CON-284 R2 adopted it: `posts.content` is now the canonical body and
 * `thread_segments` is the server's arithmetic over it, recomputed on every
 * write.
 *
 * **Which is why the splitting is no longer here.** R2 shipped `SplitThread`,
 * so the rules exist once, in Go, and this module reads them through
 * `POST /api/posts/thread/preview` (`useThreadPreview`) rather than keeping a
 * second implementation that a server deploy could silently outvote. The
 * difference was not hypothetical — the splitter this file used to hold broke
 * at every blank line and accepted `***` as a divider, and the server does
 * neither, so the two disagreed about most bodies. What is left in here is the
 * part the server does *not* answer, because a preview knows nothing about
 * attachments: which message carries which file, and whether that message can
 * carry it.
 *
 * Two consequences of the server owning the cut are worth knowing:
 *
 * 1. **A message can be too long now.** In manual mode — any body with divider
 *    lines — the per-message ceiling is ignored and the author's breaks are
 *    obeyed exactly, so an over-long message is reported rather than cut. The
 *    old promise that a thread has no length state to report belonged to a
 *    splitter that always cut to fit, and it left with it.
 * 2. **The verdict comes from the same gate.** The preview runs the real
 *    `ValidatePublishReadiness`, so what it reports is the 422 the author would
 *    have met at schedule time — which is why per-message length and count
 *    failures are read off `preview.errors` rather than recomputed here.
 *
 * The one thing a body cannot express is **which post carries which file**, so
 * that — and only that — is stored per attachment, as CON-284's `segment_index`.
 * A file with no index rides the root, which is what the X card always drew and
 * what R2 made the server's own default.
 */
import { charCount, markdownToSocialText } from '@/lib/socialText'
import { attachmentKind, type PostAttachment } from '@/types/attachments'
import type { ThreadPreview } from '@/types/posts'
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
 * Display only — the server refuses the 26th with a `thread_segment_count`
 * failure whatever this says, and `SplitThread` returns every segment it found
 * rather than truncating. Keep the two in step so the warning arrives before
 * the refusal rather than after it.
 */
export const MAX_THREAD_POSTS = 25

/**
 * Under this many characters, a message is worth mentioning.
 *
 * Deliberately tiny. A short closing line is a real thing people write, so the
 * only runt worth a word is the one nobody could have meant — a divider typed
 * one line early, a stray character after the last one. Reported, never
 * refused: the server takes any non-empty message, and second-guessing a
 * two-word sign-off would be worse than the slip it catches.
 *
 * More useful under R2 than before it, not less. `SplitThread` drops *empty*
 * chunks, so a stray divider costs nothing — but a divider with a typo's worth
 * of text after it is a real segment, and that is precisely the accident this
 * catches.
 */
const RUNT_CHARS = 3

/**
 * A divider line, matching `platforms.isRuleLine` exactly: a CommonMark
 * thematic break — three or more of a **single** marker character (`-`, `*` or
 * `_`), alone on the line, with optional spaces between them.
 *
 * Mirroring the server rather than the Markdown spec is the whole point: this
 * predicate only decides which *sentence* the note under the editor prints, so
 * being generous here would describe a body as hand-broken when the server is
 * about to pack it by length. The two happen to agree now, and that is a fact
 * about `isRuleLine` rather than a licence to follow the spec.
 *
 * It read hyphens only until 2026-09-16, which meant it answered `auto` for
 * every body this editor can produce: BlockNote writes a divider back as `***`
 * and normalises a typed `---` into one, so no hyphen rule ever reached
 * `content`. ogen#156 widened `isRuleLine`, and this widened in step — mixed
 * markers (`-*-`) and any line carrying other characters (`**bold**`) are
 * still not rules, on both sides.
 *
 * This is a one-line test and not the splitting algorithm, which is why it is
 * allowed to live on this side at all — see the module note.
 */
const DIVIDER = /^([-*_])(?:[ \t]*\1){2,}[ \t]*$/

/**
 * Which rule produced the breaks — what the note under the editor reports.
 *
 * `auto` rather than the old `blank-line`, because that is no longer what
 * happens: with no divider in the body the server packs it to the per-message
 * ceiling, preferring a paragraph break, then a line break, then a sentence,
 * then a word. A blank line is where it would *rather* cut, not where it cuts.
 */
export type SplitRule = 'divider' | 'auto'

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
 * Whether the author broke this body themselves.
 *
 * Cheap enough to run on every render and exact, because the server's own test
 * is the same one: any divider line anywhere puts the whole body in manual
 * mode.
 */
export function splitRuleFor(content: string): SplitRule {
  const lines = (content ?? '').replace(/\r\n/g, '\n').split('\n')
  return lines.some((line) => DIVIDER.test(line.trim())) ? 'divider' : 'auto'
}

/** One post of the chain, with its verdict and the files it carries. */
export type ThreadPost<T> = {
  /** 1-based, because the chain is counted the way the reader will read it. */
  position: number
  /**
   * What this post *looks* like: the server's segment, flattened the way every
   * other post type's body is flattened for a preview
   * (`markdownToSocialText`). Display only — see `count`.
   */
  text: string
  /**
   * Code points, taken from the server's count rather than recounted off
   * `text`, so the number on screen is the one the publish gate measured.
   *
   * It is the **visible** length since ogen#156: `char_count` is
   * `platforms.VisibleLen` over the segment, a Go port of this app's own
   * `markdownToSocialText`, and the same number `validateThread` enforces. So
   * `**bold**` spends four characters rather than eight, and the auto-split no
   * longer cuts through a markup run. Recounting here would still be wrong —
   * two implementations of one measurement is what the preview endpoint exists
   * to end — but the two now agree by construction rather than by luck.
   */
  count: number
  /** Short enough to be a slip rather than a message (`RUNT_CHARS`). */
  runt: boolean
  attachments: T[]
  images: number
  videos: number
  issues: ThreadIssue[]
}

/**
 * Why one post of the chain would not publish as written.
 *
 * `too-long` is back, and it is the server's finding rather than ours: in
 * manual mode the author's breaks are obeyed and the ceiling is not applied,
 * so a message over it is reported. The two media issues are ours, because a
 * preview is not told about attachments.
 */
export type ThreadIssue = 'too-long' | 'too-many-images' | 'too-many-videos'

export type ThreadPlan<T> = {
  posts: ThreadPost<T>[]
  /** Which rule produced the breaks. */
  rule: SplitRule
  /** The per-message ceiling the split was packed to; `null` when unknown. */
  charLimit: number | null
  /** True while the server's answer for the current body is still in flight. */
  pending: boolean
  /** The body needs more posts than a thread holds. */
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
  /**
   * False for every post type that is not segmented — the plan is then empty
   * and, importantly, *not* pending: nothing is waiting on an answer nobody
   * asked for.
   */
  chain: boolean
  /** The post's body, read only to tell a hand-broken thread from a packed one. */
  content: string
  /**
   * The server's split of that body, or `undefined` while it is in flight.
   * `useThreadPreview` is the only thing that produces one.
   */
  preview: ThreadPreview | undefined
  /** The post's attachments, in the order they publish (`position`). */
  attachments: T[]
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

const EMPTY_PLAN = {
  posts: [],
  rule: 'auto' as const,
  charLimit: null,
  pending: false,
  overflowed: false,
  singular: true,
}

/**
 * The whole chain: the server's messages, with this client's files placed on
 * them.
 *
 * The editor's note, the preview's cards, the pre-publish row and the media
 * picker all read this one result, so "how many posts is this, and which one is
 * the problem" has exactly one answer on the screen — and now the same one the
 * publish gate holds, since the messages and their verdicts both came from it.
 */
export function planThread<T extends PlannableAttachment>(
  input: PlanThreadInput<T>,
): ThreadPlan<T> {
  const { chain, content, preview, attachments, imageCap, videoCap } = input

  if (!chain) return { ...EMPTY_PLAN, posts: [] }
  if (!preview) return { ...EMPTY_PLAN, posts: [], pending: true }

  const segments = preview.segments

  // Every file lands on a post that exists: an index outliving the post it
  // named (the author deleted a paragraph) rides the last one rather than
  // jumping back to the top, which is where the reader last saw it. A file with
  // no index rides the root — R2 made that the server's own reading of NULL, so
  // the two agree without the client having to write an index it was never
  // asked for.
  const last = segments.length - 1
  const buckets: T[][] = segments.map(() => [])
  for (const attachment of attachments) {
    const wanted = attachment.segment_index ?? 0
    const index = Math.min(Math.max(wanted, 0), Math.max(last, 0))
    buckets[index]?.push(attachment)
  }

  // Length failures are the gate's to report, not ours to recompute: in manual
  // mode the ceiling is not applied to the split at all, so which message is
  // over it is a question only the validator has answered.
  const tooLong = new Set(
    preview.errors
      .filter((e) => e.rule === 'max_content_chars' && e.segment != null)
      .map((e) => e.segment as number),
  )

  const posts = segments.map((segment, i) => {
    const text = markdownToSocialText(segment.content)
    const visible = charCount(text)
    const carried = buckets[i] ?? []
    const images = carried.filter(
      (a) => attachmentKind(a.mime_type) === 'image',
    ).length
    const videos = carried.filter(
      (a) => attachmentKind(a.mime_type) === 'video',
    ).length

    const issues: ThreadIssue[] = []
    if (tooLong.has(i)) issues.push('too-long')
    if (imageCap != null && images > imageCap) issues.push('too-many-images')
    if (videoCap != null && videos > videoCap) issues.push('too-many-videos')

    return {
      position: i + 1,
      // Flattened here and nowhere else: the segments arrive as the Markdown
      // the author typed, and the preview cards draw plain text. Doing it once,
      // on the way out of this function, is what keeps the cards and the media
      // picker's excerpts reading the same words.
      text,
      count: segment.char_count,
      // Recounted locally rather than read off `count`, although the two
      // measure the same thing now: this asks what the author can see, which is
      // a question about the flattened copy whatever the ceiling happens to be
      // counting this month.
      runt: visible > 0 && visible < RUNT_CHARS,
      attachments: carried,
      images,
      videos,
      issues,
    }
  })

  return {
    posts,
    rule: splitRuleFor(content),
    // `0` is the server saying it had no ceiling to use — a draft with no
    // platform picked yet — which is an absent limit rather than a limit of
    // nothing.
    charLimit: preview.limit > 0 ? preview.limit : null,
    pending: false,
    overflowed: segments.length > MAX_THREAD_POSTS,
    singular: segments.length < 2,
  }
}

/** True when any post of the chain would be refused as written. */
export function threadHasIssues<T>(plan: ThreadPlan<T>): boolean {
  return plan.overflowed || plan.posts.some((p) => p.issues.length > 0)
}

/** The 1-based positions of any message too short to have been meant. */
export function runtPositions<T>(plan: ThreadPlan<T>): number[] {
  return plan.posts.filter((p) => p.runt).map((p) => p.position)
}
