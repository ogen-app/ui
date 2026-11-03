import { useQuery } from '@tanstack/react-query'
import { fetchHelpArticle, fetchHelpIndex } from '@/services/help'
import { useLocale } from '@/hooks/useLocale'
import { useHelpStore } from '@/stores/helpStore'
import type { HelpArticle, HelpIndex } from '@/types/help'

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

/** Per language: the same key is a different document in each. */
const helpArticleKey = (locale: string, key: string) =>
  ['help', locale, 'article', key] as const
const HELP_INDEX_KEY = ['help', 'index'] as const

export function useHelpArticle(articleKey: string | null) {
  const locale = useLocale()
  return useQuery<HelpArticle | null>({
    queryKey: helpArticleKey(locale, articleKey ?? ''),
    queryFn: () => fetchHelpArticle(articleKey!, locale),
    enabled: articleKey !== null,
    staleTime: HELP_STALE_TIME,
  })
}

/**
 * Which article answers each topic and each screen.
 *
 * Every `<HelpTrigger>` and every page header reads this to decide whether a
 * "?" should exist, so it runs on screens with no help open. One shared query,
 * cached for the session.
 *
 * `enabled` is the feature flag, and it is a parameter rather than a read
 * inside this hook because the flag belongs to the call site. It matters more
 * than it looks: the triggers sit on ordinary screens, so with the flag off and
 * this query unconditional every screen would open a cross-origin request to
 * Sanity for a drawer that cannot be opened.
 */
export function useHelpIndex({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<HelpIndex>({
    queryKey: HELP_INDEX_KEY,
    queryFn: fetchHelpIndex,
    enabled,
    staleTime: HELP_STALE_TIME,
  })
}

/**
 * The page article for the screen on view, or null — no screen declared, or
 * no article written for it yet.
 */
export function usePageHelpArticle({ enabled }: { enabled: boolean }) {
  const page = useHelpStore((s) => s.page)
  const { data: index } = useHelpIndex({ enabled })
  return (page && index?.pages[page]) || null
}
