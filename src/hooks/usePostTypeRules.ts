import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPostTypeRules } from "@/services/api/platforms";
import type { ResolvedPostTypeRule } from "@/types/validation";

export function postTypeRulesKey(platformId: string | undefined) {
  return ["post-type-rules", platformId] as const;
}

// Fetches the per-content-type rules for a platform. Rules are static
// per deploy, so they're cached indefinitely like the platforms list.
export function usePostTypeRules(platformId: string | undefined) {
  return useQuery({
    queryKey: postTypeRulesKey(platformId),
    queryFn: () => getPostTypeRules(platformId!),
    enabled: !!platformId,
    staleTime: Infinity,
  });
}

// Resolves the structural rule for one platform + post-type slug.
export function usePostTypeRule(
  platformId: string | undefined,
  slug: string | undefined,
): ResolvedPostTypeRule | null {
  const { data } = usePostTypeRules(platformId);
  return useMemo(
    () => data?.find((r) => r.slug === slug)?.rule ?? null,
    [data, slug],
  );
}
