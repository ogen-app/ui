/**
 * Every place in the app that can open contextual help (CON-173).
 *
 * This list is the contract between the code and the content: a `<HelpTrigger>`
 * names a topic from here, an article in the CMS declares which topics it
 * serves, and the drawer matches them up. Adding a trigger means adding its
 * topic here first — which is the point, because the list is also what someone
 * writing help articles reads to know what the app can ask for.
 *
 * Naming: `<area>.<thing>`, lower-case, dots between levels. The area is the
 * screen or object, not the component — `post.schedule`, never
 * `scheduleButton.tooltip`. Components get renamed; what the user is trying to
 * do does not.
 *
 * A topic with no published article is not an error. The trigger renders
 * nothing, and the app looks exactly as it did before the topic existed — so
 * triggers can be placed ahead of the writing.
 */
export const HELP_TOPICS = [
  'post.status',
  'post.schedule',
  'post.scheduled-at',
  'post.unschedule',
] as const

export type HelpTopic = (typeof HELP_TOPICS)[number]
