import type { HelpArticle } from '@/types/help'
import { CONCEPTS } from './concepts'
import { PAGES } from './pages'

/**
 * Stand-in content, shaped exactly like the CMS projection (CON-173).
 *
 * The app reads the public `production` dataset, and there is nothing there to
 * read yet — so until there is, `services/help` serves these. Keeping them in
 * the real payload shape (Portable Text, `target` keys on cross-links,
 * callouts and embeds as blocks) is what makes them scaffolding rather than a
 * detour: the renderer built against these needs no change when the network
 * arrives.
 *
 * English only, which is also the real dataset's starting point: an article
 * with no translation falls back to English, and the drawer says so.
 */
export const HELP_FIXTURES: Record<string, HelpArticle> = Object.fromEntries(
  [...CONCEPTS, ...PAGES].map((article) => [article.key, article]),
)
