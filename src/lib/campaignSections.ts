import {
  BellSimpleIcon,
  CalendarDotsIcon,
  CardsIcon,
  ChartLineUpIcon,
  GearSixIcon,
  LightbulbIcon,
  NotepadIcon,
  PaletteIcon,
  TrayIcon,
} from '@phosphor-icons/react'

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
 * this campaign's Overview, Ideas becomes this campaign's ideas, Campaigns
 * becomes its Posts, Calendar its calendar, Analytics its numbers. Reading the
 * two levels side by side is how a person learns that going into a campaign
 * narrows what they are looking at rather than taking them somewhere else, and
 * that only works while the rows keep answering to each other. A section here
 * with no workspace counterpart, or a module up there with nothing down here,
 * is the thing to notice and fix rather than to add.
 *
 * Strategy is the one deliberate exception: a campaign commits to a window, a
 * rate and a spend, and a workspace commits to nothing, so there is no row it
 * could narrow from.
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
    // The workspace's Inbox glyph, because this is the same slot: the one
    // place at this level that is addressed to you — what the campaign has
    // waiting rather than what you went looking for.
    icon: TrayIcon,
    tone: 'var(--nav-overview)',
    utility: false,
  },
  {
    id: 'strategy',
    labelKey: 'nav.campaign.strategy',
    openKey: 'campaignOverview.openStrategy',
    icon: NotepadIcon,
    tone: 'var(--nav-strategy)',
    utility: false,
  },
  {
    id: 'ideas',
    labelKey: 'nav.campaign.ideas',
    openKey: 'campaignOverview.openIdeas',
    icon: LightbulbIcon,
    tone: 'var(--nav-ideas)',
    utility: false,
  },
  {
    id: 'posts',
    labelKey: 'nav.campaign.posts',
    openKey: 'campaignOverview.openPosts',
    // Cards, not a calendar: this row is the table now, and the calendar is
    // the row below it. Two arrangements of the same posts, and for the first
    // time each has its own way in.
    icon: CardsIcon,
    tone: 'var(--nav-posts)',
    utility: false,
  },
  {
    id: 'calendar',
    labelKey: 'nav.campaign.calendar',
    openKey: 'campaignOverview.openCalendar',
    icon: CalendarDotsIcon,
    tone: 'var(--nav-calendar)',
    utility: false,
  },
  {
    id: 'analytics',
    labelKey: 'nav.campaign.analytics',
    openKey: 'campaignOverview.openAnalytics',
    icon: ChartLineUpIcon,
    tone: 'var(--nav-analytics)',
    utility: false,
  },
  {
    // The workspace's Foundation, narrowed — and named for it, down to the
    // URL. It was the campaign's Content page, holding its documents and
    // nothing else, which made the pairing with Foundation a half-truth: up
    // there the word covers the guardrails, the voices and the audiences as
    // well as the documents. So this is now one place per campaign for
    // everything it writes from — what it inherits from the workspace, read
    // only, and what it has put in itself.
    id: 'foundation',
    labelKey: 'nav.campaign.foundation',
    openKey: 'campaignOverview.openFoundation',
    // Foundation's own glyph, as Overview takes Inbox's: the pair is the
    // point, and two different marks over the same word at two levels is the
    // reader's problem to solve rather than ours.
    icon: PaletteIcon,
    tone: 'var(--nav-foundation)',
    utility: true,
  },
  {
    id: 'activity',
    labelKey: 'nav.campaign.activity',
    openKey: 'campaignOverview.openActivity',
    icon: BellSimpleIcon,
    tone: undefined,
    utility: true,
  },
  {
    id: 'settings',
    labelKey: 'nav.campaign.settings',
    openKey: 'campaignOverview.openSettings',
    icon: GearSixIcon,
    tone: undefined,
    utility: true,
  },
] as const

export type CampaignSectionId = (typeof CAMPAIGN_SECTIONS)[number]['id']

/** The table entry for a section id. Total by construction — every id is here. */
export function campaignSection(id: CampaignSectionId) {
  return CAMPAIGN_SECTIONS.find((section) => section.id === id)!
}
