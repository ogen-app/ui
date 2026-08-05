import { usePlatforms } from '@/hooks/usePlatforms'
import { findRule, usePostTypeRules } from '@/hooks/usePostTypeRules'
import { resolveCharLimit, titleLimitFor } from '@/lib/platformLimits'

/**
 * The character ceiling for one post, as the server resolves it.
 *
 * Both queries behind this are reference data held with `staleTime: Infinity`,
 * so calling it from the validations panel and the preview at the same time
 * costs one fetch, not two.
 *
 * `ready` is false while either query is in flight — a `null` limit means
 * "unbounded" and a counter should not claim that until it knows.
 */
export function useCharLimit(
  platformId: string,
  postType: string,
): { limit: number | null; titleLimit: number | null; ready: boolean } {
  const { data: platforms, isLoading: platformsLoading } = usePlatforms()
  const { data: rules, isLoading: rulesLoading } = usePostTypeRules(platformId)

  const platform = platforms?.find((p) => p.id === platformId)
  const rule = findRule(rules, postType)?.rule ?? null

  return {
    limit: resolveCharLimit(platform, rule, postType),
    // Only the platform row carries this — the post-type rules don't resolve
    // a per-type title cap the way they do for body text.
    titleLimit: titleLimitFor(platform?.text_constraints),
    ready: !platformsLoading && !rulesLoading,
  }
}
