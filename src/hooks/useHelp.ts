import { useQuery } from '@tanstack/react-query'
import { fetchHelpArticle, fetchHelpTopicMap } from '@/services/help'
import type { HelpArticle, HelpTopicMap } from '@/types/help'

/**
 * Reading help content (CON-173).
 *
 * Help is the most cacheable thing in the app: it is the same for everyone in
 * the workspace, it changes when someone edits an article rather than when the
 * user does anything, and a stale paragraph costs nothing. So both queries sit
 * far outside the app's usual freshness rules — refetching them on window focus
 * would be pure noise.
 */

const HELP_STALE_TIME = 60 * 60 * 1000 // an hour

export const helpArticleKey = (key: string) => ['help', 'article', key] as const
export const HELP_TOPICS_KEY = ['help', 'topics'] as const

export function useHelpArticle(articleKey: string | null) {
  return useQuery<HelpArticle | null>({
    queryKey: helpArticleKey(articleKey ?? ''),
    queryFn: () => fetchHelpArticle(articleKey!),
    enabled: articleKey !== null,
    staleTime: HELP_STALE_TIME,
  })
}

/**
 * Which article answers each topic.
 *
 * Every `<HelpTrigger>` reads this to decide whether it should exist, so it
 * runs on screens with no help open. One shared query, cached for the session.
 *
 * `enabled` is the feature flag, and it is a parameter rather than a read
 * inside this hook because the flag belongs to the call site. It matters more
 * than it looks: the triggers sit on ordinary screens, so with the flag off and
 * this query unconditional every post editor would open a cross-origin request
 * to Sanity for a drawer that cannot be opened. Fixtures hide that today — the
 * cost only appears on the deploy that swaps in the real read, which is the
 * worst moment to discover it.
 */
export function useHelpTopicMap({
  enabled = true,
}: { enabled?: boolean } = {}) {
  return useQuery<HelpTopicMap>({
    queryKey: HELP_TOPICS_KEY,
    queryFn: fetchHelpTopicMap,
    enabled,
    staleTime: HELP_STALE_TIME,
  })
}
