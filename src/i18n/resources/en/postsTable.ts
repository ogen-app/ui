export const postsTable = {
  sortSaveFailed: "Couldn't save the order you sorted by",

  /**
   * The column headers, also drawn in the empty state's sketch of the table
   * — one set of words for both, so the sketch is of *this* table.
   */
  columnTitle: 'Title',
  columnStatus: 'Status',
  /**
   * What is wrong with the post, as a mark only; the words are in the
   * drawer it opens (`warnings` below).
   */
  columnWarnings: 'Warnings',
  columnPlatform: 'Platform',
  columnFormat: 'Format',
  /** Only on the workspace's list, where the rows come from every campaign. */
  columnCampaign: 'Campaign',
  columnSeries: 'Series',
  columnPublishDate: 'Publish date',
  columnWhen: 'When',

  /** A post with no publish date, in either date column. */
  notSet: 'Not scheduled',

  /** The table with no rows in it — the campaign has posts, this filter doesn't. */
  noPosts: 'No posts',

  /**
   * The select column. The header's name changes with what pressing it will
   * do, because a tick box that both selects all and clears all cannot say
   * which from its state alone.
   */
  selectAll: 'Select all posts',
  selectAllCount_one: 'Select the {{formatted}} post',
  selectAllCount_other: 'Select all {{formatted}} posts',
  selectAllMatching_one: 'Select the {{formatted}} matching post',
  selectAllMatching_other: 'Select all {{formatted}} matching posts',
  clearSelection: 'Clear selection',

  selectPost: 'Select {{title}}',

  /**
   * The `When` column, which says the same date as `Publish date` in the
   * terms a person would use out loud. The three named days come first
   * because they are the ones worth recognising without arithmetic; beyond
   * that it counts.
   */
  today: 'Today',
  tomorrow: 'Tomorrow',
  yesterday: 'Yesterday',
  inDays_one: 'In {{count}} day',
  inDays_other: 'In {{count}} days',
  daysAgo_one: '{{count}} day ago',
  daysAgo_other: '{{count}} days ago',

  /**
   * The Warnings column and the drawer it opens: what the list can tell is
   * wrong with a post from the list alone (`lib/postWarnings`). The editor's
   * Quality checks go further; these are the ones worth a mark in a row.
   */
  warnings: {
    /** The row's mark, read aloud: it opens the drawer. */
    open_one: '{{formatted}} warning on {{title}}',
    open_other: '{{formatted}} warnings on {{title}}',
    panelTitle: 'Warnings',
    openPost: 'Open post',
    /** The post was fixed, or left the list, while the drawer was open. */
    none: 'Nothing to fix on this post any more.',
    kind: {
      failed: {
        title: 'Publishing failed',
        detail:
          'The platform refused it. Open the post to see why and try again.',
      },
      missed: {
        title: 'Missed its date',
        detail:
          'Its publish time passed without it going out. Give it a new date.',
      },
      noPlatform: {
        title: 'No platform',
        detail: 'Choose where it publishes before it can be scheduled.',
      },
      noAccount: {
        title: 'No account connected',
        detail:
          'Nothing is connected for its platform. Connect an account in Workspace Settings.',
      },
      chooseAccount: {
        title: 'Choose an account',
        detail:
          'More than one account is connected for its platform. Pick the one it publishes as.',
      },
      accountGone: {
        title: 'Account disconnected',
        detail:
          'The account it was set to publish as is no longer connected. Choose another.',
      },
      outsidePlatform: {
        title: 'Not a platform of this campaign',
        detail:
          'The campaign no longer targets this platform. Move the post, or add the platform back to the campaign.',
      },
      outsidePostType: {
        title: 'Not a post type of this campaign',
        detail:
          'The campaign no longer takes this post type on this platform. Choose another type.',
      },
      notGrounded: {
        title: 'Written without sources',
        detail:
          'It was generated from general knowledge rather than from the campaign’s own material.',
      },
    },
  },

  /**
   * ADD POST on the all-campaigns list: a post belongs to one campaign, so
   * the button asks which before it makes one.
   */
  chooseCampaign: {
    title: 'Add a post to which campaign?',
    description: 'A post belongs to one campaign. Pick where this one goes.',
  },
}
