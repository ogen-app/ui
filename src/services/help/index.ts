import { queryHelpArticle, queryHelpIndex } from '@/services/help/sanity'
import type { HelpArticle, HelpIndex, HelpIndexRow } from '@/types/help'

/**
 * Reading help content from Sanity (CON-173) — in every build, dev included,
 * so a broken query or a missing article shows on the screen where it happens.
 * A read can fail or come back empty, and the panel says which.
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
  return queryHelpArticle(key, locale)
}

/**
 * Which article answers each topic and each screen.
 *
 * One request for the whole app, cached hard: every trigger and every page
 * header consults it to decide whether to render, so it is on the path of
 * screens that have nothing to do with help.
 */
export async function fetchHelpIndex(): Promise<HelpIndex> {
  return buildHelpIndex(await queryHelpIndex())
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
