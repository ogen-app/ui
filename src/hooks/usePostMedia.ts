import { useMemo } from 'react'
import { useFeatureFlag } from '@/config/featureFlags'
import { useCampaignPostTypes } from '@/hooks/useCampaignPostTypes'
import { usePlatforms } from '@/hooks/usePlatforms'
import { usePostAttachments } from '@/hooks/usePostAttachments'
import { findRule, usePostTypeRules } from '@/hooks/usePostTypeRules'
import { getPlatformInfo } from '@/lib/platformDictionary'
import { resolveCharLimit, titleLimitFor } from '@/lib/platformLimits'
import { mediaPolicy, type MediaPolicy } from '@/lib/postMedia'
import {
  effectivePostType,
  isAutoPostType,
  resolveAutoPostType,
  type AutoResolution,
} from '@/lib/postTypeAuto'
import { evaluatePost, type PostCheck } from '@/lib/postValidation'
import { isSequencePost } from '@/lib/threadSequence'
import type { Post } from '@/types/posts'

/**
 * One place that joins the post, its attachments and the platform's
 * post-type rules: the media card and the validations section are two views
 * of the same state, and the upload progress lives in here, so they have to
 * share a single instance (called once, in the post route).
 *
 * It is also where the post's **effective** type is decided. An automatic post
 * carries no slug (`lib/postTypeAuto`), and the format it publishes as is
 * derived from the very things this hook already holds — the body, the
 * attachments and the platform's rules. Resolving it anywhere else would mean a
 * second `usePostAttachments`, and that hook owns the upload progress: two
 * instances share the fetched rows and not the in-flight uploads, so the media
 * card would draw a progress bar the validations never saw.
 *
 * Everything downstream reads `postType` rather than `post.platform_post_type`,
 * and gets a concrete slug whether the author picked one or not.
 */
export function usePostMedia(post: Post) {
  const media = usePostAttachments(post.id)
  const { data: rules, isLoading: rulesLoading } = usePostTypeRules(
    post.platform_id,
  )
  // Reference data behind `staleTime: Infinity` — shared with every other
  // reader of the platforms query, so this costs no extra fetch.
  const { data: platforms, isLoading: platformsLoading } = usePlatforms()

  // The same list the picker offers, so the format Auto lands on is always one
  // the author could have chosen themselves.
  const autoEnabled = useFeatureFlag('post-type-auto')
  const candidates = useCampaignPostTypes(post.campaign_id, post.platform_id)
  const zernioId = getPlatformInfo(post.platform_id)?.zernioId

  const auto: AutoResolution | null = useMemo(() => {
    if (!autoEnabled || !isAutoPostType(post.platform_post_type)) return null
    return resolveAutoPostType({
      content: post.content,
      attachments: media.attachments,
      candidates: candidates.map((pt) => pt.slug),
      rules,
      zernioId,
    })
  }, [
    autoEnabled,
    post.platform_post_type,
    post.content,
    media.attachments,
    candidates,
    rules,
    zernioId,
  ])

  const postType = effectivePostType(post.platform_post_type, auto)

  const ruleView = findRule(rules, postType)
  const rule = ruleView?.rule ?? null
  const platform = platforms?.find((p) => p.id === post.platform_id)

  // Thread sequences (CON-196) — a post that publishes as a chain rather than
  // one post. Derived from the effective type, so an automatic post that
  // resolved to `thread` renders as the chain it will publish as. The flag
  // withdraws the type from every picker, so with it off this is false for
  // every post, *including* one already saved as a `thread`: that post keeps
  // rendering as the single body it was written in, which is exactly what it
  // still publishes as until the submit path sends `threadItems`.
  const sequenceEnabled = useFeatureFlag('thread-sequence')
  const sequence = sequenceEnabled && isSequencePost(zernioId, postType)

  const policy: MediaPolicy = useMemo(
    () => mediaPolicy(post.platform_id, rule, platform),
    [post.platform_id, rule, platform],
  )

  const ready = !media.loading && !rulesLoading && !platformsLoading

  // The pure core of `useCharLimit`, fed the (platform, rule) pair resolved
  // above rather than re-running the hook's own copies of the same lookups.
  const limitsReady = !platformsLoading && !rulesLoading
  const maxContentChars = limitsReady
    ? resolveCharLimit(platform, rule, postType)
    : undefined
  const maxTitleChars = limitsReady
    ? titleLimitFor(platform?.text_constraints)
    : undefined

  // Handed the *effective* type rather than the stored one, so every check that
  // names a format names the one this post will publish as. When Auto has no
  // answer this is `''` again, and the post-type check fails exactly as it does
  // for a post nobody has chosen for — the route replaces that row with the
  // reason (`lib/postTypeAuto` knows it; `evaluatePost` has no `t`).
  const evaluated = useMemo(
    () => ({ ...post, platform_post_type: postType }),
    [post, postType],
  )

  const checks: PostCheck[] = useMemo(
    () =>
      evaluatePost({
        post: evaluated,
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
      evaluated,
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

  return {
    ...media,
    policy,
    checks,
    ready,
    maxContentChars,
    maxTitleChars,
    /** The slug this post publishes as, chosen or derived. `''` if neither. */
    postType,
    /** The resolution, or `null` when the author pinned a type themselves. */
    auto,
    /** This post publishes as a chain rather than as one post. */
    sequence,
  }
}
