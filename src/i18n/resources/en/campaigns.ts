export const campaigns = {
  /** The posts list's and calendar's selection bar (CON-482). */
  bulk: {
    selected_one: '{{formatted}} selected',
    selected_other: '{{formatted}} selected',
    allMatching_one: 'All {{formatted}} matching post selected',
    allMatching_other: 'All {{formatted}} matching posts selected',
    when: 'Publication date & time',
    changeDate: 'Change date',
    changeTime: 'Change time',
    status: 'Status',
    unschedule: 'Unschedule',
    delete: 'Delete',
    clear: 'CLEAR',
    deleted_one: '{{formatted}} post deleted',
    deleted_other: '{{formatted}} posts deleted',
  },
  add: 'ADD CAMPAIGN',
  error: 'Failed to load campaigns',
  /** The list's rows: the Overview in one row each, grouped by stage. */
  list: {
    group: {
      live: 'Live',
      planning: 'Planning',
      new: 'New',
      ended: 'Ended',
    },
    /** The row's link, named for what it opens. */
    open: 'Open {{name}}',
    /** The row's three-dots button: what can be done to the campaign. */
    actions: 'Actions for {{name}}',
    noChannels: 'No channels yet',
    /** The third column when nothing wants the user. */
    goodShape: 'In good shape',
    /**
     * The progress column's line under the bar, one sentence per figure.
     * `days` is the window either side of today the bar covers.
     */
    line: {
      published_one: '{{formatted}} published in the last {{days}} days',
      published_other: '{{formatted}} published in the last {{days}} days',
      publishedTotal_one: '{{formatted}} published',
      publishedTotal_other: '{{formatted}} published',
      publishedOf_one: '{{formatted}} of {{goal}} published',
      publishedOf_other: '{{formatted}} of {{goal}} published',
      scheduledNext_one: '{{formatted}} scheduled in the next {{days}} days',
      scheduledNext_other: '{{formatted}} scheduled in the next {{days}} days',
      scheduled_one: '{{formatted}} scheduled',
      scheduled_other: '{{formatted}} scheduled',
      pace_one: 'Pace {{formatted}} post a week',
      pace_other: 'Pace {{formatted}} posts a week',
      pacePlanned_one: 'Planned pace {{formatted}} post a week',
      pacePlanned_other: 'Planned pace {{formatted}} posts a week',
      nothingYet: 'Nothing published or scheduled yet',
      failed_one: '{{formatted}} failed',
      failed_other: '{{formatted}} failed',
      neverPublished_one: '{{formatted}} never went out',
      neverPublished_other: '{{formatted}} never went out',
      reach: '{{formatted}} reach',
      interactions_one: '{{formatted}} interaction',
      interactions_other: '{{formatted}} interactions',
    },
    /** A campaign with no dates: the third column is its setup left. */
    setUp: 'Set up',
    /** A campaign with no dates, where the others have their window. */
    notDated: 'No dates yet',
    loadFailed:
      'Couldn’t load the posts. The figures appear once they can be reached again.',
  },
  untitled: 'this campaign',
  empty: {
    title: 'No campaigns yet',
    subtitle: 'Create your first campaign to get started',
  },
  /** The drawer at the foot of the list, not a second view of the screen. */
  archivedSection: 'Archived campaigns',
  archivedError: 'Failed to load archived campaigns',
  archivedOn: 'Archived {{archivedOn}}',
  unarchive: 'UNARCHIVE',
  archivedEmpty:
    'Nothing is archived. Archiving a campaign takes it off the list without deleting anything: its posts, schedule and content stay exactly as they are.',
  // The two campaign section pages the drill-down left behind Strategy and
  // Settings — card headings, so they name what the card is a group of.
  strategy: {
    commitment: 'The commitment',
    spend: 'Spend & language',
    /**
     * What the assistant just took off the campaign (CON-483), until the
     * page reloads; the platforms or types in the server's words.
     */
    removedByAssistant: '{{what}} removed by the assistant',
    undoInThread: 'UNDO is in the thread',
    /**
     * Strategy for all campaigns: every campaign, with what each commits to
     * and the voice it writes in.
     */
    /** The Goals card's one action: it opens or closes the section. */
    goals: {
      switchOn: 'Switch on',
      switchOff: 'Switch off',
    },
    /** The Messaging card's one action, which asks the assistant. */
    messaging: {
      generateBrief: 'Generate brief',
      improveBrief: 'Improve brief',
    },
    campaigns: {
      title: 'Campaigns',
      empty: 'No campaigns yet.',
      windowAndRate: '{{window}} · {{rate}}',
      perWeek_one: '{{formatted}} post a week',
      perWeek_other: '{{formatted}} posts a week',
      perMonth_one: '{{formatted}} post a month',
      perMonth_other: '{{formatted}} posts a month',
      noRate: 'No post goal',
      noPlatforms: 'No platforms',
      noVoice: 'No voice',
      defaultVoice: '{{voice}} (default)',
    },
  },
  /**
   * The campaign's type on Strategy (CON-166). It locks once a post is
   * planned against one of its phases; the lock line is state, not
   * teaching, so it sits under the card rather than in an Explainer.
   */
  type: {
    label: 'Campaign type',
    change: 'CHANGE',
    cancel: 'Cancel',
    locked_one:
      "Locked — {{count}} post is planned against this type's phases.",
    locked_other:
      "Locked — {{count}} posts are planned against this type's phases.",
    lockedUncounted: "Locked — posts are planned against this type's phases.",
    lockedToastTitle: "The campaign type can't change any more",
    lockedToastBody:
      'Posts are now planned against its phases, so the type has been put back. Your other changes are still unsaved.',
  },
  /**
   * When each phase of the campaign's type runs (CON-166). The windows are
   * the server's; a person only moves the boundary between two phases.
   */
  phases: {
    title: 'Phases',
    derived: 'Split evenly across the campaign dates.',
    manual: 'Dates set by hand.',
    reset: 'Split evenly again',
    unscheduled: 'Set a start and end date to see when each phase runs.',
    tooShort_one:
      "The campaign is shorter than its {{count}} phase, so it can't be split.",
    tooShort_other:
      "The campaign is shorter than its {{count}} phases, so they can't be split.",
    pendingDates: 'Save the new dates to re-plan the phases.',
    pendingType: 'Save the new type to see its phases.',
    empty: 'This campaign type has no phases.',
    loadError: "The phases couldn't be loaded.",
    meta: '{{range}} · {{posts}}',
    posts_one: '{{count}} post',
    posts_other: '{{count}} posts',
    endsLabel: 'When {{phase}} ends',
    saveError: 'Unable to save the phase dates',
    resetError: 'Unable to split the phases evenly again',
    resetBySave:
      "The phase dates went back to an even split, because the campaign's dates or type changed.",
  },
  settings: {
    record: 'The record',
  },
  /**
   * One card holds both ways of stopping a campaign, so its own copy stays
   * general and each modal carries the consequences of the button that
   * opened it — read where they are acted on rather than skipped on the way
   * down the page.
   */
  dangerZone: {
    title: 'Danger Zone',
    body: 'Two ways to stop running this campaign. Archiving keeps everything and can be undone; deleting removes the campaign and its posts for good.',
    archive: {
      action: 'Archive campaign',
      confirmTitle: 'Archive {{name}}?',
      confirmBody:
        'The campaign comes off the Campaigns list and stops being offered anywhere new work is filed. Nothing is deleted. Its posts, schedule, brief and content stay exactly as they are, and you can bring it back from the archive at any time.',
      keep: 'Keep it active',
      confirm: 'Archive campaign',
    },
    delete: {
      action: 'Delete campaign',
      confirmTitle: 'Delete {{name}}?',
      confirmBody:
        'The campaign, its posts and its schedule are removed, and nothing in the app can bring them back. Posts that have already been published stay live on the social networks. Archive it instead if you only want it off the list.',
      keep: 'Keep campaign',
      confirm: 'Delete campaign',
    },
  },
}
