import {
  CalendarDotsIcon,
  ChartLineUpIcon,
  GearSixIcon,
  NotepadIcon,
  ScanIcon,
  SidebarIcon,
} from '@phosphor-icons/react'

/**
 * The campaign's sections, as the app names and marks them.
 *
 * One table because a section has one name and one glyph wherever it appears:
 * the sidebar's rows and the Overview's cards are two views of the same six
 * things, and a card headed "Setup" over a nav row reading "Settings" makes the
 * user work out that they are the same place. Renaming one now renames both.
 *
 * Labels are catalogue keys rather than strings — `t` is only available inside
 * a component, and a constant built at import time would freeze whichever
 * language loaded first.
 *
 * `tone` is the glyph's permanent colour (see `--nav-*` in index.css). Six
 * otherwise-identical line glyphs are hard to tell apart at 16px, and the hue
 * is what you actually aim at once you've used the app for a day. It stays on
 * the icon and nowhere else — the selected row is grey like every other, so
 * colour means "which section" and never "you are here". Settings has none by
 * design: it is the utility row, and every gear in the app stays in the text
 * colour so they read as the same kind of destination.
 */
export const CAMPAIGN_SECTIONS = [
  {
    id: 'overview',
    labelKey: 'nav.campaign.overview',
    openKey: 'campaignOverview.openOverview',
    icon: SidebarIcon,
    tone: 'var(--nav-overview)',
  },
  {
    id: 'posts',
    labelKey: 'nav.campaign.posts',
    openKey: 'campaignOverview.openPosts',
    icon: CalendarDotsIcon,
    tone: 'var(--nav-posts)',
  },
  {
    id: 'analytics',
    labelKey: 'nav.campaign.analytics',
    openKey: 'campaignOverview.openAnalytics',
    icon: ChartLineUpIcon,
    tone: 'var(--nav-analytics)',
  },
  {
    id: 'brief',
    labelKey: 'nav.campaign.brief',
    openKey: 'campaignOverview.openBrief',
    icon: NotepadIcon,
    tone: 'var(--nav-brief)',
  },
  {
    id: 'assets',
    labelKey: 'nav.campaign.assets',
    openKey: 'campaignOverview.openAssets',
    icon: ScanIcon,
    tone: 'var(--nav-assets)',
  },
  {
    id: 'settings',
    labelKey: 'nav.campaign.settings',
    openKey: 'campaignOverview.openSettings',
    icon: GearSixIcon,
    tone: undefined,
  },
] as const

export type CampaignSectionId = (typeof CAMPAIGN_SECTIONS)[number]['id']

/** The table entry for a section id. Total by construction — every id is here. */
export function campaignSection(id: CampaignSectionId) {
  return CAMPAIGN_SECTIONS.find((section) => section.id === id)!
}
