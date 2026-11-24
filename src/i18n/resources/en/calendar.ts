export const calendar = {
  /**
   * The header's counter button: the posts that have no date on them yet.
   * `unscheduled` is the visible label beside the glyph and is a button, so
   * it is capitalised like every other; `unscheduledPosts` is its accessible
   * name, and starts with the same word so voice control can reach it.
   */
  unscheduled: 'Unscheduled',
  unscheduledPosts: 'Unscheduled posts',
  settings: 'Calendar settings',

  /**
   * The view switch, which draws each arrangement rather than naming it.
   * These are the names it stopped showing: each one is its segment's
   * accessible name *and* the tooltip, so what a pointer user reads and what
   * a screen reader announces are the same word.
   *
   * Not capitalised like the buttons around them — a tooltip is a label, not
   * an action.
   */
  viewWeek: 'Week',
  viewMonth: 'Month',

  /**
   * The two arrows either side of the range. They name the unit they move by,
   * which changes with the view — the same pair of glyphs steps a week in one
   * and a month in the other, and only the accessible name says which.
   */
  previousWeek: 'Previous week',
  nextWeek: 'Next week',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',

  /**
   * Calendar Settings. One picture switch for the whole calendar, then one
   * section of row switches per view. The note is state rather than teaching
   * — a post with no picture has nothing to preview, and a user who turns
   * this on and sees half their cards unchanged is owed the reason. Both
   * halves of it are that: the second says why a busy day in the month goes
   * back to plain cards, which is the calendar overruling the switch and so
   * the one thing here that must not read as a bug.
   */
  /**
   * Calendar Settings' section headings, and the two rows that are state
   * rather than teaching — neither can move into an `<Explainer>`, because
   * both say something a user still needs after closing the note.
   */
  preferences: 'PREFERENCES',
  daysVisibility: 'DAYS VISIBILITY',
  firstDayOfWeek: 'First Day of Week',
  statusColourAlways:
    "The status colour down the card's left edge is always shown.",
  notAPublishingDay: 'Not a publishing day',
  /** Off the publishing days, but a weekly series lands on it (CON-496). */
  seriesDay: 'A series posts on this day',
  showDay: 'Show {{day}}',

  /**
   * The card switches. `fieldNoteStatus` is the one label that can't carry
   * itself: turning the status on doesn't add it — the card already has it,
   * in colour — it spends a line writing it out.
   */
  field: {
    status: 'Status label',
    time: 'Time',
    title: 'Title',
    platform: 'Platform',
    account: 'Account',
  },
  fieldNoteStatus: 'Writes the status out, and gives the time its own line',
  showFieldOnWeek: 'Show {{field}} on the week card',
  showFieldOnMonth: 'Show {{field}} on the month card',

  /**
   * The campaign a card belongs to — the workspace calendar's one extra row,
   * and the only thing telling two otherwise identical cards apart there. The
   * fallback names the state rather than the campaign, because a campaign
   * with no name yet is ordinary while it is being set up.
   */
  untitledCampaign: 'Untitled campaign',

  /**
   * What a grid says when its posts could not be fetched. Deliberately not an
   * error dialog: the calendar is still drawn and still navigable, and this
   * is the one line saying why it is empty.
   */
  loadFailed:
    'Couldn’t load your posts — the calendar will fill in once they’re reachable again.',
  loadFailedCampaign:
    'Couldn’t load this campaign’s posts — the calendar will fill in once they’re reachable again.',

  imagePreviews: 'Show cards as image previews',
  imagePreviewsNote:
    'Only posts that have a picture, and in the month only on the days with room for one',
  weekCard: 'WEEK CARD',
  monthCard: 'MONTH CARD',

  /**
   * The month grid's two hover titles. Both name the day they are on, which
   * is the only thing distinguishing one cell's control from the next — the
   * add button is an icon, and the density is a count.
   *
   * `density` says "open this week" rather than "open the day": the month
   * has no day view to go to, and the week is where those posts become
   * readable again.
   */
  addPostOn: 'Add a post on {{date}}',
  /** Over the campaigns the workspace calendar's add asks between. */
  addPostTo: 'Add a post to',
  density_one: '{{count}} post on {{date}} — open this week',
  density_other: '{{count}} posts on {{date}} — open this week',
  /** On a day too busy to draw its cards, how many of its posts are ticked. */
  densityTicked_one: '{{formatted}} ticked',
  densityTicked_other: '{{formatted}} ticked',
  /** The toolbar's way back to this week. */
  today: 'Today',

  /** The right rail's holding pen for posts with no date yet. */
  notScheduled: 'Not scheduled',
  /**
   * The Not scheduled panel's two groups: posts with an account to publish
   * as, and the ones the schedule gate would refuse for want of one —
   * folded away by default, with each row's reason in amber.
   */
  readyToSchedule: 'Ready to schedule',
  /** Inside that group when every undated post needs an account. */
  noneReady: 'Nothing is ready to be scheduled',
  needsAccount: 'Needs an account',
  /** A row's reason, worded as what to do about it. */
  accountGap: {
    noPlatform: 'Choose a platform',
    noAccount: 'Connect an account',
    chooseAccount: 'Choose an account',
    accountGone: 'Account disconnected',
  },
  /**
   * On a draft just written in this tab (CON-470), at the panel's top —
   * an eyebrow in literal capitals, like the cards' status words.
   */
  justWritten: 'JUST WRITTEN',
  /** A panel row's ideas: "Instagram · Carousel · from 1 idea" (CON-485). */
  fromIdeas_one: 'from {{formatted}} idea',
  fromIdeas_other: 'from {{formatted}} ideas',

  /**
   * The one control a day offers, in both grids. Capitalised like every
   * other action; the month's is icon-only and takes `addPostOn` above as
   * its title instead.
   */
  addPost: 'Add post',

  /**
   * A post whose date can no longer be moved by dragging it. The mark is the
   * only thing saying so, so its accessible name is the explanation.
   */
  dateLocked: "This post's date is locked",

  /**
   * The empty states, one per surface. Week and month deliberately share
   * their words: it is the same empty calendar, and a user switching
   * granularity on an empty campaign should not be told two different things
   * about it.
   */
  empty: {
    calendarTitle: 'Your calendar is empty',
    calendarSubtitle:
      'Add your first post and it will show up here, ready to schedule.',
    listTitle: 'No posts yet',
    listSubtitle: 'Add your first post to start building this campaign.',
    panelTitle: 'Nothing unscheduled',
    panelSubtitle:
      'Posts without a date wait here — drag one off the calendar, or add a new one.',
    /**
     * The same two surfaces on the workspace calendar, which has no ADD POST
     * — so neither sentence offers one. Both say where posts come from
     * instead, because that is the reader's next question.
     */
    workspaceTitle: 'Nothing is planned yet',
    workspaceSubtitle:
      'Posts are written inside a campaign. Schedule one and it will show up here, whichever campaign it belongs to.',
    workspacePanelSubtitle:
      'Posts without a date wait here — drag one onto the calendar to give it one.',
    /** The workspace's posts list, which has no ADD POST either. */
    workspaceListTitle: 'No posts yet',
    workspaceListSubtitle:
      'Posts are written inside a campaign. Add one there and it will show up here, whichever campaign it belongs to.',
  },
}
