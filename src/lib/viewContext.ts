import type { ThreadSubject } from '@/types/assistant'

/**
 * What the user is looking at, sent with every assistant turn (CON-450, D3).
 * References only — ids, a filter string, a window — never content: the server
 * reloads everything from the ids in the caller's tenant and trusts nothing on
 * screen as data. Mirrors `domain/viewcontext` on the server; v1 is the only
 * version it accepts.
 */
export type ViewContext = {
  version: 1
  screen: ViewScreen
  scope: ViewScope
  focus?: { kind: ViewEntityKind; id: string }
  selection?:
    | { kind: ViewEntityKind; ids: string[]; count?: number }
    | { kind: ViewEntityKind; allMatching: true; count?: number }
  /** The list's filter, in the list endpoint's own query-string form. */
  filter?: string
  savedViewId?: string
  sort?: string
  /**
   * An analytics window: its days, platforms and — on the dashboard — the
   * campaign it is narrowed to (CON-463).
   */
  window?: {
    from: string
    to: string
    /**
     * The relative span the dates resolve, when the screen chose one
     * (`28d`), so the assistant and the chip can name it as the picker does
     * (CON-479).
     */
    preset?: string
    platforms?: string[]
    campaignId?: string
  }
  visible?: { kind: ViewEntityKind; ids: string[] }
}

export type ViewScope =
  | { kind: 'workspace' }
  | { kind: 'campaign'; id: string }
  | { kind: 'post'; id: string }

export type ViewEntityKind =
  | 'idea'
  | 'asset'
  | 'post'
  | 'campaign'
  | 'voice'
  | 'audience'
  | 'fact'
  | 'series'

/** Every screen the server knows (`viewcontext.Screen`). */
export type ViewScreen =
  | 'home'
  | 'ideas'
  | 'assets'
  | 'asset'
  | 'analytics'
  | 'analytics.post'
  | 'calendar'
  | 'campaigns'
  | 'tasks'
  | 'activity'
  | 'settings'
  | 'profile'
  | 'post'
  | 'foundation'
  | 'foundation.voices'
  | 'foundation.voice'
  | 'foundation.audiences'
  | 'foundation.audience'
  | 'foundation.facts'
  | 'foundation.guardrails'
  | 'foundation.look'
  | 'foundation.questions'
  | 'foundation.series'
  | 'foundation.series_item'
  | 'foundation.templates'
  | 'campaign.overview'
  | 'campaign.strategy'
  | 'campaign.list'
  | 'campaign.ideas'
  | 'campaign.assets'
  | 'campaign.asset'
  | 'campaign.analytics'
  | 'campaign.calendar'
  | 'campaign.activity'
  | 'campaign.settings'

/** The thread a subject's turns belong to, as the view context names it. */
export function scopeOf(subject: ThreadSubject): ViewScope {
  switch (subject.kind) {
    case 'workspace':
      return { kind: 'workspace' }
    case 'campaign':
      return { kind: 'campaign', id: subject.campaignId }
    case 'post':
      return { kind: 'post', id: subject.postId }
  }
}

/** The screen a subject's own page is, when nothing more specific is known. */
function homeScreen(subject: ThreadSubject): ViewScreen {
  switch (subject.kind) {
    case 'workspace':
      return 'home'
    case 'campaign':
      return 'campaign.overview'
    case 'post':
      return 'post'
  }
}

/** The smallest valid view context for a thread: its scope and a screen. */
export function baseViewContext(subject: ThreadSubject): ViewContext {
  return { version: 1, screen: homeScreen(subject), scope: scopeOf(subject) }
}

/** The server's caps (`domain/viewcontext`), applied before a turn is sent. */
export const MAX_SELECTION_IDS = 200
export const MAX_VISIBLE_IDS = 50
export const MAX_FILTER_LENGTH = 2000

/** Where the user is: the screen, and the entity a detail screen shows. */
export type ViewLocation = {
  screen: ViewScreen | null
  focus?: { kind: ViewEntityKind; id: string }
}

/**
 * What a list or a dashboard adds: its selection, its filter, its window. Only
 * one page owns it at a time — the screen that registered it last.
 */
export type ViewPage = Pick<
  ViewContext,
  | 'selection'
  | 'filter'
  | 'savedViewId'
  | 'sort'
  | 'window'
  | 'visible'
  /**
   * An item open inside a list rather than on a route of its own — an idea
   * expanded on the Ideas list (CON-481). It is the turn's focus, over the
   * route's.
   */
  | 'focus'
>

/**
 * The screen each route is, keyed by the route's full path. A route missing
 * here — the auth screens, `/plans`, the flag panel — is no screen the server
 * knows, and turns sent from it fall back to the thread's own screen.
 */
const SCREENS: Record<string, ViewScreen> = {
  '/': 'home',
  '/activity': 'activity',
  '/activity/': 'activity',
  '/activity/$date': 'activity',
  '/analytics/': 'analytics',
  '/assets/': 'assets',
  '/assets/$assetId': 'asset',
  '/calendar/': 'calendar',
  '/calendar/$anchor/$view': 'calendar',
  '/campaigns/': 'campaigns',
  '/campaigns/$campaignId': 'campaign.overview',
  '/campaigns/$campaignId/': 'campaign.overview',
  '/campaigns/$campaignId/overview': 'campaign.overview',
  '/campaigns/$campaignId/activity': 'campaign.activity',
  '/campaigns/$campaignId/analytics': 'campaign.analytics',
  '/campaigns/$campaignId/assets': 'campaign.assets',
  '/campaigns/$campaignId/assets/$assetId': 'campaign.asset',
  '/campaigns/$campaignId/calendar/': 'campaign.calendar',
  '/campaigns/$campaignId/calendar/$anchor/$view': 'campaign.calendar',
  '/campaigns/$campaignId/ideas': 'campaign.ideas',
  '/campaigns/$campaignId/list': 'campaign.list',
  '/campaigns/$campaignId/posts/$postId': 'post',
  '/campaigns/$campaignId/settings': 'campaign.settings',
  '/campaigns/$campaignId/strategy': 'campaign.strategy',
  '/foundation': 'foundation',
  '/foundation/': 'foundation',
  '/foundation/read/$runId': 'foundation',
  '/foundation/audiences': 'foundation.audiences',
  '/foundation/audiences/$audienceId': 'foundation.audience',
  '/foundation/facts': 'foundation.facts',
  '/foundation/guardrails': 'foundation.guardrails',
  '/foundation/look': 'foundation.look',
  '/foundation/questions': 'foundation.questions',
  '/foundation/series': 'foundation.series',
  '/foundation/series/$seriesId': 'foundation.series_item',
  '/foundation/templates': 'foundation.templates',
  '/foundation/voices': 'foundation.voices',
  '/foundation/voices/$voiceId': 'foundation.voice',
  '/ideas/': 'ideas',
  '/profile/': 'profile',
  '/tasks': 'tasks',
  '/workspace-settings/': 'settings',
  '/workspace-settings/connect/$connectionId': 'settings',
}

/** The detail screens, and which route param names their entity. */
const FOCUS: Partial<
  Record<ViewScreen, { kind: ViewEntityKind; param: string }>
> = {
  asset: { kind: 'asset', param: 'assetId' },
  'campaign.asset': { kind: 'asset', param: 'assetId' },
  post: { kind: 'post', param: 'postId' },
  'foundation.voice': { kind: 'voice', param: 'voiceId' },
  'foundation.audience': { kind: 'audience', param: 'audienceId' },
  'foundation.series_item': { kind: 'series', param: 'seriesId' },
}

/** Reads the screen and its focus off the deepest matched route. */
export function locationFor(
  fullPath: string,
  params: Record<string, string | undefined>,
): ViewLocation {
  const screen = SCREENS[fullPath] ?? null
  const focus = screen ? FOCUS[screen] : undefined
  const id = focus ? params[focus.param] : undefined
  return focus && id ? { screen, focus: { kind: focus.kind, id } } : { screen }
}

/**
 * The view context a turn is sent with. The scope is always the thread's —
 * the server names the thread by it — and the screen is wherever the user is,
 * which need not be the thread's own page: the thread list can open a campaign
 * thread from Ideas. `bare` sends the screen alone, for a turn the user asked
 * to send without what is selected (the chip's ×).
 */
export function buildViewContext(
  subject: ThreadSubject,
  location: ViewLocation,
  page: ViewPage | null,
  bare = false,
): ViewContext {
  const context = baseViewContext(subject)
  if (location.screen) context.screen = location.screen
  if (bare) return context
  if (location.focus) context.focus = location.focus
  if (!page) return context
  return { ...context, ...capped(page) }
}

function capped(page: ViewPage): ViewPage {
  const out: ViewPage = { ...page }
  if (out.selection && 'ids' in out.selection) {
    // Past the cap the first ids go and `count` keeps the whole tally, so the
    // turn says it is partial rather than passing for the whole selection —
    // and the chip says so before it is sent (`chipText`).
    const { ids } = out.selection
    out.selection = {
      kind: out.selection.kind,
      ids: ids.slice(0, MAX_SELECTION_IDS),
      count: out.selection.count ?? ids.length,
    }
  }
  if (out.visible) {
    out.visible = {
      ...out.visible,
      ids: out.visible.ids.slice(0, MAX_VISIBLE_IDS),
    }
  }
  if (out.filter && out.filter.length > MAX_FILTER_LENGTH) {
    delete out.filter
    // A whole match is defined by its filter; without one it names nothing
    // the server could resolve, so it goes with it.
    if (out.selection && 'allMatching' in out.selection) delete out.selection
  }
  return out
}

/**
 * A list's filter as the view context carries it: the list endpoint's own
 * query string, with paging, counting and grouping left off — they order a
 * page, not the set the filter names.
 */
export function listFilter(params: Record<string, string>): string {
  const rest = Object.entries(params).filter(
    ([key]) =>
      !['cursor', 'limit', 'facets', 'group', 'sort', 'ids_only'].includes(key),
  )
  return new URLSearchParams(rest).toString()
}
