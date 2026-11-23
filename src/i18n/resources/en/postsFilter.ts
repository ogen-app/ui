/**
 * Whether generated work drew on the campaign's own documents (CON-448/469).
 * Only the absence is marked: a post or idea the server stored as
 * `exploratory`. One nobody generated carries no mode and says nothing.
 */
/**
 * The posts filter as a sentence (CON-472), over a campaign's posts list and
 * its calendar — the Ideas sentence's grammar: one catalogue sentence per
 * field and operator, its chosen words marked `<v>`.
 */
export const postsFilter = {
  /** After a filter the assistant set, until it changes (CON-482). */
  setByAssistant: 'set by the assistant',
  unknownPlatform: 'A removed platform',
  nothingMatches: 'No posts match these filters',
  scheduled: {
    yes: 'With a date',
    no: 'Without a date',
  },
  sentence: {
    showing: 'Showing posts <clauses></clauses>',
    showingAll: 'Showing <v>all posts</v>',
    clause: {
      status: 'that are <v>{{values}}</v>',
      status_not: 'that aren’t <v>{{values}}</v>',
      platform: 'on <v>{{values}}</v>',
      platform_not: 'not on <v>{{values}}</v>',
      post_type: 'in the <v>{{values}}</v> format',
      post_type_not: 'not in the <v>{{values}}</v> format',
      scheduled: '<v>{{values}}</v>',
      date: 'scheduled <v>from {{values}}</v>',
      date_range: 'scheduled <v>between {{from}} and {{to}}</v>',
      date_not: 'scheduled <v>before {{values}}</v>',
    },
    status: {
      planned: 'planned',
      draft: 'drafts',
      ready_for_publish: 'ready to publish',
      scheduled: 'scheduled',
      scheduled_for_manual_publishing: 'scheduled to publish by hand',
      failed: 'failed',
      published: 'published',
      not_published: 'not published',
    },
    scheduled: {
      yes: 'with a date',
      no: 'without a date',
    },
    question: {
      status: 'Posts that are…',
      platform: 'Posts on…',
      post_type: 'Posts in the format…',
      scheduled: 'Posts…',
      date: 'Posts scheduled…',
    },
    include: {
      status: 'are',
      platform: 'on',
      post_type: 'in',
      date: 'between',
    },
    exclude: {
      status: 'aren’t',
      platform: 'not on',
      post_type: 'not in',
      date: 'before',
    },
    starter: {
      status: 'that are…',
      platform: 'on a platform…',
      post_type: 'in a format…',
      scheduled: 'with a date, or without…',
      date: 'scheduled…',
    },
    starterHint: {
      status: 'drafts, failed',
    },
    posts_one: '{{formatted}} post',
    posts_other: '{{formatted}} posts',
  },
}
