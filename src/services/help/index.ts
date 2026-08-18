import { HELP_FIXTURES } from '@/services/help/fixtures'
import type { HelpArticle, HelpTopicMap } from '@/types/help'

/**
 * Reading help content — the seam the CMS client lands behind (CON-173).
 *
 * Both functions are async and both can miss, because that is what they will be
 * once they cross a network: the drawer already handles loading and
 * not-found states, so swapping the body of these two functions for a GROQ
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
