/**
 * The campaign Overview's cards. Their titles are the nav's own
 * `nav.campaign.*` strings — one section, one name — so only what is unique
 * to the screen lives here.
 */
export const campaignOverview = {
  /**
   * The ghost button in a card's header: open the section this card
   * summarises. Written out per section rather than composed from a verb and
   * a name — the article and word order are not the same in every language.
   * Capitals are the copy, as with every other button in the app.
   */
  openOverview: 'Open overview',
  openPosts: 'Open posts',
  openIdeas: 'Open ideas',
  openCalendar: 'Open calendar',
  openActivity: 'Open activity',
  openAnalytics: 'Open analytics',
  openStrategy: 'Open strategy',
  openAssets: 'Open assets',
  openSettings: 'Open settings',

  /**
   * The row of doors at the foot of the Overview: one per place in the
   * campaign, each with the one thing to know before opening it — whether
   * that part is set, and if not what is missing first (`lib/campaignDoors`).
   */
  doors: {
    title: 'Everything in this campaign',
    loading: 'Counting…',
    strategy: {
      set_one: 'Dates, goal and {{formatted}} channel',
      set_other: 'Dates, goal and {{formatted}} channels',
      noDates: 'No dates yet',
      noGoal: 'No post goal yet',
      noChannels: 'No channels yet',
      notConnected: 'No account to publish through',
    },
    ideas: {
      waiting_one: '{{formatted}} idea waiting for a decision',
      waiting_other: '{{formatted}} ideas waiting for a decision',
      none: 'Nothing waiting for a decision',
    },
    assets: {
      all: 'Every document in the workspace',
      some_one: '{{formatted}} document',
      some_other: '{{formatted}} documents',
      none: 'None yet — Ogen writes from the brief',
    },
    posts: {
      none: 'No posts yet',
      some_one: '{{formatted}} post',
      some_other: '{{formatted}} posts',
      /** Joined after `some` when any are still plans or drafts. */
      drafts_one: '{{formatted}} still a draft',
      drafts_other: '{{formatted}} still drafts',
    },
    calendar: {
      next_one: '{{formatted}} scheduled, next on {{date}}',
      next_other: '{{formatted}} scheduled, next on {{date}}',
      some_one: '{{formatted}} scheduled',
      some_other: '{{formatted}} scheduled',
      none: 'Nothing scheduled',
      over: 'Nothing left to go out',
    },
    analytics: {
      some_one: '{{formatted}} post published',
      some_other: '{{formatted}} posts published',
      none: 'Results once a post goes out',
    },
    settings: 'Name, type, archive or delete',
  },

  /**
   * The calendar's problems, read from the server (CON-462). The fix is
   * asked of the campaign's assistant, which offers it to confirm.
   */
  problems: {
    ignore: 'Ignore',
    ignoreFailed: 'Couldn’t ignore that problem. Try again.',
    /** The card's header: every problem, to the campaign's assistant. */
    fixAll: 'Fix with Ogen',
    askAll: 'Fix these with me.',
    /** Sent to the campaign's assistant: the fix, then the problem. */
    askFix: '{{fix}}: {{problem}}',
  },
  /** The Before-launch list's first post. */
  todo: {
    addPost: 'Add post',
  },
  /** Shared by the band and the figures. */
  stats: {
    /** After the dates on the progress card, so lower case. */
    dayOf: 'day {{day}} of {{total}}',
    /** `when` is a relative time, "in 5 days". After the dates. */
    startsIn: 'starts {{when}}',
    /** `when` is a relative time, "3 days ago". After the dates. */
    ended: 'ended {{when}}',
    published: 'Published',
    failed: 'Failed',
    untitledPost: 'Untitled post',
  },
  /** The campaign's stage, derived from its dates (lib/campaignOverview). */
  stage: {
    new: 'New',
    planning: 'Planning',
    launched: 'Just launched',
    running: 'Running',
    closing: 'Closing',
    ended: 'Ended',
  },
  /** The progress card: where the campaign is in its own time. */
  band: {
    /** The dates, then the day or how far off the start or end is. */
    when: '{{range}} | {{where}}',
    /** The campaign type's phase today. */
    phaseNow: '{{name}} phase, day {{day}} of {{total}}',
    /** Figure names under the bar. With a goal, the whole campaign. */
    scheduled: 'Scheduled',
    /** With no goal: the last and the next `days` days. */
    publishedRecent: 'Published, last {{days}} days',
    scheduledRecent: 'Scheduled, next {{days}} days',
    /** Published posts a week since the start. */
    pace: 'Weekly pace',
    /** Before the start: scheduled posts a week. */
    pacePlanned: 'Planned weekly pace',
  },
  week: {
    this: 'This week',
    first: 'First week',
    today: 'Today',
    empty: 'Nothing goes out this week.',
    /** Beside a post the user publishes by hand. */
    manual: 'MANUAL',
  },
  results: {
    title: 'Results',
    publishedOf_one: 'Published of {{formatted}}',
    publishedOf_other: 'Published of {{formatted}}',
    neverPublished: 'Never went out',
  },
  figures: {
    reach: 'Reach',
    interactions: 'Interactions',
    best: 'Best post',
    reachOf: '{{reach}} reach',
  },
  /** The right-hand column: one list of what wants the user. */
  needs: {
    needsYou: 'Needs you',
    beforeLaunch: 'Before launch',
    wrapUp: 'Wrap up',
    none: 'Nothing is waiting on you.',
    /** After a problem standing for others of its kind. */
    more_one: '+{{formatted}} like this',
    more_other: '+{{formatted}} like this',
    menu: 'More fixes',
    firstPost: 'Add the first post',
    coverageGaps_one:
      '{{formatted}} publishing day in the first two weeks has nothing planned',
    coverageGaps_other:
      '{{formatted}} publishing days in the first two weeks have nothing planned',
    readResults: 'Read how the campaign did',
    archive: 'Archive the campaign',
  },
  /** A campaign with no dates: the three things that make one. */
  /**
   * A campaign with no dates: the three things that make one. Each step is
   * done by hand (`action`) or asked of Ogen (`ask`, written into the
   * campaign's composer — the send is the user's).
   */
  setup: {
    title: 'Set up this campaign',
    withOgen: 'Do it with Ogen',
    strategy: {
      title: 'Dates and a post goal',
      detail: 'When it runs and how often it publishes.',
      action: 'Set dates',
      ask: 'Suggest dates and a post goal for this campaign.',
    },
    channels: {
      title: 'Channels',
      detail: 'Where it publishes, with an account connected.',
      action: 'Choose channels',
      ask: 'Suggest which channels this campaign should publish on.',
    },
    posts: {
      title: 'The first post',
      detail: 'Write one yourself, or have Ogen draft a plan.',
      action: 'Add post',
      ask: 'Generate a content plan for this campaign.',
    },
  },
  /** Beside the setup card: teaching only, the screen reads the same without it. */
  learn: {
    title: 'How a campaign works',
    stages: {
      title: 'Its dates set its stage',
      detail:
        'Planning before it starts, running while it runs, ended after. This page changes with it.',
    },
    goal: {
      title: 'The goal is a rate',
      detail:
        'So many posts a week or a month. The total follows from the dates.',
    },
    ogen: {
      title: 'Ogen works inside it',
      detail:
        'The assistant reads the campaign’s strategy and assets, so what it drafts fits the brief.',
    },
  },
}
