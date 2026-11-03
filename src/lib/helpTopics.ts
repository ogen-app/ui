/**
 * Every place in the app that can open help (CON-173), in two registries.
 *
 * Both lists are the contract between the code and the content: the code names
 * an entry from here, an article in the CMS declares which entries it serves,
 * and the index matches them up. Adding a trigger or a screen means adding its
 * key here first — which is the point, because these lists are also what
 * someone writing help articles reads to know what the app can ask for.
 *
 * An entry with no published article is not an error. Its "?" renders nothing,
 * and the app looks exactly as it did before the entry existed — so keys can
 * be placed ahead of the writing.
 */

/**
 * Contextual topics: one control or one decision on a screen.
 *
 * Naming: `<area>.<thing>`, lower-case, dots between levels. The area is the
 * screen or object, not the component — `post.schedule`, never
 * `scheduleButton.tooltip`. Components get renamed; what the user is trying to
 * do does not.
 */
export const HELP_TOPICS = [
  'post.status',
  'post.schedule',
  'post.scheduled-at',
  'post.unschedule',
] as const

export type HelpTopic = (typeof HELP_TOPICS)[number]

/**
 * Screens: each one has (or will have) a page article, which the header's help
 * button opens.
 *
 * **A screen is named for what it is, not for its level.** `ideas` is both
 * `/ideas` and `/campaigns/:id/ideas`, because the campaign level is the same
 * menu narrowed (`lib/campaignSections`) — one page article explains both, and
 * says where the two differ. A key with a `campaign.` prefix is a screen that
 * only exists inside a campaign.
 *
 * Declared on the route, not here: a route file sets
 * `staticData: { help: '<key>' }`, and the deepest matched route that names one
 * wins (`helpPageOf`), so a layout can cover its children and a child can
 * override it.
 */
export const HELP_PAGES = [
  'campaigns',
  'campaign.overview',
  'campaign.strategy',
  'campaign.settings',
  'posts',
  'calendar',
  'post',
  'ideas',
  'assets',
  'asset',
  'analytics',
  'foundation',
  'activity',
  'workspace-settings',
] as const

export type HelpPage = (typeof HELP_PAGES)[number]

/** The screen a set of matched routes is on, deepest declaration first. */
export function helpPageOf(
  matches: ReadonlyArray<{ staticData?: { help?: HelpPage } }>,
): HelpPage | null {
  for (let i = matches.length - 1; i >= 0; i--) {
    const page = matches[i].staticData?.help
    if (page) return page
  }
  return null
}
