/**
 * Activity (CON-225): the feed of what happened, and the daily report it
 * opens. Counts are written out whole in each plural form — "1 post
 * published" and "6 posts published" are one key each, never a number glued
 * to a noun.
 */
export const activity = {
  stub: {
    campaignTitle: 'This campaign\u2019s activity will live here',
    campaignBody:
      'The same feed as the workspace\u2019s, narrowed to what happened inside this campaign.',
  },
  title: 'Activity',
  loadFailed: 'Unable to load activity',
  /**
   * One of the feed's sources failed while another answered. The feed still
   * renders what arrived; these name what is missing, so a quiet page cannot
   * be mistaken for a quiet workspace. Keyed by the source so the screen can
   * print one line per failure — `lib/activityFeed`'s three inputs fail
   * independently.
   */
  unavailable: {
    notifications:
      'Notifications could not be loaded — showing the daily reports only.',
    reports:
      'The daily reports could not be loaded — showing what was recorded as it happened.',
    /**
     * The summaries carry no entries of their own: they are how a post
     * notification finds the campaign that holds it, so losing them costs
     * destinations rather than rows.
     */
    links:
      'Campaign summaries could not be loaded — some entries may not link to what they are about.',
  },
  /**
   * Said under the last day card when a source came back at its ceiling.
   * Both halves have one — the recorded page and the run of days — so the
   * sentence names both rather than implying either goes further.
   */
  truncated:
    'Showing the most recent {{entries}} entries and the last {{days}} days that had anything on them.',
  empty: {
    title: 'Nothing has happened yet',
    subtitle:
      'Posts going out, posts failing, and a report of each day land here as they happen.',
  },
  /**
   * The second column: live conditions across every campaign that are wrong
   * now or about to be (`NeedsYouCard`). Not unread notifications — a row
   * leaves when it is fixed, not when it is seen.
   */
  needsYou: {
    title: 'Needs you',
    showMore_one: 'Show {{formatted}} more',
    showMore_other: 'Show {{formatted}} more',
    allSet: 'Nothing needs you',
    allSetBody:
      'Nothing is failing, overdue or about to lapse in any campaign. If that changes, it shows up here.',
  },
  /** The dot's accessible name — the only thing that says what it means. */
  unread: 'Unread',
  /**
   * The ring's accessible name: seen for the first time on this visit, and
   * already read as far as the badge is concerned.
   */
  recent: 'New',
  /**
   * The line under what is new on this visit — labelled on the old side,
   * because in a newest-first feed “new” is simply the top.
   */
  seenBefore: 'Seen before this visit',
  /** Relative day names, used instead of a date for the two recent ones. */
  today: 'Today',
  yesterday: 'Yesterday',
  /** A section's heading inside a day's card. Each one stands alone. */
  entry: {
    reportTitle: 'Daily report',
    /**
     * What happened to a task. The title is quoted because it is somebody's
     * sentence, not ours — a task called "Fix the thing" reads as a typo
     * without the quotes.
     */
    task_created: 'Task added — “{{title}}”',
    task_completed: 'Task done — “{{title}}”',
    task_resolved: 'Task resolved on its own — “{{title}}”',
  },
  /**
   * What a recorded notification says (CON-242), one key per `type` this
   * build knows. The server sends its own English title beside every row and
   * these deliberately replace it: a sentence composed on the wire cannot be
   * translated or re-worded without a deploy on both sides. A `type` with no
   * key here falls back to the server's title, which is how a new producer
   * ships before its copy does — see `lib/notifications.ts`.
   *
   * Written as outcomes rather than as instructions: the feed is a record of
   * what happened, and what to do about it is the row you click through to.
   */
  notification: {
    connectionExpiring: 'Your {{channel}} connection expires soon',
    connectionActionRequired: 'Your {{channel}} connection needs reconnecting',
    postPublished: 'A {{channel}} post was published',
    postPublishFailed: 'A {{channel}} post failed to publish',
    postFirstCommentFailed: 'A post’s first comment couldn’t be posted',
    billingTrialEndedUnpaid:
      'Your free month ended without a plan, so your social accounts were disconnected. Choose a plan to reconnect them.',
    /**
     * Says nothing about the channel on purpose: this producer carries a
     * platform sqid rather than a network, and it is not ours to resolve
     * here — see `lib/notifications`.
     */
    postManualPublishDue: 'A post is due to be published by hand',
    assetReady: 'A document finished processing',
    assetIngestFailed: 'A document could not be processed',
    /**
     * A page we went and read, not a file somebody handed over — which is
     * why the server splits these off from `asset.*` at all.
     */
    urlAssetCrawled: 'A link has been read',
    urlAssetFailed: 'A link could not be read',
    /** The count is the point — it is what says whether the plan is worth opening. */
    campaignContentPlanReady_one: 'A content plan is ready — {{count}} post',
    campaignContentPlanReady_other: 'A content plan is ready — {{count}} posts',
    contentPlanFailed: 'A content plan could not be generated',
    /**
     * The post and the campaign assistant share one sentence: the row links
     * to whichever it was, and only the person who started the run is told.
     */
    assistantCompleted: 'The assistant finished your request',
    assistantFailed: 'The assistant could not finish your request',
    assessmentCompleted: 'A quality assessment is ready',
    assessmentFailed: 'A quality assessment could not be finished',
    /** `label` is the plugin's own name for itself, e.g. "Figma · Jane Doe". */
    pluginConnected: 'Figma plugin connected: {{label}}',
    /**
     * The plan's quotas, one pair per capped resource — see
     * `ENTITLEMENT_COPY_KEY` in `lib/notifications` for why the feature is a
     * key here rather than a word slotted into one sentence.
     *
     * Both halves state the figure, because that is the whole content of the
     * warning: "you are near your limit" without the number is something the
     * reader has to go and look up, on a row whose only job was to save them
     * the trip. Neither sells an upgrade — a notification is a fact, and the
     * place that takes money is one click away on the plan itself.
     */
    entitlement: {
      seats: {
        reached: 'All {{limit}} seats on your plan are taken',
        approaching: '{{current}} of {{limit}} seats on your plan are taken',
      },
      campaigns: {
        reached: 'All {{limit}} campaigns your plan allows are active',
        approaching:
          '{{current}} of {{limit}} campaigns your plan allows are active',
      },
      documents: {
        reached: 'The content bank is full at {{limit}} documents',
        approaching:
          'The content bank holds {{current}} of {{limit}} documents',
      },
      storage: {
        reached: 'Media storage is full at {{limit}}',
        approaching: 'Media storage is at {{current}} of {{limit}}',
      },
    },
  },
  report: {
    /**
     * The tiles' labels: a noun beside a figure, where the sentence forms
     * below are what a line of prose uses. Two sets on purpose — "3" over
     * "3 posts published" reads as thirty-three.
     */
    label: {
      published: 'Published',
      failed: 'Failed',
      created: 'Created',
      campaigns: 'Campaigns',
    },
    published_one: '{{count}} post published',
    published_other: '{{count}} posts published',
    /**
     * Covers both ways a post can fail to go out. The server counts them in
     * one bucket, because the reader's question is the same for either; which
     * one each post was is on its own row, under `status`.
     */
    failed_one: '{{count}} post did not go out',
    failed_other: '{{count}} posts did not go out',
    created_one: '{{count}} post created',
    created_other: '{{count}} posts created',
    campaignsCreated_one: '{{count}} campaign started',
    campaignsCreated_other: '{{count}} campaigns started',
    /** How many of the day's new posts were given a date. */
    scheduled_one: '{{count}} scheduled',
    scheduled_other: '{{count}} scheduled',
    byChannel: 'Published by channel',
    didNotGoOut: 'Did not go out',
    createdBy: 'Written by',
    campaignsStarted: 'Campaigns started',
    /** Which of the two a post row was — the distinction the tile merges. */
    status: {
      failed: 'Failed to publish',
      notPublished: 'Never published',
    },
    /**
     * A post survives the membership that wrote it, so a count can name an
     * author the workspace no longer has. The number is real; only the name
     * is gone.
     */
    formerMember: 'Someone who has left',
    /** `created_by` was never recorded — an older post, or one the server made. */
    noAuthor: 'Not recorded',
    loading: 'Counting up the day…',
    loadFailed: 'This report could not be loaded.',
    nothing: 'Nothing happened on this day.',
    /**
     * What the report counted and by whose midnight. The zone is named
     * because it is the one thing about these figures a reader could
     * reasonably disagree with — it is the browser's, and a laptop that
     * travelled reports a different day than the one it left.
     */
    coverage:
      'Counted from this workspace’s posts, by the calendar day in {{zone}}.',
  },
}
