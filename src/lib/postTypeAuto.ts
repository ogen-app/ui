/**
 * **Auto** — the post works out its own format from what is in it.
 *
 * Picking a post type is the first thing the editor asks for and the last
 * thing an author has an opinion about. "Text post" and "Image post" are not
 * two things somebody sets out to write; they are what a post already *is*
 * once the words and the files are there. So the default is to not ask: the
 * app reads the body and the attachments and names the format itself, and
 * re-names it as the post changes.
 *
 * **Auto is the absence of a choice, and the record already had one.** A post
 * is created with `platform_post_type: ''` (`useAddPost` sends a campaign and a
 * date and nothing else), and until now that empty string only ever meant
 * "broken" — a `fail` in the checks bar and a warning mark on the calendar
 * card. It is the same state, read as an intention rather than an omission, so
 * nothing new is stored and no column is waiting on the back end.
 *
 * Two consequences fall out of storing nothing, and both are deliberate:
 *
 * - **The resolution is not written down until it has to be, and `draft` is
 *   where it has to be.** A draft holds `''` for its whole life and the slug is
 *   derived on every render; the record gains a concrete type on the way out.
 *   That boundary is the server's, not a judgement call — see
 *   `canBeAutomatic`.
 * - **Pinning is one-way.** A post that has been marked ready and then reopened
 *   holds the slug it resolved to, because there is nowhere to record that it
 *   used to be automatic. Choosing *Auto* again in the picker sets `''` back.
 *
 * What this module does **not** do is guess. A format that the content cannot
 * imply is never chosen automatically: Story, Article and Link post are
 * editorial decisions, and a whitelist-only type has no rule to test at all.
 * They stay in the picker and pin the post when chosen, which is what choosing
 * one has always meant.
 */
import { charCount, markdownToSocialText } from '@/lib/socialText'
import { publishesAsChain, SEQUENCE_SLUG } from '@/lib/threadSequence'
import {
  attachmentKind,
  type AttachmentKind,
  type PostAttachment,
} from '@/types/attachments'
import type { PostStatus } from '@/types/posts'
import type { PostTypeRuleView, ResolvedPostTypeRule } from '@/types/validation'

/** What the record holds while the post is deciding for itself. */
export const AUTO_POST_TYPE = ''

/** Whether a post is letting the app choose. */
export function isAutoPostType(slug: string): boolean {
  return slug === AUTO_POST_TYPE
}

/**
 * Whether a post in this status may hold the empty slug.
 *
 * The boundary is the server's and it is a single line:
 * `requirePlatformIfNotDraft` (src/handlers/posts.go) refuses a PUT that
 * carries no post type under any status but `draft`. So Auto's life is exactly
 * a draft's, and the two things that follow are the same rule read in both
 * directions — the picker stops offering Auto once the post is out (there would
 * be no saving it afterwards), and the transition *out* is where the resolution
 * is pinned.
 *
 * Takes the status rather than the post because the pinning call site asks
 * about the status it is moving *to*.
 */
export function canBeAutomatic(status: PostStatus): boolean {
  return status === 'draft'
}

/**
 * The order Auto prefers, and the whole set it will ever choose from.
 *
 * Least demanding first, so the winner is the *loosest* type the post already
 * satisfies — a hundred characters is a text post rather than an image post
 * that happens to have no image yet. Escalation then falls out of the same
 * walk: attach a picture and `text-post` stops fitting, so the next rung takes
 * it.
 *
 * `video` precedes `reel` and `short` because it is the plain reading of "there
 * is a video on this post"; a platform offering only the short form (Instagram
 * Reels, YouTube Shorts) reaches it because the rung above was never a
 * candidate there. `thread` is last: a chain is the answer to a body no single
 * post can hold, so it must not win from a post that would have fitted in one.
 *
 * Anything absent from this list is never chosen automatically — see the module
 * comment.
 */
const LADDER: readonly string[] = [
  'text-post',
  'image-post',
  'carousel',
  'video',
  'reel',
  'short',
  SEQUENCE_SLUG,
]

/** What a post *is*, reduced to the four things a rule can be tested against. */
export type PostShape = {
  /** Code points of the flattened body — the unit the platforms count in. */
  chars: number
  /** The distinct attachment kinds present. */
  kinds: AttachmentKind[]
  /** How many files are attached. */
  count: number
}

/**
 * Reads the shape off the post.
 *
 * Measured on the flattened text like every other length in the app: the
 * Markdown syntax characters are not part of what a platform receives, so
 * counting them would escalate a post that is nowhere near the ceiling.
 */
export function postShape(
  content: string,
  attachments: Pick<PostAttachment, 'mime_type'>[],
): PostShape {
  const kinds = new Set<AttachmentKind>()
  for (const a of attachments) kinds.add(attachmentKind(a.mime_type))
  return {
    chars: charCount(markdownToSocialText(content ?? '')),
    kinds: [...kinds],
    count: attachments.length,
  }
}

/**
 * Why nothing fits. Each is a different sentence to the author, and only the
 * first two are things they can act on by editing.
 */
export type UnfitReason =
  /** Every type that takes these files caps the body shorter than it is. */
  | 'too-long'
  /**
   * No candidate publishes what is attached — including the case where the
   * only enabled rung takes no attachments at all, which is a fact about the
   * file rather than about how many there are.
   */
  | 'media-kind'
  /** The files are the right kind, and there are too many of them. */
  | 'too-many'
  /** The campaign enables no type Auto is allowed to choose. */
  | 'no-candidates'

export type AutoResolution =
  /** The rules have not loaded — no verdict, and nothing to render as one. */
  | { state: 'pending' }
  | { state: 'resolved'; slug: string }
  | {
      state: 'unfit'
      reason: UnfitReason
      /**
       * The longest body any candidate would have taken, for `too-long` only.
       * `null` when the reason is anything else.
       */
      limit: number | null
    }

export type ResolveAutoInput = {
  /** The post's body, exactly as the editor stores it. */
  content: string
  attachments: Pick<PostAttachment, 'mime_type'>[]
  /**
   * The slugs Auto may choose between — what the *campaign* enables for the
   * platform, the same narrowed list the picker offers. A campaign that has
   * not been told about a format did not ask for posts in it.
   */
  candidates: string[]
  /** The platform's own rules; `undefined` while the query is in flight. */
  rules: PostTypeRuleView[] | undefined
  /**
   * Bars the chain rung, so the walk answers with the ordinary format this
   * post already is. Set by `demotedFrom` and by nothing else.
   */
  excludeChain?: boolean
}

/**
 * Whether a chain is something Auto is allowed to resolve *to*.
 *
 * Not the same question as whether the platform offers the slug. X has offered
 * `thread` all along, and a thread only publishes as a chain because the server
 * splits the body into `thread_segments` on every write (CON-284 R2); the types
 * that work that way are marked `segmented`, which is what this reads. Where it
 * splits, a chain is the right answer to a body no single post can hold.
 *
 * Choosing `thread` by hand is untouched either way: that is what pinning a
 * type means, and it behaves exactly as it did before this module existed.
 */
function chainResolvable(rules: PostTypeRuleView[] | undefined): boolean {
  return publishesAsChain(rules?.find((r) => r.slug === SEQUENCE_SLUG)?.rule)
}

/**
 * Whether a post of this shape publishes under this rule.
 *
 * `sequence` relaxes the two ceilings that are per *published post* rather than
 * per record: a chain's body is cut to fit as it is built (`splitToLimit`), and
 * its files are spread across the posts, so measuring either against the whole
 * is wrong in both directions. It is the same stand-down `mediaChecks` makes.
 */
function fits(
  rule: ResolvedPostTypeRule,
  shape: PostShape,
  sequence: boolean,
): boolean {
  if (rule.requires_content && shape.chars === 0) return false

  if (rule.allowed_kinds.length > 0) {
    const allowed = new Set(rule.allowed_kinds)
    if (shape.kinds.some((k) => !allowed.has(k))) return false
  }
  if (shape.count < rule.min_attachments) return false
  if (
    !sequence &&
    rule.max_attachments !== null &&
    shape.count > rule.max_attachments
  ) {
    return false
  }
  // A type that takes no attachments at all is refused by the cap above, so
  // `max_attachments: 0` needs no special case — it is the text-post rung.

  if (
    !sequence &&
    rule.max_content_chars !== null &&
    shape.chars > rule.max_content_chars
  ) {
    return false
  }
  return true
}

/** Whether a candidate is one this post could ever have carried its files on. */
function takesTheseFiles(
  rule: ResolvedPostTypeRule,
  shape: PostShape,
): boolean {
  // `allowed_kinds: []` is "no kind restriction" rather than "every kind", and
  // the text-post rung is exactly the pair that tells them apart: it names no
  // kinds *and* caps attachments at zero. Read as permissive it would make a
  // PDF on X report "too many files" — a sentence about a count, when the
  // platform will never publish that file at all.
  if (shape.count > 0 && rule.max_attachments === 0) return false
  if (rule.allowed_kinds.length === 0) return true
  const allowed = new Set(rule.allowed_kinds)
  return shape.kinds.every((k) => allowed.has(k))
}

/**
 * The format this post already is, or why it is none of them.
 *
 * Walks `LADDER` — not the caller's order — so the answer depends on the post
 * and the platform rather than on how a campaign happens to list its types.
 */
export function resolveAutoPostType(input: ResolveAutoInput): AutoResolution {
  const { content, attachments, candidates, rules, excludeChain } = input
  if (!rules) return { state: 'pending' }

  const shape = postShape(content, attachments)
  const offered = new Set(candidates)
  const chain = !excludeChain && chainResolvable(rules)

  // Rule-less types are dropped rather than treated as permissive. A
  // whitelist-only slug is one Ogen enforces nothing for, so "it fits" would
  // mean "we have no idea", which is the one answer Auto must not give.
  const rungs = LADDER.filter(
    (slug) => offered.has(slug) && (slug !== SEQUENCE_SLUG || chain),
  )
    .map((slug) => ({ slug, rule: rules.find((r) => r.slug === slug)?.rule }))
    .filter((r): r is { slug: string; rule: ResolvedPostTypeRule } => !!r.rule)

  if (rungs.length === 0) {
    return { state: 'unfit', reason: 'no-candidates', limit: null }
  }

  for (const { slug, rule } of rungs) {
    if (fits(rule, shape, slug === SEQUENCE_SLUG)) {
      return { state: 'resolved', slug }
    }
  }

  // Nothing fits, so say which of the three walls was hit. Ordered by what the
  // author can do about it: a body they can cut, then files they can remove,
  // then a platform that will never take what is attached.
  const carriers = rungs.filter(({ rule }) => takesTheseFiles(rule, shape))
  if (carriers.length === 0) {
    return { state: 'unfit', reason: 'media-kind', limit: null }
  }

  const withRoom = carriers.filter(
    ({ rule }) =>
      shape.count >= rule.min_attachments &&
      (rule.max_attachments === null || shape.count <= rule.max_attachments),
  )
  if (withRoom.length === 0) {
    return { state: 'unfit', reason: 'too-many', limit: null }
  }

  // Every remaining candidate takes the files and refuses the body, so the
  // longest of their ceilings is the number worth quoting — it is the one the
  // author has to get under. An unbounded one would have fitted.
  const limit = withRoom.reduce<number>(
    (max, { rule }) => Math.max(max, rule.max_content_chars ?? 0),
    0,
  )
  return { state: 'unfit', reason: 'too-long', limit }
}

/**
 * The slug the rest of the editor should behave as though the post carries.
 *
 * A pinned post answers itself. An automatic one answers with its resolution,
 * and with `''` while that is pending or impossible — which is the value every
 * reader already handles, because it is what an unset post type has always
 * been.
 */
export function effectivePostType(
  stored: string,
  resolution: AutoResolution | null,
): string {
  if (!isAutoPostType(stored)) return stored
  return resolution?.state === 'resolved' ? resolution.slug : AUTO_POST_TYPE
}

/**
 * The ordinary format a thread that came to one message should publish as, or
 * `null` when it should stay a thread.
 *
 * **A thread of one is a post**, and that is a fact about the platforms rather
 * than a convenience: X and Threads have no such object, and CON-284's
 * `thread_segment_count` refuses a chain under two messages at the publish
 * gate. So a post pinned to `thread` whose body never grew past one message
 * has to leave with a different slug, and the honest one is the format it
 * already is — the same ladder walk Auto makes, with the chain rung barred so
 * it cannot resolve straight back.
 *
 * Only a *pinned* thread needs this. An automatic post never had the problem:
 * `thread` is the ladder's last rung, so a body that fits in one post is
 * claimed by `text-post` long before the walk reaches it.
 *
 * `null` on anything it cannot answer — a chain with two messages, a resolution
 * that is pending or unfit, a post that is not a thread. Leaving the slug alone
 * is always the safe half: the gate then says what is wrong in the server's own
 * words, which beats this module inventing a format nobody asked for.
 */
export function demotedFrom(
  input: ResolveAutoInput & { storedType: string; singular: boolean },
): string | null {
  if (input.storedType !== SEQUENCE_SLUG || !input.singular) return null
  const ordinary = resolveAutoPostType({ ...input, excludeChain: true })
  return ordinary.state === 'resolved' ? ordinary.slug : null
}
