/**
 * Which level of the rail a URL is on.
 *
 * The sidebar used to ask a different question — "which campaign, if any, is
 * the active one" — and answer it so it could expand that campaign's row in a
 * list of all of them. Under the drill-down there is no list to expand: the
 * campaign *replaces* the level, so the only thing the rail needs to know is
 * which of the two it is drawing, and the URL is the whole of the answer.
 *
 * Deriving it rather than storing it is what keeps the rail honest. A level
 * held in component state has to be pushed by every navigation that could
 * change it — the back control, a card on `/campaigns`, a notification opening
 * a post, the browser's own back button — and the one that gets missed leaves
 * the rail drawing a campaign the page is no longer showing. Read off the
 * address, the rail cannot disagree with the screen.
 *
 * The pathname is enough, and deliberately so: the post and asset editors
 * escape the campaign *layout* (`campaigns/$campaignId_/posts/$postId`), but
 * the trailing underscore is a route-tree convention that never reaches the
 * URL. They are still inside the campaign as far as the address is concerned,
 * which is also how they should read in the rail — opening a post must not
 * throw you back out to the workspace.
 */

export type NavLevel =
  { level: 0; campaignId: null } | { level: 1; campaignId: string }

/** `/campaigns/<id>` and anything under it. `/campaigns` itself is level 0. */
const CAMPAIGN_PATH = /^\/campaigns\/([^/]+)/

export function navLevelOf(pathname: string): NavLevel {
  const campaignId = CAMPAIGN_PATH.exec(pathname)?.[1]
  return campaignId
    ? { level: 1, campaignId: decodeURIComponent(campaignId) }
    : { level: 0, campaignId: null }
}
