import { useMemo } from 'react'
import { usePlatforms } from '@/hooks/usePlatforms'
import { usePostAttachments } from '@/hooks/usePostAttachments'
import { findRule, usePostTypeRules } from '@/hooks/usePostTypeRules'
import { resolveCharLimit, titleLimitFor } from '@/lib/platformLimits'
import { mediaPolicy, type MediaPolicy } from '@/lib/postMedia'
import { evaluatePost, type PostCheck } from '@/lib/postValidation'
import type { Post } from '@/types/posts'

/**
 * One place that joins the post, its attachments and the platform's
 * post-type rules: the media card and the validations section are two views
 * of the same state, and the upload progress lives in here, so they have to
 * share a single instance (called once, in the post route).
 */
export function usePostMedia(post: Post, sequence = false) {
  const media = usePostAttachments(post.id)
  const { data: rules, isLoading: rulesLoading } = usePostTypeRules(
    post.platform_id,
  )
  // Reference data behind `staleTime: Infinity` — shared with every other
  // reader of the platforms query, so this costs no extra fetch.
  const { data: platforms, isLoading: platformsLoading } = usePlatforms()

  const ruleView = findRule(rules, post.platform_post_type)
  const rule = ruleView?.rule ?? null
  const platform = platforms?.find((p) => p.id === post.platform_id)

  const policy: MediaPolicy = useMemo(
    () => mediaPolicy(post.platform_id, rule, platform),
    [post.platform_id, rule, platform],
  )

  const ready = !media.loading && !rulesLoading && !platformsLoading

  // The pure core of `useCharLimit`, fed the (platform, rule) pair resolved
  // above rather than re-running the hook's own copies of the same lookups.
  const limitsReady = !platformsLoading && !rulesLoading
  const maxContentChars = limitsReady
    ? resolveCharLimit(platform, rule, post.platform_post_type)
    : undefined
  const maxTitleChars = limitsReady
    ? titleLimitFor(platform?.text_constraints)
    : undefined

  const checks: PostCheck[] = useMemo(
    () =>
      evaluatePost({
        post,
        policy,
        attachments: media.attachments,
        ready,
        postValidation: media.postValidation,
        requiresContent: rule?.requires_content ?? false,
        maxContentChars,
        maxTitleChars,
        sequence,
      }),
    [
      post,
      policy,
      media.attachments,
      media.postValidation,
      ready,
      rule,
      maxContentChars,
      maxTitleChars,
      sequence,
    ],
  )

  return { ...media, policy, checks, ready, maxContentChars, maxTitleChars }
}
