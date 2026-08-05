import type { Post } from '@/types/posts'
import type {
  PlatformValidationError,
  PostAttachmentWithValidation,
} from '@/types/attachments'
import { getPlatformInfo, getPostTypeLabel } from '@/lib/platformDictionary'
import { mediaNoun, strandedAttachments, type MediaPolicy } from '@/lib/postMedia'
import { charCount, markdownToSocialText } from '@/lib/socialText'

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
}

export function evaluatePost(input: EvaluateInput): PostCheck[] {
  const { post, policy, requiresContent, maxContentChars, maxTitleChars } = input
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
      detail: `${length.toLocaleString()} characters — no limit on this platform`,
    })
  } else {
    const over = length > maxContentChars
    checks.push({
      id: 'char-limit',
      label: 'Length',
      status: over ? 'fail' : 'pass',
      detail: over
        ? `${length.toLocaleString()} / ${maxContentChars.toLocaleString()} characters — ${(length - maxContentChars).toLocaleString()} over`
        : `${length.toLocaleString()} / ${maxContentChars.toLocaleString()} characters`,
    })
  }

  checks.push(...mediaChecks(input))

  return checks
}

function mediaChecks({
  policy,
  attachments,
  ready,
  postValidation,
}: EvaluateInput): PostCheck[] {
  const checks: PostCheck[] = []

  if (!ready) {
    return [{ id: 'media-count', label: 'Media', status: 'pending', detail: 'Checking…' }]
  }

  const count = attachments.length
  if (policy.accepts) {
    const belowMin = count < policy.min
    const aboveMax = policy.max !== null && count > policy.max
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
 * The part of `evaluatePost` that needs nothing but the post row — no
 * attachment fetch, no server-side post-type rules.
 *
 * The calendar draws a card per post straight from the list payload, so this
 * is as much as "something is wrong here" can mean there. Everything it
 * returns true for is also a `fail` in the full check set; the reverse does
 * not hold (a missing caption or an over-limit body needs the editor's
 * fetches). The card therefore understates rather than cries wolf — a clean
 * card is not a promise that the post will publish, but a flagged one is
 * always really broken.
 */
export function hasVisibleProblem(post: Post): boolean {
  // The publish already went wrong, or the window passed without it going out.
  if (post.status === 'failed' || post.status === 'not_published') return true
  // Nothing can publish without a channel and a shape to publish in.
  if (!getPlatformInfo(post.platform_id)) return true
  if (!post.platform_post_type) return true
  return false
}

export function worstStatus(checks: PostCheck[]): CheckStatus {
  if (checks.some((c) => c.status === 'fail')) return 'fail'
  if (checks.some((c) => c.status === 'warn')) return 'warn'
  if (checks.some((c) => c.status === 'pending')) return 'pending'
  return 'pass'
}
