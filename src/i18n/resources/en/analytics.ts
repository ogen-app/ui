/**
 * The analytics surfaces: the workspace dashboard (CON-237/238/239), the
 * campaign composition, and a post's own numbers.
 *
 * Two conventions are particular to this block, both because the surfaces are
 * built out of shared parts rather than out of screens.
 *
 * **`measures` and `sleeves` are the vocabulary, held apart from the tables
 * that describe them.** `components/analytics/types.ts` says how a measure
 * behaves — whether it accumulates, which way is good news, how it is drawn —
 * and this says what it is called. Splitting them is what keeps a module-level
 * `const` from freezing whichever language loaded first, and it means a
 * measure's words can be argued with without touching the arithmetic.
 *
 * **`units` are fragments, and they are the exception that proves the rule.**
 * Everywhere else a sentence is one key; `+19%`, `1.8×` and `3d 10h` are not
 * sentences but notations, and each is assembled from a number the locale
 * already formatted. What is *not* here is any sentence built from them —
 * those are whole, with the notation interpolated in.
 */
export const analytics = {
  measures: {
    reach: {
      label: 'Reach',
      periodLabel: 'Cumulative reach',
      hint: 'Distinct accounts that saw a post',
    },
    impressions: {
      label: 'Impressions',
      periodLabel: 'Cumulative impressions',
      hint: 'Times a post was shown, the same person counted more than once',
    },
    interactions: {
      label: 'Interactions',
      periodLabel: 'Cumulative interactions',
      hint: 'Likes, comments, shares and saves together',
    },
    engagement_rate: {
      label: 'Engagement rate',
      periodLabel: 'Daily engagement rate',
      hint: 'Interactions as a share of reach',
    },
    saves: {
      label: 'Saves',
      periodLabel: 'Cumulative saves',
      hint: 'People keeping a post to come back to',
    },
    clicks: {
      label: 'Clicks',
      periodLabel: 'Cumulative clicks',
      hint: 'Taps on a link out of the post',
    },
    views: {
      label: 'Views',
      periodLabel: 'Cumulative views',
      hint: 'Video plays, counted the way each platform counts one',
    },
    // No hint on these two: their labels already say where the number comes
    // from, and a tooltip restating a label teaches people to stop reading
    // tooltips.
    followers: {
      label: 'Followers',
      periodLabel: 'Current followers',
      hint: '',
    },
    published: {
      label: 'Posts published',
      periodLabel: 'Posts published',
      hint: '',
    },
  },

  sleeves: {
    platform: 'Platform',
    account: 'Account',
    campaign: 'Campaign',
    format: 'Format',
    theme: 'Theme',
    origin: 'How it was written',
    weekday: 'Day of week',
    quality: 'Quality band',
  },

  units: {
    hours: '{{count}}h',
    daysHours: '{{days}}d {{hours}}h',
    elapsed: '+{{span}}',
    multiplier: '{{value}}×',
    percent: '{{value}}%',
    thousand: '{{value}}K',
    million: '{{value}}M',
    deltaUp: '+{{value}}',
    deltaDown: '−{{value}}',
    aboutTheSame: 'about the same',
    // The window inside a card's heading. Only a stretch takes "over" —
    // "over today" is not a sentence, and a period picker hands us both kinds.
    over: 'over {{period}}',
    lastDays: 'last {{count}} days',
    spanHours_one: '{{count}} hour',
    spanHours_other: '{{count}} hours',
    spanDays_one: '{{count}} day',
    spanDays_other: '{{count}} days',
    posts_one: '{{count}} post',
    posts_other: '{{count}} posts',
    slot: '{{day}} {{hour}}',
    slotUtc: '{{day}} {{hour}} UTC',
    hourOfDay: '{{hour}}:00',
    none: '—',
  },

  tile: {
    verdictAbove: 'Above usual',
    verdictWithin: 'Normal for you',
    verdictBelow: 'Below usual',
    nothingToCompare: 'nothing to compare',
    noTypicalYet: 'no typical yet',
    vsDay: 'vs {{day}}',
    vsTypical: 'vs a typical post of yours',
    vsTypicalAtAge: 'vs a typical post of yours at the same age',
    vsTypicalMultiple: '{{value}}× your typical',
  },

  // The line under a card's heading saying which of the controls above it
  // does *not* reach it. Composed rather than tabulated: the two dimensions
  // are independent, and stacking two footnotes puts more type under the
  // heading than the heading.
  scopeNote: {
    allTime: 'All time — not affected by the period above',
    allTimeWorkspace:
      'All time and the whole workspace — not affected by the period or the campaign above',
    ahead: 'Looking ahead — not affected by the period above',
  },

  charts: {
    empty: 'Data will appear here',
    today: 'Today',
    published: 'Published',
    later: '{{span}} later',
    runningTotalAria: 'Running total since the post was published',
    earnedEachHourAria:
      'What the post earned in each hour since it was published',
    earnedEachDayAria:
      'What the post earned in each day since it was published',
    legendThisStretch: 'this stretch',
    legendEachDay: 'each day',
    legendStretchBefore: 'the stretch before',
    legendStretchTo: 'the stretch to {{day}}',
    legendUsualRange: 'usual range',
    legendPublication: 'a post went out',
    trendAria: 'Running total across the selected period',
    columnsAria: 'Each day of the selected period',
    sleevesAria: 'Compared over the period: {{sleeves}}',
    decayAria:
      "Share of a post's eventual engagement earned by each hour since publishing",
    publicationsAria_one: '{{count}} post published in this period',
    publicationsAria_other: '{{count}} posts published in this period',
    publicationMark: '{{title}} — {{account}}',
  },

  /** "What happened" — the temporal card, on the workspace and the campaign. */
  now: {
    title: 'What happened',
    unavailableTitle: 'Nothing is being measured for this workspace',
    unavailableBody:
      "Analytics isn't switched on here yet. Everything else — planning, generating, scheduling, publishing — works exactly as it does now, and the moment measurement is connected this fills in from the posts you have already sent.",
    emptyTitle: 'Nothing measured yet',
    emptyBody:
      'Once this workspace starts publishing, what each post earns shows up here — reach, interactions, and how that compares with the stretch before.',
    emptyNarrowedTitle: 'Nothing measured on {{platforms}}',
    emptyNarrowedBody:
      'Nothing posted on these platforms has reported numbers in this window. Choose ALL PLATFORMS above to count the rest of the workspace.',
    errorTitle: "Couldn't load analytics",
    errorBody:
      'The workspace itself is unaffected — nothing here changes what is scheduled or published. Try again in a moment.',
    noDataNothingOut:
      'No data yet — nothing has gone out in this window, so there is nothing to measure.',
    noDataNotReported_one:
      'No data yet — {{count}} post has gone out and it has not reported numbers yet. Platforms usually take a few hours.',
    noDataNotReported_other:
      'No data yet — {{count}} posts have gone out and none of them have reported numbers yet. Platforms usually take a few hours.',
    updated: 'Updated {{when}}',
  },

  sideBySide: {
    title: 'Side by side',
    nothingTitle: 'Nothing to compare yet',
    // `dimension` arrives as the picker's own label, which is capitalised —
    // so the sentence is written to take one ("under one Platform") rather
    // than lower-casing it, which is a rule that only works in English.
    nothingBody:
      'Everything measured here falls under one {{dimension}}, so there is no second group to hold it against.',
    perPost: 'per post',
    vsBefore: 'vs before',
    dayByDay: '{{measure}} day by day',
    noCallTitle: 'No call to make yet',
    noCallBody:
      'These sleeves are too close, or too thinly sampled, to say one is beating another.',
    thin_one:
      '{{sleeves}} has fewer than five measured posts — shown, but not ranked against the rest.',
    thin_other:
      '{{sleeves}} have fewer than five measured posts — shown, but not ranked against the rest.',
  },

  performers: {
    title: 'Performers and outliers',
    by: 'By',
    publishedColumn: 'Published',
    best: 'Best {{count}}',
    worst: 'Worst {{count}}',
    all: 'All {{count}}',
    select: 'Select {{title}}',
    singleListNote:
      'Too few posts to have two ends — this is all of them, best first.',
    nothingTitle: 'Nothing to rank in this period',
    nothingPublishedBody:
      'Once posts go out, the ones carrying the period — and the ones falling behind what you normally do — show up here.',
    nothingReportedBody:
      'The posts in this period have not reported enough for any of the rankings to mean anything yet. Platforms usually take a few hours.',
    unavailableTitle: 'Nothing is being measured for this workspace',
    unavailableBody:
      'Once measurement is connected, the posts carrying the period — and the ones falling behind what you normally do — show up here.',
    emptyTitle: 'Nothing to rank in this period',
    emptyBody:
      'No posts went out in this window. Widen the period, or come back once the next one has published.',
    emptyNarrowedTitle: 'Nothing on {{platforms}} to rank in this period',
    emptyNarrowedBody:
      'No posts went out on these platforms in this window. Widen the period, or choose more platforms above.',
    errorTitle: "Couldn't load performers",
    errorBody:
      'The workspace itself is unaffected — nothing here changes what is scheduled or published. Try again in a moment.',
    reached: '{{reach}} reached',
    reachedCounting: '{{reach}} reached and counting',
    periodShare: '{{share}}% of the period',
    noTypicalBasis:
      'No typical to hold these against yet, so the bars run against the best in the list.',
    curveBasis:
      'Aged against how {{count}} finished posts of yours matured — your own curve, not an industry average.',
    noCurveBasis:
      'Not enough of your posts have finished earning for us to know how yours mature, so nothing here is age-corrected — a rate is the ranking that holds up meanwhile.',
    hidden_one:
      '{{count}} more post in this period sat between the two ends and is not shown.',
    hidden_other:
      '{{count}} more posts in this period sat between the two ends and are not shown.',
    withoutBaseline_one:
      '{{count}} post is on a platform with too little history to place against, so it sits here on raw reach rather than a multiple.',
    withoutBaseline_other:
      '{{count}} posts are on a platform with too little history to place against, so they sit here on raw reach rather than a multiple.',
    barBasis:
      'Each bar is this post against a typical post of yours on the same platform at the same age — your own posts, not an industry average.',
    updated: 'Updated {{when}}.',
    basis: {
      against_typical: 'Against your typical',
      reach: 'Reach',
      engagement_rate: 'Engagement rate',
      interactions: 'Interactions',
    },
  },

  /**
   * What "best" and "worst" mean on the performers card.
   *
   * `heldOut` is one sentence per criterion rather than a shared stem with the
   * reason appended: the reason is grammatically part of the sentence in every
   * language, and English's "One post was seen by too few people" and "One post
   * did not report saves" already need two different verbs.
   *
   * Every criterion carries both `label` and `rawLabel` — what the column is
   * called with a maturation curve behind it and without one — even where the
   * two are the same words. Whether they differ is a translator's judgement,
   * not a shape for the code to decide; today only `reach` does. `suffix` is
   * empty where the number carries its own unit.
   */
  criteria: {
    pace: {
      label: 'Against your typical',
      rawLabel: 'Against your typical',
      suffix: '',
      heldOut_one: 'One post is too young to place against the curve.',
      heldOut_other:
        '{{count}} posts are too young to place against the curve.',
    },
    reach: {
      label: 'Reach when it finishes',
      rawLabel: 'Reach so far',
      suffix: '',
      heldOut_one:
        'One post is too young to project — almost nothing has landed yet.',
      heldOut_other:
        '{{count}} posts are too young to project — almost nothing has landed yet.',
    },
    engagement_rate: {
      label: 'Engagement rate',
      rawLabel: 'Engagement rate',
      suffix: '',
      heldOut_one:
        'One post was seen by too few people for a rate to mean anything, or reported no interactions.',
      heldOut_other:
        '{{count}} posts were seen by too few people for a rate to mean anything, or reported no interactions.',
    },
  },

  quality: {
    title: 'Quality against results',
    qualifier: 'for every post we scored',
    didBetterOn: 'Did better on',
    medianPerBand: '{{criterion}}, median per band',
    elements: {
      overall: {
        label: 'Overall',
        blurb: 'The weighted score the four elements roll up to',
        strong: '80–100%',
        workable: '50–79%',
        weak: 'Under 50%',
      },
      correctness: {
        label: 'Correctness',
        blurb: 'True and well-formed',
        strong: '8–10',
        workable: '5–7',
        weak: 'Under 5',
      },
      clarity: {
        label: 'Clarity',
        blurb: 'Understood on one pass',
        strong: '8–10',
        workable: '5–7',
        weak: 'Under 5',
      },
      engagement: {
        label: 'Engagement',
        blurb: 'Makes people care and act',
        strong: '8–10',
        workable: '5–7',
        weak: 'Under 5',
      },
      delivery: {
        label: 'Delivery',
        blurb: 'Fits the channel',
        strong: '8–10',
        workable: '5–7',
        weak: 'Under 5',
      },
    },
    spread: {
      singleBand: 'Every post scored the same',
      thinBands: 'Too few in each band',
      tracks: '{{band}} posts do better',
      inverted: '{{band}} posts do better',
      flat: 'No difference',
    },
    band: {
      range: '{{range}} · {{posts}}',
      nothingScored: 'Nothing scored here',
      tooFew: 'Under {{minimum}} placed — too few to compare',
    },
    gateTitle_one: '{{count}} scored post so far',
    gateTitle_other: '{{count}} scored posts so far',
    gateBody:
      'Holding the score against results needs a few posts in each band before it means anything — {{minimum}} is where this starts, and every post you score from here counts towards it.',
    coverageWithReasons:
      '{{comparable}} of the {{total}} posts published here can be compared — {{reasons}}.',
    coveragePlain:
      '{{comparable}} of the {{total}} posts published here can be compared.',
    reasonUnscored: '{{count}} never scored',
    reasonAwaiting: '{{count}} still waiting on the platforms',
    reasonStale:
      '{{count}} edited after scoring, so the score is of different words',
    medianBasis:
      "Each band shows its median, so one post that went unusually far can't carry it.",
    correctedBasis:
      'Ages are corrected against how {{count}} finished posts of yours matured.',
    uncorrectedBasis:
      'Not enough of your posts have finished earning to correct for age, so the bands are compared on a rate instead.',
    advisoryBasis: 'The score is advisory and was made before publishing.',
    emptyNothingScoredTitle: 'Nothing scored yet',
    emptyNothingScoredBody:
      'Nothing here has been through a quality check, so there is nothing to hold against what these posts earned. Score a few from the post editor and this fills in on its own.',
    emptyStaleTitle: 'Every score is out of date',
    emptyStaleBody:
      'Every scored post here has been edited since, so each score describes words that never went out. Re-score any of them and it comes back into the comparison.',
    emptyAwaitingTitle: 'Scored, nothing back yet',
    emptyAwaitingBody_one:
      "{{count}} scored post has gone out and the platforms haven't reported on it yet. This usually takes a few hours.",
    emptyAwaitingBody_other:
      "{{count}} scored posts have gone out and the platforms haven't reported on them yet. This usually takes a few hours.",
    emptyThinTitle: 'Nothing reported enough to compare',
    emptyThinBody:
      'The scored posts here have not reported enough for any of the comparisons to mean anything yet.',
    emptyTitle: 'Nothing to compare yet',
    emptyBody: 'There is nothing to compare here yet.',
  },

  outcomes: {
    title: 'Outcomes',
    noGoalTitle: 'No goal set for this yet',
    noGoalBody:
      'Naming what you want out of this — visits to a page, enquiries, sign-ups — lets everything above be read against it instead of on its own terms.',
    noTarget: 'No target set for {{goal}}',
    setOne: 'Set one',
    connectSource: 'Connect a source',
    notCountedTitle: "{{goal}} isn't being counted yet",
    notCountedBody:
      'The posts pointing at it are still going out, and the moment a signal is connected this fills in from the links we already stamp.',
    overThePeriod: '{{goal}} over the period',
    measuredBy: 'Measured by {{signal}}',
    measuredByAt: 'Measured by {{signal}} · {{destination}}',
    mostlyFrom: 'Mostly from',
    towardsTargetWeek:
      '{{value}} of the {{target}} a week you are aiming for. The dashed line is the target; the solid one is the running total.',
    towardsTargetMonth:
      '{{value}} of the {{target}} a month you are aiming for. The dashed line is the target; the solid one is the running total.',
    soFar:
      '{{value}} so far. The line is a running total, so it ends on the figure above it.',
    signalNoun: {
      unmeasured: 'not measurable yet',
      clicks: 'clicks on the link',
      sessions: 'visits that arrived from a post',
      conversions: 'completions your website reported',
    },
    signalShort: {
      unmeasured: 'not measured',
      clicks: 'link clicks',
      sessions: 'site visits',
      conversions: 'reported goals',
    },
    signalBadge: {
      unmeasured: 'Nothing connected',
      clicks: 'Link clicks only',
      sessions: 'Your website is connected',
      conversions: 'Your website reports its own goals',
    },
  },

  /** "What we've learned" — the standing lessons, outside the date lens. */
  learned: {
    title: "What we've learned",
    metric: 'Metric',
    metrics: {
      reach: 'Reach',
      interactions: 'Interactions',
      saves: 'Saves',
    },
    measuredPosts_one: '{{count}} measured post',
    measuredPosts_other: '{{count}} measured posts',
    whenPostsLand: 'When your posts land',
    howLongAPostLives: 'How long a post lives',
    strongestSlot: 'Your strongest slot is <1>{{slot}}</1>, from {{posts}}.',
    slotsBasis:
      'From {{posts}} across every hour you have published in. Darker is better.',
    slotsBasisUtc:
      'From {{posts}}, by median {{metric}}. Darker is better; a blank square is an hour you have never published in. Times are UTC.',
    slotsAriaStrongest:
      'Median {{metric}} by hour published. Strongest slot: {{slot}}, from {{posts}}.',
    slotsAria: 'Median {{metric}} by hour published, across {{posts}}.',
    slotCell: '{{slot}} · {{posts}} · {{value}} median {{metric}}',
    slotsNotYetTitle: 'Not enough posts to say yet',
    slotsNotYetBody:
      'This needs around thirty measured posts spread across different hours. Until then any grid would be a coin toss wearing a chart’s clothes.',
    slotsNotYetBodyWithCount:
      'This needs around thirty measured posts spread across different hours. You have {{count}}. Until then any grid would be a coin toss wearing a chart’s clothes.',
    slotsInsufficientBody:
      'A grid drawn from a handful of posts looks exactly like one drawn from hundreds, and someone will rearrange their week around it. This fills in once you have published across a few different hours.',
    halfLife:
      'Half of everything a post earns arrives in the first <1>{{span}}</1>.',
    milestone: 'by {{span}}',
    lifespanNotYetTitle: 'Not enough finished posts yet',
    lifespanNotYetBody:
      'A shelf life needs posts that have stopped earning, which takes a few weeks of publishing.',
    lifespanNoneSettled:
      'This needs posts that have stopped earning, which takes a few weeks of publishing — none of yours have run their course yet.',
    lifespanSomeSettled_one:
      'This needs posts that have stopped earning, which takes a few weeks of publishing — {{count}} of yours has so far.',
    lifespanSomeSettled_other:
      'This needs posts that have stopped earning, which takes a few weeks of publishing — {{count}} of yours have so far.',
    lifespanBasis:
      'From {{count}} posts that have run their course. The gap between the first and last mark is your window to act on a post — after it, its number is settled. It is also why a post younger than a day is shown as still counting rather than ranked.',
    lifespanBasisWorkspace:
      'From {{count}} posts that have run their course. Always reach, whichever metric the card is set to — the curve is the shape of a post’s own reach over time, as a share of what it finally earned.',
    whatWorks: 'What works',
    whatsFading: "What's fading",
    againstMedian: 'Against your median.',
    changeOver: 'Change over the last {{window}}.',
    trendWindowDays: '{{count}} days',
    nothingSeparated: 'Nothing has separated itself from the rest yet.',
    nothingFallen: 'Nothing has fallen off yet.',
    patternSupport_one: '{{count}} post',
    patternSupport_other: '{{count}} posts',
    patternTooFew: '{{support}} — too few to lean on',
    patternBasis: '{{support}} · {{metric}}',
    noPatternsTitle: 'No habits to compare yet',
    noPatternsBody:
      'Patterns come from splitting your posts by what they have in common — format, length, links, timing, platform — and each side of a split needs enough posts to mean anything.',
    unavailableTitle: 'Nothing is being measured for this workspace',
    unavailableBody:
      'Once measurement is connected, the hours you publish into, how long a post keeps earning, and what your posts have in common show up here — built from the posts you have already sent.',
    emptyTitle: 'Nothing published yet',
    emptyBody:
      'These are lessons drawn from your own posts, so they start the day you have some. Nothing needs setting up.',
    emptyNarrowedTitle: 'Nothing published on {{platforms}} yet',
    emptyNarrowedBody:
      'These lessons are drawn from posts on these platforms alone, and none have gone out there. Choose ALL PLATFORMS above to learn from the rest of the workspace.',
    narrowedThin:
      'Counted on {{platforms}} alone. A lesson needs enough posts on these platforms by themselves, so choosing more above may bring a section back.',
    errorTitle: "Couldn't load what we've learned",
    errorBody:
      'The workspace itself is unaffected — nothing here changes what is scheduled or published. Try again in a moment.',
    since: 'since {{date}}',
    updated: 'Updated {{when}}.',
  },

  next: {
    title: "What's next",
    nothingTitle: 'Nothing needs you right now',
    nothingBody:
      'When a slot goes unused, a post outruns its usual, or an account goes quiet, it shows up here.',
    pacing: '{{published}} of {{planned}} posts {{period}}',
    behind: 'Behind the plan',
    onPlan: 'On plan',
    projected:
      'At this rate this campaign finishes on {{date}} with about {{projected}} posts.',
    projectedAgainstTarget:
      'At this rate this campaign finishes on {{date}} with about {{projected}} posts against a plan of {{target}}.',
    evergreen:
      'This campaign runs on until you stop it, so this is a rate rather than a finish line.',
  },

  scopeBar: {
    period: 'Period',
    compare: 'Compare',
    by: 'By',
    selectAll: 'SELECT ALL',
    deselectAll: 'DESELECT ALL',
    allPlatforms: 'ALL PLATFORMS',
    accounts_one: '{{count}} account',
    accounts_other: '{{count}} accounts',
    platformAccounts: '{{platform}} — {{accounts}}',
    platformNoAccount: '{{platform}} — no account connected',
    platformAccountsLabel: '{{platform}}, {{accounts}}',
    platformNoAccountLabel: '{{platform}}, no account connected',
    control: {
      period: 'Period',
      platforms: 'Platforms',
    },
    assistantChanged: 'The assistant changed {{controls}}',
    otherCampaign: 'A campaign no longer listed',
    range: '{{from}} – {{to}}',
    axisTime: 'Now vs. before',
    axisSleeve: 'Side by side',
  },

  surface: {
    title: 'Analytics',
    unavailableTitle: 'Nothing is being measured for this workspace',
    unavailableBody:
      "Analytics isn't switched on here yet. Everything else — planning, generating, scheduling, publishing — works exactly as it does now, and the moment measurement is connected these screens fill in from the posts you have already sent.",
    errorTitle: "Couldn't load analytics",
    errorBodyCampaign:
      'The campaign itself is unaffected — nothing here changes what is scheduled or published. Try again in a moment.',
    errorBodyWorkspace:
      'The workspace itself is unaffected — nothing here changes what is scheduled or published. Try again in a moment.',
    coldTitle: 'Nothing measured yet',
    coldNothingPublished:
      'Once this starts publishing, what each post earns shows up here — reach, interactions, and how that compares with what you normally do.',
    coldNotReported_one:
      "{{count}} post has gone out, and the platforms haven't reported on it yet. This usually takes a few hours.",
    coldNotReported_other:
      "{{count}} posts have gone out, and the platforms haven't reported on them yet. This usually takes a few hours.",
  },

  /** A post's own numbers, on the post screen. */
  post: {
    identityTitle: 'The post',
    openOn: 'Open on {{platform}}',
    published: 'Published',
    scheduled: 'Scheduled',
    notScheduled: 'Not scheduled',
    noDateSet: 'No date set',
    campaign: 'Campaign',
    overviewTitle: 'Performance overview',
    overviewWindow: 'over its first {{span}}',
    unpublishedTitle: 'Nothing to measure yet',
    unpublishedBody:
      "This post hasn't gone out. Once it does, what it earns shows up here — and how that compares with what your posts normally do.",
    silentTitle: 'Nothing back from the platform yet',
    silentBody:
      "This post is out. The platform hasn't reported any numbers for it — that usually takes a few hours.",
    reading: 'How to read it',
    readingTotal: 'Running total',
    readingHour: 'Per hour',
    readingDay: 'Per day',
    noHistoryLabel: 'No history recorded for this post',
    noHistoryBasis:
      '{{measure}} was collected as a total. Nothing recorded how it arrived, so there is no shape to draw.',
    noHourReached: 'No hour reached enough people to divide',
    noDayReached: 'No day reached enough people to divide',
    tryTheDay:
      'Try the day, or the running total — both have enough behind them to divide by.',
    peakPerHour: 'peak {{value}} an hour',
    peakPerDay: 'peak {{value}} a day',
    legendRateTotal:
      'The rate so far — interactions divided by everyone reached up to that point.',
    legendTotal:
      'Running total since publishing — the line ends on the figure above.',
    legendRateHour:
      'The rate it was running at each hour. A gap is an hour with nothing in it — or one too quiet to divide.',
    legendRateDay:
      'The rate it was running at each day. A gap is a day with nothing in it — or one too quiet to divide.',
    legendHour:
      'What arrived in each hour. A gap is an hour with nothing in it.',
    legendDay: 'What arrived in each day. A gap is a day with nothing in it.',
    maturityCounting:
      'Still counting — every figure above is a floor rather than a result.',
    maturitySettling: 'Past its peak, and still adding a little.',
    maturityFinal: 'This post has stopped earning — these numbers are final.',
    percentile: 'Better than {{percentile}}% of your posts.',
    percentileBasis: 'Ranked on reach against {{count}} measured posts',
    updated: 'Updated {{when}}',
  },
}
