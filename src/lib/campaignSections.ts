import type { LinkProps } from '@tanstack/react-router'
import {
  AiIdeaIcon,
  BellIcon,
  Calendar04Icon,
  ChartColumnIncreasingIcon,
  Chess02Icon,
  FolderLibraryIcon,
  Navigation06Icon,
  NewsIcon,
  Settings01Icon,
} from '@hugeicons/core-free-icons'

/**
 * The campaign's sections, as the app names and marks them.
 *
 * One table because a section has one name and one glyph wherever it appears:
 * the sidebar's rows and the Overview's cards are two views of the same
 * things, and a card headed "Setup" over a nav row reading "Settings" makes the
 * user work out that they are the same place. Renaming one now renames both.
 *
 * **Each of these is a workspace module, narrowed.** The campaign level is not
 * a different menu, it is the same menu with the scope changed — Inbox becomes
 * this campaign's Overview, Ideas becomes this campaign's ideas, Assets its own
 * documents, Campaigns becomes its Posts, Calendar its calendar, Analytics its
 * numbers. Reading the
 * two levels side by side is how a person learns that going into a campaign
 * narrows what they are looking at rather than taking them somewhere else, and
 * that only works while the rows keep answering to each other. A section here
 * with no workspace counterpart, or a module up there with nothing down here,
 * is the thing to notice and fix rather than to add.
 *
 * Strategy is the one deliberate exception: a campaign commits to a window, a
 * rate and a spend, and a workspace commits to nothing, so there is no row it
 * could narrow from. The exception in the other direction is Foundation, which
 * is level 0's and has no row here: a campaign does not keep voices or
 * guardrails of its own, it points at the workspace's, and that pointing is a
 * card on Strategy (`CampaignBrandCard`). The row that used to sit here was
 * this campaign's documents wearing Foundation's name, and they are Assets
 * now.
 *
 * Labels are catalogue keys rather than strings — `t` is only available inside
 * a component, and a constant built at import time would freeze whichever
 * language loaded first.
 *
 * `tone` is the glyph's permanent colour (see `--nav-*` in index.css). Six
 * otherwise-identical line glyphs are hard to tell apart at 16px, and the hue
 * is what you actually aim at once you've used the app for a day. It stays on
 * the icon and nowhere else — the selected row is grey like every other, so
 * colour means "which section" and never "you are here". The utilities have
 * none by design: they are the band below the level, and every gear in the app
 * stays in the text colour so they read as the same kind of destination.
 *
 * `utility` is which band the row belongs to — the level itself, or the footer
 * under it (`NavUtilityStrip`). It is a property of the section rather than a
 * list held next to the nav, so a section cannot be in the rail and the footer
 * at once, or in neither.
 */
export const CAMPAIGN_SECTIONS = [
  {
    id: 'overview',
    labelKey: 'nav.campaign.overview',
    openKey: 'campaignOverview.openOverview',
    // Where you are and what is waiting: the campaign's front page.
    icon: Navigation06Icon,
    tone: 'var(--nav-overview)',
    utility: false,
  },
  {
    id: 'strategy',
    labelKey: 'nav.campaign.strategy',
    openKey: 'campaignOverview.openStrategy',
    icon: Chess02Icon,
    tone: 'var(--nav-strategy)',
    utility: false,
  },
  {
    id: 'ideas',
    labelKey: 'nav.campaign.ideas',
    openKey: 'campaignOverview.openIdeas',
    icon: AiIdeaIcon,
    tone: 'var(--nav-ideas)',
    utility: false,
  },
  {
    // Above Posts, mirroring Assets above Campaigns at level 0 — the material
    // before the work made from it. Its own glyph rather than Foundation's
    // palette: this row is the documents, which is all the page it opens has
    // ever been.
    id: 'assets',
    labelKey: 'nav.campaign.assets',
    openKey: 'campaignOverview.openAssets',
    icon: FolderLibraryIcon,
    tone: 'var(--nav-assets)',
    utility: false,
  },
  {
    id: 'posts',
    labelKey: 'nav.campaign.posts',
    openKey: 'campaignOverview.openPosts',
    // Not a calendar: this row is the table, and the calendar is the row
    // below it. Two arrangements of the same posts, each with its own way in.
    icon: NewsIcon,
    tone: 'var(--nav-posts)',
    utility: false,
  },
  {
    id: 'calendar',
    labelKey: 'nav.campaign.calendar',
    openKey: 'campaignOverview.openCalendar',
    icon: Calendar04Icon,
    tone: 'var(--nav-calendar)',
    utility: false,
  },
  {
    id: 'analytics',
    labelKey: 'nav.campaign.analytics',
    openKey: 'campaignOverview.openAnalytics',
    icon: ChartColumnIncreasingIcon,
    tone: 'var(--nav-analytics)',
    utility: false,
  },
  {
    id: 'activity',
    labelKey: 'nav.campaign.activity',
    openKey: 'campaignOverview.openActivity',
    icon: BellIcon,
    tone: undefined,
    utility: true,
  },
  {
    id: 'settings',
    labelKey: 'nav.campaign.settings',
    openKey: 'campaignOverview.openSettings',
    icon: Settings01Icon,
    tone: undefined,
    utility: true,
  },
] as const

export type CampaignSectionId = (typeof CAMPAIGN_SECTIONS)[number]['id']

/** The table entry for a section id. Total by construction — every id is here. */
export function campaignSection(id: CampaignSectionId) {
  return CAMPAIGN_SECTIONS.find((section) => section.id === id)!
}

/**
 * Where each section goes, given only the campaign.
 *
 * The calendar is its bare route, which redirects to wherever that campaign's
 * calendar was last left — so a link that knows nothing but the campaign still
 * lands on the right week. `satisfies` checks every value against the router's
 * own union, so a route that moves takes this table down with it at compile
 * time instead of on the click.
 */
export const CAMPAIGN_SECTION_PATH = {
  overview: '/campaigns/$campaignId/overview',
  strategy: '/campaigns/$campaignId/strategy',
  ideas: '/campaigns/$campaignId/ideas',
  assets: '/campaigns/$campaignId/assets',
  posts: '/campaigns/$campaignId/list',
  calendar: '/campaigns/$campaignId/calendar',
  analytics: '/campaigns/$campaignId/analytics',
  activity: '/campaigns/$campaignId/activity',
  settings: '/campaigns/$campaignId/settings',
} as const satisfies Record<CampaignSectionId, LinkProps['to']>

/**
 * The URL segment after the campaign id, as the section it belongs to. `list`
 * is the Posts row's route, and the post and asset editors (`/posts/:id`,
 * `/assets/:id`) belong to the section they were opened from.
 */
const SEGMENT_SECTION: Record<string, CampaignSectionId> = {
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

const CAMPAIGN_SEGMENT = /^\/campaigns\/[^/]+\/([^/]+)/

/** Which section of a campaign a path is in, or null outside one. */
export function campaignSectionOf(pathname: string): CampaignSectionId | null {
  const segment = CAMPAIGN_SEGMENT.exec(pathname)?.[1]
  return segment ? (SEGMENT_SECTION[segment] ?? null) : null
}
