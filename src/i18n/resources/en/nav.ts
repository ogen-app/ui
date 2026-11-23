export const nav = {
  activity: 'Activity',
  /**
   * The module is Tasks — its board, its flag and its endpoint all say so.
   * The rail says Inbox, because the row's job at level 0 is to be the one
   * place addressed to *you*, and its twin one level down is the campaign's
   * Overview. "Tasks" named the contents; "Inbox" names the slot, and the
   * slot is what the two levels have in common.
   */
  inbox: 'Inbox',
  /** The count beside the Activity row, read out rather than seen. */
  activityUnread_one: '{{count}} unread entry',
  activityUnread_other: '{{count}} unread entries',
  campaigns: 'Campaigns',
  ideas: 'Ideas',
  /**
   * The workspace's documents — the row above Campaigns, and the module the
   * content bank became. Assets rather than Documents because the list holds
   * pictures and web pages as well as notes and PDFs, and rather than
   * Sources because that word named it while it was a section of Foundation
   * and described its job there rather than what is in it.
   */
  assets: 'Assets',
  calendar: 'Calendar',
  /** CON-237. Behind the `analytics-overview` flag — hidden while it is off. */
  analytics: 'Analytics',
  /**
   * CON-227. Behind the `brand-materials` flag — hidden while it is off.
   *
   * Foundation rather than Brand: the section holds the voices, audiences
   * and guardrails every campaign writes from, and only one of those three
   * is what anyone means by a brand. The flag, the module folder and the
   * `/api/brand` resource keep the server's word.
   */
  foundation: 'Foundation',
  workspaceSettings: 'Workspace Settings',
  /**
   * The same footer slot as `workspaceSettings`, for the level below it.
   * Named in full rather than left as "Settings": the footer carries rows
   * of both scopes, so the word that says which one this belongs to is the
   * one that has to be there.
   */
  campaignSettings: 'Campaign Settings',
  profile: 'Profile',
  help: 'Help and support',
  logOut: 'Log out',
  closeSidebar: 'Close sidebar',
  /** Both halves of what the /workspaces page offers, in one row. */
  switchWorkspace: 'Create or switch',
  untitledCampaign: 'Untitled campaign',
  /**
   * The campaign switcher above the page: the scope every place in the menu
   * is narrowed to. "All campaigns" is the workspace.
   */
  /** The bar's "Strategy › Voice" once a page's header has scrolled away. */
  scope: {
    all: 'All campaigns',
    switch: 'Switch campaign',
    newCampaign: 'New campaign',
    settings: 'Campaign settings',
  },
  /**
   * Heads the workspace's destinations where they appear inside the account
   * menu — level 1's way back to a module without leaving the campaign first.
   */
  workspaceMenu: 'Workspace menu',
  yourWorkspaces: 'Your workspaces',
  accountMenu: 'Account menu',
  openHelp: 'Help',
  workWithOgen: 'Work with Ogen',
  assistantFinished: 'The assistant has finished',
  /** A campaign with no start or end date, in the rail's window line. */
  campaignNoWindow: 'No dates set',
  /**
   * Level 1's rows, each the campaign-narrowed twin of a level 0 row:
   * Inbox → Overview, Ideas → Ideas, Assets → Assets, Campaigns → Posts,
   * Calendar → Calendar, Analytics → Analytics. Foundation is the one level
   * 0 row with no twin — see `lib/campaignSections`.
   *
   * **No row says "Campaign".** They were prefixed for a while, on the
   * argument that "Campaign analytics" tells you which of the two you are
   * looking at. It does — and it says it eight times down a rail that has
   * already said it once, in the campaign's own name at the top of the
   * level. The word that disambiguates is up there and it is the campaign's
   * actual name, which is better than the noun. What is left is a rail whose
   * rows read as the workspace's, which is the point: going in narrows the
   * same menu rather than opening a different one.
   */
  campaign: {
    overview: 'Overview',
    strategy: 'Strategy',
    ideas: 'Ideas',
    /**
     * The workspace's Assets, narrowed — the same word at both levels rather
     * than a second name for it. The page holds this campaign's own
     * documents and nothing else.
     */
    assets: 'Assets',
    // The table, not the grid: this is the row that opens the place posts
    // are actually worked on, and the calendar is now its own row below.
    posts: 'Posts',
    calendar: 'Calendar',
    analytics: 'Analytics',
    activity: 'Activity',
    settings: 'Settings',
  },
}
