/**
 * Series (CON-264) — the recurring things a workspace makes, and what each
 * campaign runs of them.
 *
 * The word users arrive with is *content pillar*. It is avoided in the copy
 * on purpose: it means four different things depending on who is saying it,
 * and the one this models — a recurring named segment with a recipe — is the
 * one "series" says without ambiguity in either language.
 */
export const series = {
  library: {
    add: 'Add series',
    addHint: 'Something else this workspace makes again and again.',
    writeYourOwn: 'Write your own',
    writeYourOwnHint: 'A series of your own, from a blank page.',
    starterGroupTitle: 'Three to start from',
    starterGroupBody:
      'Each one is a worked example of the part that is hard to invent from a blank form — the recipe. Take one, rewrite it until it is yours.',
    noRecipe: 'No recipe yet. It groups posts, and writes nothing on its own.',
    /** The few words the recipe's run opens on: "To make one, pick the…". */
    toMakeOne: 'To make one,',
  },
  rhythm: {
    occasional: 'Occasional',
    perWeek_one: 'Once a week',
    perWeek_other: '{{formatted}} times a week',
    perMonth_one: 'Once a month',
    perMonth_other: '{{formatted}} times a month',
    /**
     * A rhythm that skips periods or names its day (CON-496). `every` is
     * always 2 or more; `day` is the weekday's name, from `Intl`.
     */
    perWeeksEvery_one: 'Once every {{every}} weeks',
    perWeeksEvery_other: '{{formatted}} times every {{every}} weeks',
    perMonthsEvery_one: 'Once every {{every}} months',
    perMonthsEvery_other: '{{formatted}} times every {{every}} months',
    everyDay: 'Every {{day}}',
    everyWeeksOn_one: 'Every week on {{day}}',
    everyWeeksOn_other: 'Every {{formatted}} weeks on {{day}}',
    /** The picker's second and third selects: how often, and which day. */
    everyWeekOption_one: 'every week',
    everyWeekOption_other: 'every {{formatted}} weeks',
    everyMonthOption_one: 'every month',
    everyMonthOption_other: 'every {{formatted}} months',
    anyDay: 'on any day',
    onDay: 'on {{day}}',
    everyLabel: 'How often',
    dayLabel: 'Which day',
  },
  supply: {
    selfOption: 'It supplies its own subject',
    ideaOption: 'It waits for an idea',
    selfLine: 'Supplies its own subject',
    ideaLine: 'Waits for an idea',
  },
  usage: '{{drafts}} in draft, {{published}} published',
  /** The tooltip on an idea's or a post's series (CON-496). */
  mark: 'Made for the series “{{name}}”',
  plan: {
    noGoal:
      'This campaign has no post goal, so there is nothing to measure these against.',
    ok: '{{total}} posts planned · {{claimed}} from series · {{open}} open',
    over: '{{total}} posts planned and the series claim {{claimed}} — {{over}} more than the campaign is set to make.',
    /** Without dates the plan places no series, so they claim nothing yet. */
    undated:
      '{{total}} posts a period. Set the campaign dates and the series claim their slots.',
  },
  campaign: {
    title: 'Series',
    empty: 'No series runs here. Every post is planned one at a time.',
    /** The card's button, and the add dialog's confirm. */
    add: 'Add series',
    addTitle: 'Add a series',
    addNoLibrary:
      'The workspace has no series yet. Write one, and this campaign can run it.',
    addNone: 'Every series in the workspace already runs here.',
    writeNew: 'Write a new series',
    cancel: 'Cancel',
    howOften: 'How often',
    /** In a run's row, after its rhythm: "Every Tuesday, 24 posts in this campaign". */
    claim_one: '{{formatted}} post in this campaign',
    claim_other: '{{formatted}} posts in this campaign',
    claimsNone: 'no fixed slots',
    localOnly: 'only in this campaign',
    madeHere: 'Made in this campaign',
    stop: 'Stop running',
    edit: 'Edit series',
    /** A series made inside this campaign, moved into the workspace library. */
    promote: 'Add to library',
    done: 'Done',
  },
  detail: {
    back: 'Back to series',
    deleted: '{{name}} deleted',
    notFoundHeader: 'No such series',
  },
  editor: {
    titleNew: 'A new series',
    titleEdit: 'This series',
    intro:
      'A series is a standing instruction: what it is called, and how the next one gets built. Write the recipe as you would explain it to somebody covering for you.',
    identityCard: 'What it is',
    nameLabel: 'Name',
    nameHint:
      'What a reader would recognise it by. If nobody would call it anything, it is a theme rather than a series.',
    namePlaceholder: 'e.g. Weekly news digest',
    promiseLabel: 'The promise',
    promiseHint: 'One line: what somebody gets each time it runs.',
    promisePlaceholder:
      'e.g. The week in one minute, with the part that actually matters',
    recipeCard: 'How one gets built',
    recipeHint:
      'The structure, in your own words. This is the part that makes the tenth as good as the first — and the part a generator can act on.',
    recipePlaceholder:
      'e.g. Open with the single biggest story. Three more in a line each. Close with what to watch next week.',
    runningCard: 'How it runs',
    supplyLabel: 'Where the subject comes from',
    supplyHint:
      'A date or the week’s news is a subject the series already has. A profile is not — it waits until somebody names a person.',
    formatLabel: 'Shape',
    formatHint: 'What its posts take the shape of. Its posts inherit this.',
    rhythmLabel: 'Suggested rhythm',
    rhythmHint:
      'A starting point when a campaign picks this up. Each campaign sets its own, so two can run it at different rates.',
    needsName: 'Give the series a name',
    create: 'Create series',
    dangerNoun: 'series',
    deleteCost:
      'Posts already written keep their text. Every campaign running this one stops, and the plan gives their slots back.',
  },
  starters: {
    'this-day': {
      title: 'This day in ___ history',
      body: 'Runs forever without anybody feeding it — the date is the subject.',
      name: 'This day in ___ history',
      promise: 'One thing that happened today, and why it still matters.',
      recipe:
        'Find an event dated today in the field. Two short paragraphs of context — what was at stake, what changed. Close on the lesson that still holds. Never more than one event.',
    },
    'weekly-digest': {
      title: 'Weekly news digest',
      body: 'The rhythm is in the name. Self-supplying, and the easiest habit to build.',
      name: 'Weekly news digest',
      promise: 'The week in one minute, with the part that actually matters.',
      recipe:
        'Lead with the single biggest story and say plainly why it matters. Three more in one line each. Close with what to watch next week. No links in the body.',
    },
    people: {
      title: 'People who made an impact',
      body: 'Cannot run until somebody names a person — the example of a series the Ideas queue feeds.',
      name: 'People who made an impact',
      promise: 'One person, one decision, one thing it changed for everyone.',
      recipe:
        'Open on the decision, not the biography. Say what the world looked like before and after. One sentence on what they got wrong, so it reads as a person rather than a statue.',
    },
  },
}
