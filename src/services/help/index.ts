import { HELP_FIXTURES } from '@/services/help/fixtures'
import type { HelpArticle, HelpIndexEntry, HelpTopicMap } from '@/types/help'

/**
 * Reading help content — the seam the CMS client lands behind (CON-173).
 *
 * Every function is async and can miss, because that is what they will be
 * once they cross a network: the drawer already handles loading and
 * not-found states, so swapping the body of these functions for a GROQ
 * request is the whole of phase 3's integration.
 *
 * **These calls must never go through `services/api/http.ts`.** Every request in
 * there carries `credentials: 'include'`; help content comes from Sanity, a
 * third party, and sending the session cookie to it would be a quiet mistake to
 * make by reusing the helper that is right for everything else.
 */

/** One article, in the reader's language, or null if there isn't one. */
export async function fetchHelpArticle(
  key: string,
): Promise<HelpArticle | null> {
  return HELP_FIXTURES[key] ?? null
}

/**
 * Which article answers each contextual topic.
 *
 * One request for the whole app, cached hard: every trigger consults it to
 * decide whether to render, so it is on the path of screens that have nothing
 * to do with help.
 */
export async function fetchHelpTopicMap(): Promise<HelpTopicMap> {
  const map: HelpTopicMap = {}
  for (const article of Object.values(HELP_FIXTURES)) {
    // First article wins. Two articles claiming one topic is a content
    // mistake, and picking arbitrarily hides it — but it must not throw:
    // help failing loudly is worse than help being slightly wrong.
    for (const topic of article.topics) map[topic] ??= article.key
  }
  return map
}

/**
 * Every article, without its body — the help home the top bar's Support opens
 * onto. Ordered by category, then title, so the list reads the same way twice.
 */
export async function fetchHelpIndex(): Promise<HelpIndexEntry[]> {
  return Object.values(HELP_FIXTURES)
    .map(({ key, title, summary, category }) => ({
      key,
      title,
      summary,
      category,
    }))
    .sort(
      (a, b) =>
        a.category.title.localeCompare(b.category.title) ||
        a.title.localeCompare(b.title),
    )
}
