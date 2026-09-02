import type { Post } from '@/types/posts'
import type {
  PlatformValidationError,
  PostAttachmentWithValidation,
} from '@/types/attachments'
import { getPlatformInfo, getPostTypeLabel } from '@/lib/platformDictionary'
import { mediaNoun, strandedAttachments, type MediaPolicy } from '@/lib/postMedia'
import type { PublishingAccountResolution } from '@/lib/publishingAccount'
import { charCount, markdownToSocialText } from '@/lib/socialText'
import { formatNumber } from '@/lib/intl'

/**
 * `fail` blocks publishing (the server would reject it), `warn` is
 * non-blocking but likely to disappoint on the platform, `pending` is a
 * check whose inputs haven't loaded yet.
 */
export type CheckStatus = 'pass' | 'warn' | 'fail' | 'pending'

export type PostCheck = {
  id: string
  label: string
  status: CheckStatus
  detail?: string
}

export type EvaluateInput = {
  post: Post
  policy: MediaPolicy
  attachments: PostAttachmentWithValidation[]
  /** False while the attachment list or the post-type rules are in flight. */
  ready: boolean
  /** Post-level rule failures from the attachments endpoint. */
  postValidation: PlatformValidationError[]
  /** The post type requires copy (from the server's rule). */
  requiresContent: boolean
  /**
   * The platform's character ceiling (from the server, CON-91). `null` is a
   * platform with no limit; `undefined` is one whose limit hasn't loaded yet,
   * which shows as pending rather than flashing a pass.
   */
  maxContentChars: number | null | undefined
  /**
   * The platform's title ceiling (CON-160). `null` on the five platforms that
   * set none — the title is then Ogen's own label and never published — and
   * `undefined` while the platform row is in flight.
   */
  maxTitleChars: number | null | undefined
  /**
   * The post publishes as a chain rather than one post (CON-196). Every
   * ceiling this file measures is per published post, and a chain has many —
   * so the two checks that measure one (length, and the media cap) stand down
   * here and are answered per post by `planThread`, in the row the route
   * appends.
   */
  sequence: boolean
}

export function evaluatePost(input: EvaluateInput): PostCheck[] {
  const { post, policy, requiresContent, maxContentChars, maxTitleChars, sequence } = input
  const checks: PostCheck[] = []

  const platform = getPlatformInfo(post.platform_id)
  checks.push({
    id: 'platform',
    label: 'Platform',
    status: platform ? 'pass' : 'fail',
    detail: platform ? platform.name : 'Pick a platform',
  })

  const typeLabel = post.platform_post_type
    ? getPostTypeLabel(post.platform_id, post.platform_post_type)
    : ''
  checks.push({
    id: 'post-type',
    label: 'Post type',
    status: !post.platform_post_type ? 'fail' : policy.videoUnsupported ? 'warn' : 'pass',
    detail: !post.platform_post_type
      ? 'Pick a post type'
      : policy.videoUnsupported
        ? `${typeLabel} needs video, which this platform doesn't publish`
        : typeLabel,
  })

  // No account check here, deliberately. Who the post publishes as is metadata,
  // and it is already set, shown and corrected one line above in the
  // quick-settings bar — this bar answers whether the *content* satisfies the
  // platform. `hasVisibleProblem` still tests it, because a calendar card has
  // no quick-settings bar to say it instead.

  // Mirrors `platforms.ValidatePostType`'s `requires_video_title` branch: a
  // video post type on a platform that demands a title (YouTube) cannot leave
  // Draft without one. The title field is the post's existing one — Ogen
  // carries no separate video-metadata form, because Zernio's submit request
  // takes nothing beyond `title` today.
  if (policy.kinds.includes('video') && policy.video?.requiresTitle) {
    const titled = (post.title ?? '').trim().length > 0
    checks.push({
      id: 'video-title',
      label: 'Title',
      status: titled ? 'pass' : 'fail',
      detail: titled ? undefined : `${platform?.name ?? 'This platform'} rejects a video with no title`,
    })
  }

  // The title cap, where the platform publishes a title at all (CON-160).
  // Silent on the five that don't: there the title is Ogen's own label, and a
  // check on it would be a check on nothing.
  if (maxTitleChars) {
    const titleLength = charCount((post.title ?? '').trim())
    const over = titleLength > maxTitleChars
    checks.push({
      id: 'title-limit',
      label: 'Title length',
      status: over ? 'fail' : 'pass',
      detail: over
        ? `${titleLength} / ${maxTitleChars} characters — ${titleLength - maxTitleChars} over`
        : `${titleLength} / ${maxTitleChars} characters`,
    })
  }

  // Measured on the flattened text, not the Markdown the editor stores: the
  // syntax characters (`**`, `## `, the brackets around a link) are not part
  // of what a platform receives, so counting them reports a length the
  // network never sees. Copy that is only formatting — a lone `---` — also
  // flattens to nothing, which is the honest answer for "is there copy".
  const published = markdownToSocialText(post.content ?? '')
  const content = published.trim()
  checks.push({
    id: 'content',
    label: 'Copy',
    status: content ? 'pass' : requiresContent ? 'fail' : 'warn',
    detail: content
      ? undefined
      : requiresContent
        ? 'This post type needs copy'
        : 'No copy yet',
  })

  // A thread has no single length to check: the ceiling is per post of the
  // chain, so measuring the whole body against it is wrong in both directions
  // — it fails a thread that is fine and says nothing about the one post that
  // isn't. It cannot fail at all, in fact: `planThread` cuts the body to the
  // ceiling as it builds the chain (CON-196).
  if (!sequence) {
    const length = charCount(published)
    if (maxContentChars === undefined) {
      checks.push({ id: 'char-limit', label: 'Length', status: 'pending', detail: 'Checking…' })
    } else if (maxContentChars === null) {
      // No ceiling on this platform — still worth showing the count, since the
      // check disappearing entirely reads as "not checked".
      checks.push({
        id: 'char-limit',
        label: 'Length',
        status: 'pass',
        detail: `${formatNumber(length)} characters — no limit on this platform`,
      })
    } else {
      const over = length > maxContentChars
      checks.push({
        id: 'char-limit',
        label: 'Length',
        status: over ? 'fail' : 'pass',
        detail: over
          ? `${formatNumber(length)} / ${formatNumber(maxContentChars)} characters — ${formatNumber(length - maxContentChars)} over`
          : `${formatNumber(length)} / ${formatNumber(maxContentChars)} characters`,
      })
    }
  }

  checks.push(...mediaChecks(input))

  return checks
}

function mediaChecks({
  policy,
  attachments,
  ready,
  postValidation,
  sequence,
}: EvaluateInput): PostCheck[] {
  const checks: PostCheck[] = []

  if (!ready) {
    return [{ id: 'media-count', label: 'Media', status: 'pending', detail: 'Checking…' }]
  }

  const count = attachments.length
  if (policy.accepts) {
    const belowMin = count < policy.min
    // On a thread the cap is what *one post* takes, and the files are spread
    // across the chain — six images over three posts is legal where six on one
    // is not. The thread's own row measures them per post.
    const aboveMax = !sequence && policy.max !== null && count > policy.max
    checks.push({
      id: 'media-count',
      label: 'Media',
      status: belowMin ? 'fail' : aboveMax ? 'warn' : 'pass',
      detail: belowMin
        ? policy.min === 1
          ? `This post type needs ${mediaNoun(policy)}`
          : `This post type needs at least ${policy.min} ${mediaNoun(policy, true)} — ${count} attached`
        : aboveMax
          ? `${count} attached — this platform takes ${policy.max}`
          : count === 0
            ? 'None attached'
            : `${count} attached`,
    })
  } else if (count > 0) {
    checks.push({
      id: 'media-count',
      label: 'Media',
      status: 'warn',
      detail: `${count} attached, but this post type publishes without media`,
    })
  }

  const stranded = strandedAttachments(attachments, policy)
  if (policy.accepts && stranded.length > 0) {
    checks.push({
      id: 'media-kind',
      label: 'Media type',
      status: 'fail',
      detail: `${stranded.length} attachment${stranded.length === 1 ? '' : 's'} this post type can't publish`,
    })
  }

  // Soft per-file and post-level failures the server already computed
  // against the post's platform (size, format, animated GIF, image+PDF mix).
  const fileIssues = new Set<string>()
  for (const e of postValidation) if (e.message) fileIssues.add(e.message)
  for (const a of attachments) {
    for (const e of a.platform_validation ?? []) if (e.message) fileIssues.add(e.message)
  }
  for (const [i, message] of [...fileIssues].entries()) {
    checks.push({
      id: `media-rule-${i}`,
      label: 'Media rules',
      status: 'warn',
      detail: message,
    })
  }

  return checks
}

/**
 * The part of `evaluatePost` that needs the post row and the account
 * resolution — no attachment fetch, no server-side post-type rules.
 *
 * The calendar draws a card per post straight from the list payload, so this
 * is as much as "something is wrong here" can mean there. Everything it
 * returns true for is also a `fail` in the full check set; the reverse does
 * not hold (a missing caption or an over-limit body needs the editor's
 * fetches). The card therefore understates rather than cries wolf — a clean
 * card is not a promise that the post will publish, but a flagged one is
 * always really broken.
 */
export function hasVisibleProblem(
  post: Post,
  /**
   * The post's account resolution (`usePublishingAccount`) — the same shape
   * `getTransitionBlockers` takes, because it must be the same rule: the
   * server only refuses to schedule when the choice is ambiguous or the
   * chosen account is gone. An empty `social_account_id` on a single-account
   * platform auto-resolves and publishes fine, so it is not a problem to flag.
   */
  account: Pick<PublishingAccountResolution, 'ambiguous' | 'mismatched'>,
): boolean {
  // The publish already went wrong, or the window passed without it going out.
  if (post.status === 'failed' || post.status === 'not_published') return true
  // Nothing can publish without a channel, a shape to publish in, and an
  // account resolution the server would accept.
  if (!getPlatformInfo(post.platform_id)) return true
  if (!post.platform_post_type) return true
  if (account.ambiguous || account.mismatched) return true
  return false
}

export function worstStatus(checks: PostCheck[]): CheckStatus {
  if (checks.some((c) => c.status === 'fail')) return 'fail'
  if (checks.some((c) => c.status === 'warn')) return 'warn'
  if (checks.some((c) => c.status === 'pending')) return 'pending'
  return 'pass'
}

/**
 * What the expanded checks list actually draws.
 *
 * A passing check is not automatically worth a row. `Platform → LinkedIn` and
 * `Post type → Text post` restate two settings the user picked in the bar
 * directly above; `Copy` passes with no detail at all, so it renders as a tick
 * beside a bare word. Listed in full, a healthy post produced four rows of
 * which one — the character count — said anything.
 *
 * So a passing platform and post type fold into the `heading` over the list —
 * they are what the remaining rows are measured *against*, not results — and a
 * passing check with nothing to report is dropped. Both keep their rows the
 * moment they stop passing, because then they carry the only thing worth
 * reading: *why*. Nothing that fails or warns is ever folded or hidden.
 */
export type ChecksDisplay = {
  /** e.g. `LinkedIn Text post requirements`. Never empty — see `heading()`. */
  heading: string
  rows: PostCheck[]
}

/** The ids whose passing value is context for the other checks, not a check. */
const CONTEXT_IDS = ['platform', 'post-type'] as const

/**
 * Nothing has been chosen for the rules to come from yet.
 *
 * The checks still evaluate — character limits and post-type structure fall
 * back to defaults — but every answer they give is provisional, and the list
 * would be reporting a made-up platform's rules as this post's. So the bar
 * says the one useful thing instead, and shows nothing else.
 */
export function awaitingPlatform(checks: PostCheck[]): boolean {
  return checks.some((c) => c.id === 'platform' && c.status === 'fail')
}

/**
 * Names whose rules the list is applying. Falls back to the generic form while
 * either setting is unpicked, so the heading is never half a sentence — the
 * rows underneath will be saying which setting is missing anyway.
 */
function heading(platform: string | null, postType: string | null): string {
  if (platform && postType) return `${platform} ${postType} requirements`
  if (platform) return `${platform} requirements`
  return 'Platform requirements'
}

export function foldChecks(checks: PostCheck[]): ChecksDisplay {
  let platform: string | null = null
  let postType: string | null = null
  const rows: PostCheck[] = []

  for (const check of checks) {
    const foldable = (CONTEXT_IDS as readonly string[]).includes(check.id)
    if (check.status === 'pass' && foldable) {
      if (check.detail) {
        if (check.id === 'platform') platform = check.detail
        else postType = check.detail
      }
      continue
    }
    // A tick against a label with nothing beside it tells the reader only that
    // a check they can't see the result of went the right way.
    if (check.status === 'pass' && !check.detail) continue
    rows.push(check)
  }

  return { heading: heading(platform, postType), rows }
}

/**
 * The one line the collapsed checks bar shows.
 *
 * Only the passing case names *platform requirements*, and it says so because
 * since CON-183 the bar carries the quality score too: "everything checks out"
 * would claim the writing was fine as well. When something is wrong the string
 * is just the work — `2 issues to fix`. Restating the verdict in front of it
 * ("doesn't meet platform requirements — 2 issues to fix") spends the widest
 * part of the line on the half the reader can already see from the icon, and
 * pushes the count, which is the actionable part, toward the truncation.
 *
 * Quality deliberately cannot reach this string. A post that has never been
 * assessed is the default state of every new post, and it must not look
 * broken; a weak score is advice, not a blocker, and dressing it as one would
 * teach the user to ignore the icon that also means "this will be rejected".
 */
export function checksSummary(checks: PostCheck[]): string {
  // Before anything else: every other requirement is a rule *of* a platform,
  // so counting them against no platform would report a number that changes
  // the moment one is picked, from rules that were never this post's.
  if (awaitingPlatform(checks)) return 'Select platform to see requirements'

  const overall = worstStatus(checks)
  if (overall === 'pending') return 'Checking this post…'

  const failing = checks.filter((c) => c.status === 'fail').length
  const warning = checks.filter((c) => c.status === 'warn').length
  const plural = (n: number) => (n === 1 ? 'issue' : 'issues')

  if (failing > 0) {
    const rest = warning > 0 ? `, ${warning} to look at` : ''
    return `${failing} ${plural(failing)} to fix${rest}`
  }
  if (warning > 0) {
    return `${warning} ${plural(warning)} to look at`
  }
  return 'Post meets platform requirements'
}
