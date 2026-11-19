import type { HelpArticle } from '@/types/help'
import { CONCEPTS } from './concepts'
import { PAGES } from './pages'

/**
 * Help articles for the tests (CON-173), shaped exactly like what
 * `services/help/sanity.ts` projects out of Sanity: Portable Text, `target`
 * keys on cross-links, callouts and embeds as blocks.
 *
 * Test data only. The app always reads Sanity, in dev too, so a broken query
 * or a missing article shows up on the screen where it happens rather than
 * behind a stand-in; the tests cannot reach the network, so they read these
 * through a mocked `services/help`. They are a snapshot of six screens'
 * articles from when the dataset was first filled (2026-11-19), and are not
 * kept in step with it.
 */
export const HELP_ARTICLES: Record<string, HelpArticle> = Object.fromEntries(
  [...CONCEPTS, ...PAGES].map((article) => [article.key, article]),
)
