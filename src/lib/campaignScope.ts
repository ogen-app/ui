import type { LinkProps } from '@tanstack/react-router'

/**
 * The menu's places, and what the campaign filter does to each.
 *
 * The rail is one list and it never changes: the same rows in the same order
 * whichever campaign is chosen above the page. The campaign is a **filter**
 * over the place you are on — Ideas is the workspace's ideas, or one
 * campaign's; Posts is every campaign's posts, or one campaign's — so choosing a campaign changes
 * what the page shows and never what the menu offers.
 *
 * Two kinds of place follow from that:
 *
 * - **Filtered** — Overview, Strategy, Ideas, Assets, Posts, Calendar,
 *   Analytics, Activity, Settings: a page for all campaigns and a page for
 *   one, and the filter picks between them. One exception: in a workspace
 *   with exactly one campaign, Posts goes straight to that campaign's list
 *   (`soleCampaignId`), because the all-campaigns list would be the same
 *   rows without ADD POST.
 * - **Workspace only** — the Inbox: no campaign narrows it. It carries no
 *   scope at all, so the filter you had chosen is kept while you are on it,
 *   and the next filtered row you open comes back filtered.
 *
 * Strategy used to be the second kind and Foundation the third, and they were
 * one subject seen from the two levels: for all campaigns, Strategy is the
 * workspace's Foundation — voices, audiences, guardrails, facts, series — with
 * the campaigns laid out on one timeline; for one campaign it is that
 * campaign's window, rate and channels, with what it uses of the Foundation
 * chosen or read beside them. So the Foundation pages (`/foundation/*`) are
 * Strategy for all campaigns, and the rail has no Foundation row.
 */
export type PlaceId =
  | 'inbox'
  | 'overview'
  | 'strategy'
  | 'ideas'
  | 'assets'
  | 'posts'
  | 'calendar'
  | 'analytics'
  | 'activity'
  | 'settings'

/**
 * Where an address is: the place, and the scope it carries — a campaign id,
 * `null` for all campaigns, or `undefined` for a page no campaign narrows,
 * which leaves the remembered filter as it was.
 */
export type Where = {
  place: PlaceId | null
  scope: string | null | undefined
}

const CAMPAIGN_PATH = /^\/campaigns\/([^/]+)(?:\/([^/]+))?/

/**
 * A campaign route's section, by its second segment. The post and asset
 * editors escape the campaign *layout* (`$campaignId_`), but the underscore
 * never reaches the URL, so `/campaigns/:id/posts/:postId` is still Posts.
 */
const CAMPAIGN_SECTION: Record<string, PlaceId> = {
  overview: 'overview',
  strategy: 'strategy',
  ideas: 'ideas',
  assets: 'assets',
  list: 'posts',
  posts: 'posts',
  calendar: 'calendar',
  analytics: 'analytics',
  activity: 'activity',
  settings: 'settings',
}

/** A workspace route's place, by its first segment. */
const WORKSPACE_PLACE: Record<string, PlaceId> = {
  // The Foundation's pages are Strategy for all campaigns.
  foundation: 'strategy',
  ideas: 'ideas',
  assets: 'assets',
  posts: 'posts',
  calendar: 'calendar',
  analytics: 'analytics',
  activity: 'activity',
  'workspace-settings': 'settings',
}

/** The places no campaign narrows, by their first segment. */
const UNSCOPED_PLACE: Record<string, PlaceId> = {
  tasks: 'inbox',
}

export function whereOf(pathname: string): Where {
  const match = CAMPAIGN_PATH.exec(pathname)
  if (match) {
    return {
      place: CAMPAIGN_SECTION[match[2] ?? ''] ?? 'overview',
      scope: decodeURIComponent(match[1]),
    }
  }
  const first = pathname.split('/')[1] ?? ''
  if (first === 'campaigns') return { place: 'overview', scope: null }
  if (WORKSPACE_PLACE[first]) {
    return { place: WORKSPACE_PLACE[first], scope: null }
  }
  return { place: UNSCOPED_PLACE[first] ?? null, scope: undefined }
}

/**
 * A row's destination. `satisfies` is what makes this worth writing out: each
 * `to` is checked against the router's own union, so a route that moves takes
 * this table down with it at compile time rather than on the click.
 */
export type PlaceLink = {
  to: LinkProps['to']
  params?: LinkProps['params']
}

const CAMPAIGN_TO = {
  overview: '/campaigns/$campaignId/overview',
  strategy: '/campaigns/$campaignId/strategy',
  ideas: '/campaigns/$campaignId/ideas',
  assets: '/campaigns/$campaignId/assets',
  posts: '/campaigns/$campaignId/list',
  // The bare address restores the campaign's last date and view.
  calendar: '/campaigns/$campaignId/calendar',
  analytics: '/campaigns/$campaignId/analytics',
  activity: '/campaigns/$campaignId/activity',
  settings: '/campaigns/$campaignId/settings',
} satisfies Record<Exclude<PlaceId, 'inbox'>, LinkProps['to']>

const WORKSPACE_TO = {
  overview: '/campaigns',
  strategy: '/foundation',
  ideas: '/ideas',
  assets: '/assets',
  posts: '/posts',
  calendar: '/calendar',
  analytics: '/analytics',
  activity: '/activity',
  settings: '/workspace-settings',
} satisfies Record<Exclude<PlaceId, 'inbox'>, LinkProps['to']>

export type PlaceLinkOptions = {
  /**
   * The workspace's campaign when it has exactly one, else `null`. Posts then
   * opens that campaign's list.
   */
  soleCampaignId?: string | null
}

/** Where a row goes under a filter: one campaign's id, or `null` for all. */
export function placeLink(
  place: PlaceId,
  campaignId: string | null,
  { soleCampaignId = null }: PlaceLinkOptions = {},
): PlaceLink {
  if (place === 'inbox') return { to: '/tasks' }
  if (campaignId) return { to: CAMPAIGN_TO[place], params: { campaignId } }
  // With one campaign, Posts for all campaigns would be that campaign's
  // posts without the ADD POST its own list has, so it opens that list.
  if (soleCampaignId && place === 'posts') {
    return { to: CAMPAIGN_TO.posts, params: { campaignId: soleCampaignId } }
  }
  return { to: WORKSPACE_TO[place] }
}

/**
 * Where choosing `target` in the switcher lands from `where`: the same place,
 * filtered. `null` when the page carries no scope — the filter changes and
 * the page stays, because nothing on it was narrowed.
 */
export function scopeLink(
  where: Where,
  target: string | null,
  options: PlaceLinkOptions = {},
): PlaceLink | null {
  if (where.scope === undefined || where.place === null) return null
  return placeLink(where.place, target, options)
}
