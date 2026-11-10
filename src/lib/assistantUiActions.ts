import type { ViewEntityKind, ViewScreen } from '@/lib/viewContext'

/**
 * The assistant driving the screen (CON-450, D5): `ui_action` events ask the
 * client to navigate, set a list's filter, tick rows, or open a smart group.
 * The server has checked every reference already; the client applies them in
 * order when the turn completes. Each is a read-tier action — no confirmation —
 * and each can be put back, because the screen it replaced is remembered.
 */
export type UIAction = {
  type:
    | 'navigate'
    | 'set_filter'
    | 'select'
    | 'open_saved_view'
    | 'set_window'
    | 'open_connect'
  screen: ViewScreen
  campaignId?: string
  focus?: { kind: ViewEntityKind; id: string }
  /** The list's new filter, in the list endpoint's query form; "" clears it. */
  filter?: string
  selection?: { kind: ViewEntityKind; ids: string[] }
  savedViewId?: string
  /**
   * An analytics screen's new window (CON-463): dates, platforms, campaign.
   * The server built it on the window on screen, so it is the whole state.
   */
  window?: {
    from?: string
    to?: string
    platforms: string[]
    campaignId?: string
  }
  /**
   * Settings' connect flow to open (CON-464): a new account on `platform`,
   * or — `reconnect` — the account named. The user runs it; nothing is
   * connected here.
   */
  connect?: { platform: string; accountId?: string; reconnect: boolean }
}

/** An action as the thread keeps it: what it did, and where it was before. */
export type AppliedUIAction = {
  action: UIAction
  /** The address before it ran, for UNDO / BACK; absent when it never ran. */
  before?: string
  undone?: boolean
}

/**
 * A navigation the router can take: a route template, its params, and the
 * search to land with. Null when the screen can't be reached from what the
 * action carries — a campaign screen without its campaign.
 */
export type Destination = {
  to: string
  params: Record<string, string>
  search?: Record<string, string>
}

const WORKSPACE_PATHS: Partial<Record<ViewScreen, string>> = {
  home: '/',
  ideas: '/ideas',
  assets: '/assets',
  analytics: '/analytics',
  calendar: '/calendar',
  campaigns: '/campaigns',
  tasks: '/tasks',
  activity: '/activity',
  settings: '/workspace-settings',
  profile: '/profile',
  foundation: '/foundation',
  'foundation.voices': '/foundation/voices',
  'foundation.audiences': '/foundation/audiences',
  'foundation.facts': '/foundation/facts',
  'foundation.guardrails': '/foundation/guardrails',
  'foundation.look': '/foundation/look',
  'foundation.questions': '/foundation/questions',
  'foundation.series': '/foundation/series',
  'foundation.templates': '/foundation/templates',
}

const CAMPAIGN_PATHS: Partial<Record<ViewScreen, string>> = {
  'campaign.overview': '/campaigns/$campaignId',
  'campaign.strategy': '/campaigns/$campaignId/strategy',
  'campaign.list': '/campaigns/$campaignId/list',
  'campaign.ideas': '/campaigns/$campaignId/ideas',
  'campaign.assets': '/campaigns/$campaignId/assets',
  'campaign.analytics': '/campaigns/$campaignId/analytics',
  'campaign.calendar': '/campaigns/$campaignId/calendar',
  'campaign.activity': '/campaigns/$campaignId/activity',
  'campaign.settings': '/campaigns/$campaignId/settings',
}

/** Detail screens: the route, and the param their focus fills. */
const DETAIL_PATHS: Partial<Record<ViewScreen, [string, string]>> = {
  asset: ['/assets/$assetId', 'assetId'],
  'campaign.asset': ['/campaigns/$campaignId/assets/$assetId', 'assetId'],
  post: ['/campaigns/$campaignId/posts/$postId', 'postId'],
  'foundation.voice': ['/foundation/voices/$voiceId', 'voiceId'],
  'foundation.audience': ['/foundation/audiences/$audienceId', 'audienceId'],
  'foundation.series_item': ['/foundation/series/$seriesId', 'seriesId'],
}

/** Where a screen is, from what the action says about it. */
export function destinationFor(action: UIAction): Destination | null {
  const { screen, campaignId, focus } = action
  // A campaign's Analytics tab has no window of its own: the window lives on
  // the dashboard, narrowed to that campaign.
  if (action.type === 'set_window' && screen === 'campaign.analytics') {
    return { to: '/analytics', params: {} }
  }
  const workspace = WORKSPACE_PATHS[screen]
  if (workspace) return { to: workspace, params: {} }

  const campaign = CAMPAIGN_PATHS[screen]
  if (campaign) {
    return campaignId ? { to: campaign, params: { campaignId } } : null
  }

  const detail = DETAIL_PATHS[screen]
  if (detail && focus) {
    const [to, param] = detail
    const params: Record<string, string> = { [param]: focus.id }
    if (to.includes('$campaignId')) {
      if (!campaignId) return null
      params.campaignId = campaignId
    }
    return { to, params }
  }
  return null
}

/**
 * The query keys the list endpoint takes that are not part of the page's own
 * address: the scope the page adds itself, the zone it reads dates in, paging.
 */
const SERVER_ONLY = new Set([
  'scope_campaign',
  'tz',
  'limit',
  'cursor',
  'facets',
  'ids_only',
])

/**
 * A list filter as the page's search params. The Ideas and Assets pages keep
 * their filter in search params named exactly as the endpoint's
 * (`lib/ideaFilter`, `lib/assetFilter`), so the endpoint's query *is* the
 * address, less the keys only the request carries. A repeated key is the
 * pages' comma list.
 */
export function searchFromFilter(filter: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of new URLSearchParams(filter)) {
    if (SERVER_ONLY.has(key) || !value) continue
    out[key] = out[key] ? `${out[key]},${value}` : value
  }
  return out
}

/**
 * Settings' address for an `open_connect` (CON-464): the account to
 * reconnect, with its platform for when the account can't be found, or the
 * platform to connect a new account on. The page singles that one out and
 * puts the focus on its button; the user presses it.
 */
export function connectSearch(
  connect: NonNullable<UIAction['connect']>,
): Record<string, string> {
  return connect.reconnect && connect.accountId
    ? { reconnect: connect.accountId, platform: connect.platform }
    : { connect: connect.platform }
}

/**
 * The campaign a `set_window` narrows to: the window's, else — from a
 * campaign's own Analytics tab — that campaign.
 */
export function windowCampaign(action: UIAction): string | undefined {
  return (
    action.window?.campaignId ||
    (action.screen === 'campaign.analytics' ? action.campaignId : undefined)
  )
}
