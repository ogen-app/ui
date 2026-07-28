import type { Post } from '@/types/posts'
import type {
  PlatformValidationError,
  PostAttachmentWithValidation,
} from '@/types/attachments'
import { getCharLimit } from '@/lib/platformLimits'
import { getPlatformInfo, getPostTypeLabel } from '@/lib/platformDictionary'
import { strandedAttachments, type MediaPolicy } from '@/lib/postMedia'

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
}

export function evaluatePost(input: EvaluateInput): PostCheck[] {
  const { post, policy, requiresContent } = input
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
    status: !post.platform_post_type ? 'fail' : policy.videoOnly ? 'warn' : 'pass',
    detail: !post.platform_post_type
      ? 'Pick a post type'
      : policy.videoOnly
        ? `${typeLabel} needs video, which Ogen doesn't handle yet`
        : typeLabel,
  })

  const content = (post.content ?? '').trim()
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

  const limit = getCharLimit(post.platform_id)
  if (limit !== undefined) {
    const length = (post.content ?? '').length
    checks.push({
      id: 'char-limit',
      label: 'Length',
      status: length > limit ? 'fail' : 'pass',
      detail:
        length > limit
          ? `${length.toLocaleString()} / ${limit.toLocaleString()} characters — ${(length - limit).toLocaleString()} over`
          : `${length.toLocaleString()} / ${limit.toLocaleString()} characters`,
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
          ? 'This post type needs an image'
          : `This post type needs at least ${policy.min} images — ${count} attached`
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

export function worstStatus(checks: PostCheck[]): CheckStatus {
  if (checks.some((c) => c.status === 'fail')) return 'fail'
  if (checks.some((c) => c.status === 'warn')) return 'warn'
  if (checks.some((c) => c.status === 'pending')) return 'pending'
  return 'pass'
}
