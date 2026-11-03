import { HELP_FIXTURES } from '@/services/help/fixtures'
import {
  queryHelpArticle,
  queryHelpIndex,
  sanityConfig,
} from '@/services/help/sanity'
import type { HelpArticle, HelpIndex, HelpIndexRow } from '@/types/help'

/**
 * Reading help content — the seam the CMS lands behind (CON-173).
 *
 * Two sources with one shape: Sanity when `VITE_SANITY_PROJECT_ID` is set, the
 * fixtures otherwise. Both can miss, because one of them crosses a network and
 * the drawer handles loading and not-found either way.
 *
 * **These calls must never go through `services/api/http.ts`.** Every request
 * in there carries `credentials: 'include'`; help content comes from Sanity, a
 * third party, and sending the session cookie to it would be a quiet mistake
 * to make by reusing the helper that is right for everything else.
 */

/** One article, in the reader's language if it has one, or null. */
export async function fetchHelpArticle(
  key: string,
  locale: string,
): Promise<HelpArticle | null> {
  if (sanityConfig()) return queryHelpArticle(key, locale)
  return HELP_FIXTURES[key] ?? null
}

/**
 * Which article answers each topic and each screen.
 *
 * One request for the whole app, cached hard: every trigger and every page
 * header consults it to decide whether to render, so it is on the path of
 * screens that have nothing to do with help.
 */
export async function fetchHelpIndex(): Promise<HelpIndex> {
  const rows = sanityConfig()
    ? await queryHelpIndex()
    : Object.values(HELP_FIXTURES)
  return buildHelpIndex(rows)
}

/**
 * First article wins, for a topic and for a screen alike. Two articles
 * claiming one is a content mistake, and picking arbitrarily hides it — but it
 * must not throw: help failing loudly is worse than help being slightly wrong.
 *
 * Only a page article can claim a screen. A concept that lists one is ignored
 * rather than obeyed, because a concept opened as "help for this page" would
 * answer a question nobody on that page asked.
 */
export function buildHelpIndex(rows: HelpIndexRow[]): HelpIndex {
  const index: HelpIndex = { topics: {}, pages: {} }
  for (const row of rows) {
    for (const topic of row.topics) index.topics[topic] ??= row.key
    if (row.kind !== 'page') continue
    for (const page of row.pages) index.pages[page] ??= row.key
  }
  return index
}
