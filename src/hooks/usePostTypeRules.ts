import { useQuery } from '@tanstack/react-query'
import { getPostTypeRules } from '@/services/api/platforms'
import type { PostTypeRuleView } from '@/types/validation'

export const postTypeRulesKey = (platformId: string) =>
  ['platforms', platformId, 'post-type-rules'] as const

/**
 * Structural rules for every post type of one platform. Reference data —
 * it only changes when the platform row does, so it never goes stale
 * within a session.
 */
export function usePostTypeRules(platformId: string) {
  return useQuery({
    queryKey: postTypeRulesKey(platformId),
    queryFn: () => getPostTypeRules(platformId),
    enabled: !!platformId,
    staleTime: Infinity,
  })
}

export function findRule(
  rules: PostTypeRuleView[] | undefined,
  slug: string,
): PostTypeRuleView | undefined {
  return rules?.find((r) => r.slug === slug)
}
