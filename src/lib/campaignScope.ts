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
 * Three kinds of place follow from that:
 *
 * - **Filtered** — Overview, Ideas, Assets, Posts, Analytics, Activity,
 *   Settings (and Calendar while the workspace calendar is on): a page for
 *   all campaigns and a page for one, and the filter picks between them.
 * - **Campaign only** — Strategy (and Calendar while the workspace
 *   calendar is off): there is nothing to show for all campaigns at once, so
 *   with no campaign chosen the row opens the campaign cards and asks for one
 *   (`/campaigns?pick=<place>`). Picking a card lands on that place, filtered.
 *   A workspace with exactly one campaign has nothing to choose between, so
 *   there the row goes straight to that campaign (`soleCampaignId`) — and so
 *   does Posts, whose all-campaigns list would be the same rows without ADD
 *   POST.
 * - **Workspace only** — Foundation (and the Inbox): the workspace's own
 *   material, which no campaign narrows. These pages carry no scope at all,
 *   so the filter you had chosen is kept while you are on them, and the next
 *   filtered row you open comes back filtered.
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
  | 'foundation'
  | 'activity'
  | 'settings'

/** The places with no all-campaigns page, which ask for a campaign instead. */
export const PICK_PLACES = ['calendar', 'strategy'] as const
export type PickPlace = (typeof PICK_PLACES)[number]

export function isPickPlace(value: unknown): value is PickPlace {
  return (PICK_PLACES as readonly unknown[]).includes(value)
}

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
  foundation: 'foundation',
  tasks: 'inbox',
}

/** `pick` is the campaigns list's search param: which place is asking. */
export function whereOf(pathname: string, pick?: unknown): Where {
  const match = CAMPAIGN_PATH.exec(pathname)
  if (match) {
    return {
      place: CAMPAIGN_SECTION[match[2] ?? ''] ?? 'overview',
      scope: decodeURIComponent(match[1]),
    }
  }
  const first = pathname.split('/')[1] ?? ''
  if (first === 'campaigns') {
    return { place: isPickPlace(pick) ? pick : 'overview', scope: null }
  }
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
  search?: LinkProps['search']
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
} satisfies Record<Exclude<PlaceId, 'inbox' | 'foundation'>, LinkProps['to']>

const WORKSPACE_TO = {
  overview: '/campaigns',
  ideas: '/ideas',
  assets: '/assets',
  posts: '/posts',
  analytics: '/analytics',
  activity: '/activity',
  settings: '/workspace-settings',
} satisfies Partial<Record<PlaceId, LinkProps['to']>>

export type PlaceLinkOptions = {
  workspaceCalendar: boolean
  /**
   * The workspace's campaign when it has exactly one, else `null`. A
   * campaign-only place then opens it rather than asking which.
   */
  soleCampaignId?: string | null
}

/** Where a row goes under a filter: one campaign's id, or `null` for all. */
export function placeLink(
  place: PlaceId,
  campaignId: string | null,
  { workspaceCalendar, soleCampaignId = null }: PlaceLinkOptions,
): PlaceLink {
  if (place === 'foundation') return { to: '/foundation' }
  if (place === 'inbox') return { to: '/tasks' }
  if (campaignId) return { to: CAMPAIGN_TO[place], params: { campaignId } }
  if (place === 'calendar' && workspaceCalendar) return { to: '/calendar' }
  // With one campaign, Posts for all campaigns would be that campaign's
  // posts without the ADD POST its own list has, so it opens that list.
  if (soleCampaignId && (isPickPlace(place) || place === 'posts')) {
    return { to: CAMPAIGN_TO[place], params: { campaignId: soleCampaignId } }
  }
  if (isPickPlace(place)) return { to: '/campaigns', search: { pick: place } }
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
  options: PlaceLinkOptions,
): PlaceLink | null {
  if (where.scope === undefined || where.place === null) return null
  return placeLink(where.place, target, options)
}
