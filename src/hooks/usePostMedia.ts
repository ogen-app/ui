import { useMemo } from 'react'
import { usePostAttachments } from '@/hooks/usePostAttachments'
import { findRule, usePostTypeRules } from '@/hooks/usePostTypeRules'
import { mediaPolicy, type MediaPolicy } from '@/lib/postMedia'
import { evaluatePost, type PostCheck } from '@/lib/postValidation'
import type { Post } from '@/types/posts'

/**
 * One place that joins the post, its attachments and the platform's
 * post-type rules: the media card and the validations section are two views
 * of the same state, and the upload progress lives in here, so they have to
 * share a single instance (called once, in the post route).
 */
export function usePostMedia(post: Post) {
  const media = usePostAttachments(post.id)
  const { data: rules, isLoading: rulesLoading } = usePostTypeRules(post.platform_id)

  const ruleView = findRule(rules, post.platform_post_type)
  const rule = ruleView?.rule ?? null

  const policy: MediaPolicy = useMemo(
    () => mediaPolicy(post.platform_id, rule),
    [post.platform_id, rule],
  )

  const ready = !media.loading && !rulesLoading

  const checks: PostCheck[] = useMemo(
    () =>
      evaluatePost({
        post,
        policy,
        attachments: media.attachments,
        ready,
        postValidation: media.postValidation,
        requiresContent: rule?.requires_content ?? false,
      }),
    [post, policy, media.attachments, media.postValidation, ready, rule],
  )

  return { ...media, policy, checks, ready }
}
