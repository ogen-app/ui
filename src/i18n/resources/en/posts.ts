export const posts = {
  preview: {
    notesHeading: 'Notes',
  },
  delete: {
    keep: 'Keep post',
  },
  /**
   * The post statuses, as the app names them. Not the server's words: these
   * are read on a card at a glance, so `scheduled` is written as the thing
   * that will happen to the post ("Auto-publish") rather than as the state
   * it is sitting in.
   */
  status: {
    draft: 'Draft',
    planned: 'Planned',
    ready_for_publish: 'Ready to publish',
    scheduled: 'Auto-publish',
    scheduled_for_manual_publishing: 'Manual publish',
    failed: 'Failed',
    published: 'Published',
    not_published: 'Not published',
  },

  /**
   * The absences a card or a locked post can carry. Each is shown in place
   * of a name, so it has to read as a fact about the post rather than as a
   * missing value — on a published post nobody can go back and fill these
   * in, which is exactly why they are stated rather than warned about.
   */
  noPlatform: 'No platform',
  noAccount: 'No account',
  noPostType: 'No post type',

  /**
   * **Auto** — the post works out its own format from what is in it, rather
   * than asking the author to name one first (`lib/postTypeAuto`).
   *
   * `autoResolved` carries both halves on purpose: *Auto* is the state the
   * picker is in, and the format beside it is what the post would publish as
   * right now. Dropping either one loses something — the first, and the
   * author cannot see the decision without opening the menu; the second, and
   * it reads as a type somebody chose.
   *
   * The format name itself is not translated. Post-type labels are FE-owned
   * and deliberately English everywhere they appear (`platformDictionary`),
   * so this places one rather than composing it.
   */
  postType: {
    auto: 'Auto',
    autoResolved: 'Auto · {{type}}',
    /** Beside *Auto* in the menu: what choosing it means, in three words. */
    autoHint: 'From the post',
    /** The check row's own label, replacing the legacy English one. */
    checkLabel: 'Post type',
    autoPending: 'Working out the format…',
    /**
     * Why no format fits. Each names a different thing to change, and only
     * the first two are things the author changes by editing — so none of
     * them says "pick a post type", which is the one thing they did not do
     * wrong.
     */
    autoUnfit: {
      tooLong:
        'Too long for any format on this campaign — the longest takes {{limit}} characters',
      mediaKind: 'Nothing this campaign publishes takes the files attached',
      tooMany: 'Too many files for any format on this campaign',
      noCandidates:
        'This campaign enables no format that can be chosen automatically',
    },
  },

  /**
   * The post editor (`components/posts/editor`): its part of the bar over
   * the page, and the side column's tabs.
   */
  editor: {
    titlePlaceholder: 'Title',
    /** The post's bar names it by its title; this when it has none. */
    untitled: 'Post with no title',
    back: 'Back to posts',
    more: 'More actions',
    downloadMarkdown: 'Download as Markdown',
    delete: 'Delete post',
    previous: 'Previous post',
    next: 'Next post',
    /** The post's place in the campaign's timeline: "3 of 21". */
    position: '{{position}} of {{total}}',
    tabs: {
      label: 'About this post',
      overview: 'Overview',
      preview: 'Preview',
      checks: 'Checks',
      quality: 'Quality',
      sources: 'Sources',
      notes: 'Notes',
      history: 'History',
      /** A closed tab's name while something on it needs a look. */
      withWarnings_one: '{{label}} — 1 thing to look at',
      withWarnings_other: '{{label}} — {{count}} things to look at',
    },
    settings: {
      platform: 'Platform',
      postType: 'Post type',
      account: 'Account',
      date: 'Publish',
      publishing: 'Publishing',
      phase: 'Phase',
      noPhase: 'No phase',
      format: 'Format',
      platformChange: 'Change platform',
      platformPick: 'Select platform',
      platformPickHint:
        'Pick the platform this post publishes to — it decides the available post types and the publishing account.',
      platformNone: 'No platforms on this campaign',
      platformDeselect: 'Deselect platform',
      postTypeChange: 'Change post type',
      postTypePick: 'Select post type',
      postTypePickHint:
        'Pick the {{platform}} post type — it sets the format this post publishes as.',
      postTypeNone: 'No post types on this campaign',
      /** A post type the campaign plans for, with no account to publish it. */
      notConnected: 'Not connected',
      accountChange: 'Change the account this post publishes as',
      accountNone: 'No account connected',
      accountNoneHint:
        'No {{platform}} account is connected, so nothing can publish this post. Connect one in Platform settings.',
      accountNotRecorded: 'Account not recorded',
      accountDisconnected: '{{name}} — disconnected',
      accountDisconnectedUnnamed: 'Account disconnected',
      accountGoneHint:
        '{{name}} is no longer connected to {{platform}}, so this post can’t publish as it. Pick another account.',
      accountGoneHintUnnamed:
        'The account this post publishes as is no longer connected to {{platform}}. Pick another one.',
      accountPick: 'Select account',
      accountPickHint_one:
        'This workspace has {{count}} {{platform}} account connected — pick the one this post publishes as.',
      accountPickHint_other:
        'This workspace has {{count}} {{platform}} accounts connected — pick the one this post publishes as.',
      methodChange: 'Change how this post publishes',
      methodNotAllowed:
        'Not allowed for {{platform}} in this workspace — change it in Workspace Settings.',
      methodNotAllowedUnnamed:
        'Not allowed for this platform in this workspace — change it in Workspace Settings.',
      methodNoAccount:
        'No {{platform}} account is connected — this will fall back to a reminder.',
      methodNoAccountUnnamed:
        'No publishing account is connected — this will fall back to a reminder.',
    },
    /** The Overview tab's sections, and its one-line summaries of the rest. */
    overview: {
      publishing: 'Publishing',
      health: 'Health',
      quality: 'Quality',
      notes: 'Notes',
      sources: 'Sources',
      writing: 'Writing',
      /** The tooltip on a line that opens another tab. */
      open: 'Open {{tab}}',
      moreChecks_one: 'and {{count}} more',
      moreChecks_other: 'and {{count}} more',
      moreNotes_one: 'and {{count}} more note',
      moreNotes_other: 'and {{count}} more notes',
      /** The Quality section's one row. */
      score: 'Score',
      notAssessed: 'Not assessed yet',
      /** A note with no title, where its title would be the row's label. */
      note: 'Note',
      /** The Sources section's one row: what is attached to the post. */
      attached: 'Attached',
      sourceCount_one: '{{count}} source',
      sourceCount_other: '{{count}} sources',
      noSources: 'No sources',
      notGrounded: 'Not grounded — written from general knowledge',
      /** A failing check as one sentence (`CheckProblem` in lib/postValidation). */
      problems: {
        platform: 'Pick a platform.',
        postType: 'Pick a post type.',
        videoUnsupported:
          'This post type needs video, which the platform doesn’t publish.',
        videoTitle: 'The video needs a title.',
        titleOver_one: 'The title is {{count}} character over.',
        titleOver_other: 'The title is {{count}} characters over.',
        copy: 'The post needs copy.',
        copyEmpty: 'There’s no copy yet.',
        lengthOver_one: 'Length is {{count}} character over.',
        lengthOver_other: 'Length is {{count}} characters over.',
        needVideo: 'The post needs a video.',
        needImage: 'The post needs an image.',
        needFile: 'The post needs a file.',
        tooFew_one: 'The post needs {{count}} more file.',
        tooFew_other: 'The post needs {{count}} more files.',
        tooMany_one: 'One file too many — the platform takes {{max}}.',
        tooMany_other: '{{count}} files too many — the platform takes {{max}}.',
        unwanted: 'This post type publishes without media.',
        wrongKind_one: '{{count}} file can’t go out with this post type.',
        wrongKind_other: '{{count}} files can’t go out with this post type.',
        altText_one: '{{count}} image has no alt text.',
        altText_other: '{{count}} images have no alt text.',
      },
    },
    /** The publishing list's date row, and what it says once it is history. */
    schedule: {
      setDate: 'Set publish date',
      pickDate: 'Select publish date',
      time: 'Publish time',
      noDateHint:
        'This post has no publish date, so it can’t be scheduled. Pick a date and time to publish it.',
      pastHint:
        'The publish date is in the past. Scheduling needs a date in the future — pick a new one.',
      unscheduling: 'Unscheduling…',
      noDate: 'No publish date set',
      autoAt: 'Auto-publishes {{when}}',
      manualAt: 'Manual publish — reminder {{when}}',
      publishedAt: 'Published {{when}}',
      published: 'Published',
      failedAt: 'Publish failed — was scheduled for {{when}}',
      failed: 'Publish failed',
      notPublishedAt: 'Not published — was planned for {{when}}',
      notPublished: 'Not published',
      plannedAt: 'Planned for {{when}}',
      notScheduled: 'Not scheduled yet',
    },
    checks: {
      notAssessed: 'Not assessed yet.',
    },
  },

  /**
   * The card's warning mark. What is wrong is in the post itself — the mark
   * only says to go and look — so this is deliberately the whole of it.
   */
  hasProblem: 'This post has a problem',
  /** A post left outside its campaign's platforms or post types (CON-483). */
  outsideCampaign: {
    check: 'Campaign',
    platform: 'Not a platform of this campaign',
    postType: 'Not a post type of this campaign',
  },

  /**
   * The bottom bar's read-only publish status (CON-195). `when` arrives
   * already localised from `Intl.RelativeTimeFormat` ("in 2 days", "2 days
   * ago", "now"), so a translation places it rather than rebuilding it.
   *
   * Auto and manual are separate sentences on purpose: only one of them is
   * a promise that the app will publish anything. A manual post gets a
   * reminder on the date and nothing else.
   */
  publishStatus: {
    auto: 'Auto-publishing {{when}}',
    manual: 'Reminding {{when}}',
    /** The short forms, for a bar too narrow for the sentence. */
    compactNow: 'now',
    compactLate: '{{amount}} late',
  },

  /**
   * The two states a published post's permalink can be in (CON-165), on the
   * quick bar's scheduling line. Never both: pasting the URL is how the link
   * gets recorded, so a post that has one has already been asked.
   *
   * "View post" rather than "View on LinkedIn" — the line already names
   * nothing platform-specific, and the platform is stated a row below.
   */
  publishedLink: {
    view: 'View post',
    add: 'Add post link',
  },

  /**
   * Thread sequences (CON-196) — a post on X or Threads that publishes as a
   * chain of connected posts rather than one.
   *
   * The vocabulary is fixed here and everything follows it. The whole thing
   * is a **thread**; each part of it is a **post**, numbered from 1, because
   * that is what each one becomes on the platform — calling them "items" or
   * "segments" would name the data structure rather than the thing the
   * reader will scroll through. Both networks use "thread" for this in their
   * own apps, so it needs no gloss on either.
   *
   * Every limit these sentences quote is per *post*, never for the thread,
   * which is the one thing about the format that surprises people.
   */
  sequence: {
    /**
     * Teaching, and only teaching — it can be dismissed for good, so nothing
     * a person needs while writing may live here (CLAUDE.md). What the body
     * actually became is the note under the editor, which cannot be
     * dismissed.
     */
    explainer:
      'This publishes as a chain of posts, each replying to the one before it. Type --- on its own line wherever you want a break, and those are the breaks — exactly where you put them, however long each post comes out. With no divider anywhere, it is broken up for you to fit the character limit.',

    /**
     * The note under the editor: what the body will publish as.
     *
     * Two sentences and never a third assembled from clauses, because the
     * two are alternatives rather than halves — a body either carries
     * dividers, in which case the limit did not come into it, or it carries
     * none and the limit is the only thing that broke it.
     */
    splitByDivider_one:
      'Publishes as {{count}} post, broken where you put a divider.',
    splitByDivider_other:
      'Publishes as {{count}} posts, broken where you put a divider.',
    splitByLimit_one:
      'Publishes as {{count}} post, broken up to fit {{limit}} characters.',
    splitByLimit_other:
      'Publishes as {{count}} posts, broken up to fit {{limit}} characters.',
    /**
     * One post, and therefore no rule to name: the body has no divider and
     * no blank line, or it has one and still fits. How to make a second post
     * is the Explainer's job, above — this line is a verdict.
     */
    splitSingle: 'Publishes as a single post.',
    splitPending: 'Working out how this breaks into posts…',
    splitOverflow:
      'This is more than {{max}} posts. Shorten it, or publish it as more than one thread.',

    /**
     * The media card, when the post is a thread. The card's other copy is
     * still legacy English (CON-174) — these are new, so they are here.
     */
    mediaPerPost: 'Every limit here is per post of the thread.',
    mediaOn: 'Post {{position}}',
    mediaOnLabel: 'This file rides post {{position}} — pick another',

    postCount_one: '{{count}} post',
    postCount_other: '{{count}} posts',

    /**
     * The row this adds to the pre-publish bar.
     *
     * Length and media are separate failures rather than one "these posts
     * have a problem", because they are separate jobs: one is rewriting a
     * message, the other is moving a file to a different one.
     */
    check: {
      label: 'Thread',
      pending: 'Checking…',
      overflow: 'More than {{max}} posts',
      /**
       * Only reachable for a body broken with dividers — where there are
       * none the split is made to fit, so nothing can come out over the
       * limit. Your breaks are kept as written, which is why this is
       * reported rather than quietly re-cut.
       */
      tooLong_one: 'Post {{positions}} is over {{limit}} characters',
      tooLong_other: 'Posts {{positions}} are over {{limit}} characters',
      /**
       * The same finding when the rule carries no positive ceiling to name
       * — never print "over 0 characters".
       */
      tooLongNoLimit_one:
        "Post {{positions}} is over the platform's length limit",
      tooLongNoLimit_other:
        "Posts {{positions}} are over the platform's length limit",
      issues_one: 'Post {{positions}} carries more media than one post takes',
      issues_other: 'Posts {{positions}} carry more media than one post takes',
      /**
       * Not a failure. A chain of one is what the platforms call a post, and
       * publishing writes it as one — so this row says what will happen
       * rather than what is wrong. `singularAs` names the format; the bare
       * one is for the rare case where nothing on the campaign fits it.
       */
      singular: 'One message, so this publishes as a single post.',
      /** `type` is the platform's own label ("Text post"), never a slug. */
      singularAs: 'One message, so this publishes as a single {{type}}.',
      /**
       * A warning, never a refusal — the platforms take a two-character
       * message, and the author may have meant it. Almost always a divider
       * typed one line early.
       */
      runts_one: 'Post {{positions}} is very short — is that a stray break?',
      runts_other:
        'Posts {{positions}} are very short — are those stray breaks?',
    },

    /**
     * The preview panel's note. It replaces a sentence that said the
     * publisher does the splitting — it does not, and never did: without
     * `threadItems` the whole body goes out as a single post.
     */
    previewNote:
      'A thread: each post below goes out separately, replying to the one before it.',
    /**
     * The same panel, for a `thread` post left over from before the feature
     * — the type is withdrawn from every picker while the flag is off, but a
     * post already saved as one keeps it. What it says is the uncomfortable
     * truth: the card has always drawn a chain, and the submit path has
     * always sent one post.
     */
    previewNoteUnsplit:
      'The card splits this at blank lines, but it publishes as a single post — Ogen does not send the thread yet.',
  },

  /**
   * Attaching an image from Assets to a post (CON-290). The bank copies the
   * image into the post server-side, so these are the picker's words and
   * the refusals the copy can meet.
   */
  media: {
    /** The media card's header button, and its first add tile. */
    add: 'Add media',
    /** The add tile once something is attached. */
    addMore: 'Add more',
    fromAssets: {
      tile: 'From Assets',
      title: 'Add images from Assets',
      scopeCampaign: 'This campaign',
      scopeWorkspace: 'All assets',
      search: 'Search images',
      searchLabel: 'Search images in Assets',
      clearSearch: 'Clear search',
      room_one: 'One more image fits on this post.',
      room_other: '{{count}} more images fit on this post.',
      error: 'Unable to read Assets.',
      emptyCampaign:
        'This campaign has no images yet. Switch to All assets to choose from the whole workspace.',
      emptyWorkspace: 'There are no images in Assets yet.',
      noMatch: 'No images match that.',
      onPost: 'On this post',
      processing: 'Processing',
      failed: 'Failed',
      add: 'Add',
      addCount_one: 'Add {{count}} image',
      addCount_other: 'Add {{count}} images',
      failedToast: "Couldn't add {{title}}",
      errors: {
        locked:
          'This post is scheduled or published, so its media can no longer change.',
        gone: 'This image is no longer in Assets.',
        postGone: 'This post has been deleted.',
        noFile: 'This asset has no stored image to attach.',
      },
    },
    /**
     * An image's accessibility description, published with it on the
     * platforms that take one. "Generated" is image-service's own text,
     * which publishes as-is until someone reads it.
     */
    altText: {
      missing: 'No alt text',
      edit: 'Edit alt text',
      view: 'View alt text',
      title: 'Alt text',
      help: 'Describe what the image shows for people using a screen reader. It publishes with the image.',
      generatedNote:
        'Ogen wrote this description from the image. It publishes as it is unless you change it — saving it, even unchanged, keeps it from being rewritten.',
      placeholder: 'e.g. A barista pouring latte art into a white cup',
      count: '{{length}} / {{limit}} characters',
      over: '{{length}} / {{limit}} characters — {{over}} over',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
    },
  },

  /**
   * Why a post failed to publish (CON-200), one sentence per code the
   * publishing worker writes. Each says what went wrong and, where there is
   * one, what to do before scheduling it again.
   */
  failure: {
    noAccount:
      'No account is connected for this network, so there was nowhere to publish it. Connect one, then schedule it again.',
    chooseAccount:
      'More than one account is connected for this network and none was chosen. Choose one, then schedule it again.',
    accountGone:
      'The account chosen for this post is no longer connected. Choose another, then schedule it again.',
    accountMismatch:
      'The account chosen for this post belongs to a different network. Choose one for this network, then schedule it again.',
    duplicate:
      'Identical content was already submitted in the last 24 hours, so the publishing service refused it. Change the wording, then schedule it again.',
    rejected: 'The publishing service refused this post. It said:',
    rejectedAlone: 'The publishing service refused this post.',
    retryRejected:
      'The publishing service refused to submit this post again. It said:',
    retryRejectedAlone:
      'The publishing service refused to submit this post again.',
    networkRefused: 'The network refused this post when it came to publish.',
    partial: 'This post only partly published, so it is marked as failed.',
    noPlatform: 'This post had no network set, so it could not be published.',
    unsupported:
      'This network can’t be published to automatically. Publish it by hand instead.',
    notSetUp: 'Automatic publishing isn’t set up for this workspace yet.',
    unknown: 'Publishing failed. The server said:',
    unknownAlone:
      'Publishing failed for a reason this version of the app doesn’t recognise.',
  },

  /**
   * What a post writes from. The same control renders as the card under the
   * copy and as a section in the settings rail, so the two empty states are
   * one idea at two lengths — the card can afford to explain what the list
   * is for, the rail cannot.
   */
  sources: {
    heading: 'Sources',
    /** The rail section's title. Its capitals are the copy, as everywhere. */
    sectionTitle: 'SOURCES',
    add: 'Add a source',
    fromBank: 'Choose from content bank',
    upload: 'Upload files',
    webPage: 'Add a web page',
    emptyCard:
      'This post writes from the campaign brief alone. Add the documents it should also draw on — the assistant reads exactly what is listed here.',
    emptyRail: 'Nothing yet — this post writes from the campaign brief alone.',
    /**
     * The same fact with nothing to do about it. Deliberately present
     * tense: a scheduled post has not gone out yet, so the past tense would
     * be wrong for half the statuses this is shown in.
     */
    emptyLocked: 'This post writes from the campaign brief alone.',
    /** An id whose document has not arrived in this tab yet. */
    loading: 'Loading…',
    /**
     * The one fact about a source nobody can infer from its title: a
     * document retrieval skips is sitting in the list doing nothing.
     */
    unreadable: "Can't be read",
    unreadableHint:
      'Nothing was extracted from this document, so retrieval skips it.',
    reading: 'Still reading',
    remove: 'Remove {{title}} from this post',
  },

  /**
   * Why a post is read-only (CON-251). One sentence per locked status,
   * never a shared one: they differ by whether there is a way back, and
   * that difference is the whole of what the reader needs.
   *
   * `scheduled` names the way out, because there is one and a screen that
   * hid it would read as broken. `published` deliberately offers none —
   * the post is on the network, and editing here would change our record
   * of it rather than the thing itself.
   */
  locked: {
    scheduled: 'This post is scheduled. Unschedule it to make changes.',
    published:
      'This post is published — what is here is the record of what went out.',
  },

  /**
   * The post's own numbers, and the three answers that are not numbers.
   *
   * Each names what is true rather than what is missing. "No analytics" would
   * cover all three and explain none: one has an action behind it, one is a
   * clock, and one is a fact about the deployment that no reader can act on.
   */
  performance: {
    title: 'Analytics',
    unlinked: {
      body: 'Nothing links this post to what was published. It went out by hand, so we have no way to find it on the platform and no figures for it. Adding the post link connects the two — from then on it is measured like any other.',
      action: 'Add post link',
    },
    waiting: {
      body: 'Numbers are on their way. This post has gone out and the first figures have not come back yet. They usually arrive within a few hours; this will fill in on its own.',
    },
    unavailable: {
      body: 'Analytics is not switched on for this deployment, so no figures are collected for published posts.',
    },
    error: {
      body: "This post's figures could not be loaded.",
    },
  },

  /**
   * The CON-85 score, where it shares a line with the platform checks and
   * where it stands alone in the rail.
   *
   * The score survives a lock and the offer to re-take it does not: an
   * assessment costs a model call, and on a submitted post it would be paid
   * for a verdict about text nobody can act on without unscheduling first.
   * What a stored score gains instead is meaning — its "assessed at" stamp
   * can no longer drift out of date behind an edit.
   */
  quality: {
    /**
     * The three bands, in flat words with no praise or alarm in them — the
     * score is advisory, and copy that congratulated or scolded would make an
     * opinion sound like a result.
     */
    bands: {
      strong: 'Good',
      workable: 'Workable',
      weak: 'Weak',
    },
    score: 'Post quality {{score}}',
    assess: 'Assess quality',
    reassess: 'Re-assess',
    assessing: 'Assessing…',
    neverScored: 'This post was never scored.',
    scoringIsForDrafts: 'Scoring is for a post you can still change.',

    /**
     * The rubric's names as a user reads them (CON-440). "Correctness" and
     * "Delivery" are the API's keys; the panel says Accuracy and Channel fit.
     */
    dimensions: {
      correctness: 'Accuracy',
      clarity: 'Clarity',
      engagement: 'Engagement',
      delivery: 'Channel fit',
    },
    outOfTen: '/10',

    /**
     * The lines beside and under the overall (CON-440). The `<strong>` is
     * the previous run's score.
     */
    summary: {
      upFrom: 'Up from <strong>{{score}}</strong> before your edits',
      downFrom: 'Down from <strong>{{score}}</strong> before your edits',
      sameAs: 'The same as before your edits',
      weighsMost: '{{dimension}} weighs most for this format.',
    },

    /** The four dimensions drawn as a square web (CON-440). */
    radar: {
      writing: 'The writing',
      channel: 'Fit for {{platform}}',
      channelGeneric: 'Fit for the channel',
      /** The chart's accessible name: every score, then the lowest. */
      scores: '{{scores}}.',
      scoreItem: '{{dimension}} {{score}}',
      lowest: '{{dimension}} is lowest.',
      corner: '{{dimension}}: {{score}} out of 10. Show why.',
      legendNow: 'This run',
      legendBefore: 'Before your edits',
      legendGood: '8+ is good',
    },

    /** The ⓘ pop-over beside the radar. */
    guide: {
      open: 'How to read the radar',
      title: 'Reading the radar',
      close: 'Close',
      ringsTitle: 'Rings at 5 and 8',
      ringsBody: 'Inside 5 is weak, 5–7 workable, 8+ good.',
      halvesTitle: 'Two halves',
      halvesBody: 'Left: the writing. Right: fit for {{platform}}.',
      halvesBodyGeneric: 'Left: the writing. Right: fit for the channel.',
      linesTitle: 'Solid and dashed',
      linesBody: 'Solid is this run. Dashed is the run before your edits.',
      cornersTitle: 'Corners',
      cornersBody:
        'Name, score and change since last run. Click one to see its verdict.',
      zoneTitle: 'Shaded edge',
      zoneBody: 'Scores of 8 and up land here.',
    },

    /** Every suggestion in one list, most severe first. */
    fixFirst: {
      title: 'Fix first',
      order: 'Highest impact first',
      none: 'No suggestions on this run.',
      /** The span has changed since the run (CON-441); nothing knows yet whether it is fixed. */
      edited: 'Edited',
      /** In place of the quote when the span is most of the post, so nothing is marked. */
      wholePost: 'The whole post <muted>· not marked in the text</muted>',
      /** Read out when a suggestion is chosen and its span marked in the post. */
      announce: 'Highlighted in the post: {{span}}',
      announceWhole: 'This suggestion is about the whole post.',
    },

    /** One line per dimension: the model's verdict on it. */
    reasons: {
      title: 'Why these scores',
    },

    /** The digest inside the expanded checks bar (CON-183). */
    inline: {
      /** The teaser's count line, one whole sentence per case (CON-443). */
      countNoneHigh_one: '{{count}} suggestion, not high.',
      countNoneHigh_other: '{{count}} suggestions, none high.',
      countAllHigh_one: '{{count}} suggestion, high.',
      countAllHigh_other: '{{count}} suggestions, all high.',
      countSomeHigh_one: '{{count}} suggestions, {{high}} of them high.',
      countSomeHigh_other: '{{count}} suggestions, {{high}} of them high.',
      seeAll_one: 'See the suggestion',
      seeAll_other: 'See all {{count}} suggestions',
    },

    title: 'Quality',
    inlineHeading: 'Post content quality',
    seeBreakdown: 'See the full breakdown',
    assessPost: 'Assess this post',
    reassessPost: 'Re-assess this post',
    assessingPost: 'Assessing this post…',
    scored: 'Scored',
    scoredAt: 'Scored {{when}}',
    scoredCached: 'Scored · unchanged since the last run',
    scoredAtCached: 'Scored {{when}} · unchanged since the last run',
    captionScoped:
      "Only the text was scored. This post carries media the model can't see, so the visual is not part of the number above.",
    runFailed: "The assessment didn't finish",
    loadFailed: "Couldn't load the assessment",
    suggestionCount_one: '{{count}} suggestion',
    suggestionCount_other: '{{count}} suggestions',
    severity: {
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    },

    /**
     * What started the stored score, when it wasn't the author (CON-438).
     * A manual run says nothing — "you asked for this" is no news.
     */
    trigger: {
      ready: 'Assessed automatically when it was marked ready',
      version: 'Assessed automatically when a version was saved',
      scheduled: 'Assessed automatically when it was scheduled',
      published: 'Assessed automatically when it was published',
    },

    /** An automatic run in progress, which no button in this tab started. */
    auto: {
      running: {
        ready: 'Assessing automatically, as the post was marked ready.',
        version: 'Assessing automatically, as a version was saved.',
        scheduled: 'Assessing automatically, as the post was scheduled.',
        published: 'Assessing automatically, as the post was published.',
      },
      runningGeneric: 'Assessing automatically.',
    },

    /**
     * The score no longer describes the post. The reasons are worded apart
     * because they behave apart: a content change is caught by the next
     * checkpoint, a context change never is — re-assessing is the only way.
     */
    stale: {
      badge: 'May be outdated',
      content:
        "The post has changed since it was scored. It's re-scored automatically at the next checkpoint, or you can re-assess now.",
      context:
        "The campaign brief, its assets or the way posts are scored have changed since this was scored. That's never re-scored automatically.",
      both: 'The post and its campaign context have both changed since this was scored. Re-assess to see where it stands now.',
      action: 'Re-assess',
    },

    /**
     * The post's `quality_reviews_per_post` allowance (CON-438). Automatic
     * and manual runs share it; an unchanged post re-assessed is free.
     * `count` is what selects the plural, so it is the number left — or,
     * in `none`, the cap.
     */
    runs: {
      left_one: '{{count}} of {{limit}} reviews left for this post',
      left_other: '{{count}} of {{limit}} reviews left for this post',
      none_one: "You've used the one review your plan allows for this post.",
      none_other:
        "You've used all {{count}} reviews your plan allows for this post.",
      noneFlat: "You've used every review your plan allows for this post.",
      noneShort: 'No reviews left',
      limitTitle: 'No reviews left for this post',
    },

    /** Everything the rail says when there is no score on screen. */
    empty: {
      unavailable: 'Scoring is switched off for this workspace.',
      unavailableHint: 'Someone with admin rights can turn it on in settings.',
      goToSettings: 'Go to workspace settings',
      broke: 'Oops, something broke.',
      loadFailed: "We couldn't fetch this post's score just now.",
      tryAgain: 'Try again',
      runFailed:
        'The assessment stopped before it finished. Nothing was saved, so running it again is safe.',
      notScored: "This post hasn't been scored yet.",
      notScoredHow:
        "Ogen reads it against the campaign brief and the channel's conventions, then scores correctness, clarity, engagement and delivery.",
      notScoredAuto:
        "It's also scored automatically once you mark it ready for publish.",
    },
  },

  /**
   * The version history's first row — the live document, which is always
   * listed because a post with no snapshots has a history of one rather than
   * an empty state.
   *
   * It reads two ways. On an editable post it is a draft nobody has
   * snapshotted. On a submitted one it is the post itself: calling that a
   * "draft" that is "unsaved" describes the opposite of what happened to it.
   * The second pair goes away on its own once the server writes a version at
   * publish (CON-253) — the snapshot will match the live text and the row
   * collapses into a numbered version.
   */
  versions: {
    create: 'Create new version',
    restore: 'Restore this version',
    deleteVersion: 'Delete',
    liveDraft: 'Draft',
    liveDraftTime: 'Unsaved',
    liveDraftNote: 'Not snapshotted yet',
    liveSubmitted: 'Current text',
    liveSubmittedNote: 'Never snapshotted',
    /**
     * Who took a snapshot. `system` is the server keeping a record at a
     * lifecycle moment — marked ready, submitted, published — and its note
     * says which; the author didn't take it, so it isn't "You".
     */
    creator: {
      user: 'You',
      assistant: 'Assistant',
      system: 'Ogen',
    },
    /** The notes the server stamps on its own snapshots, in our words. */
    systemNote: {
      markedReady: 'Marked ready for publish',
      submitted: 'Submitted for scheduled publishing',
      published: 'Published',
    },
  },

  /**
   * The one forward move a published post has. It is not a status change
   * (`published` has no outgoing edge) but a new post, so the label says
   * where the copy lands rather than what happens to this one.
   */
  duplicate: {
    action: 'Duplicate into draft',
    pending: 'Duplicating…',
    success: 'Draft created',
    error: "The post couldn't be duplicated. Try again.",
    /** Appended to the copy's title so the two are told apart in a list. */
    titleSuffix: '{{title}} (copy)',
  },

  /**
   * A post's first comment (CON-361) — text posted under the live post, with
   * it or a few minutes after it publishes.
   */
  firstComment: {
    heading: 'First comment',
    helper:
      'Great for links — LinkedIn and Instagram favour posts without links in the caption.',
    add: 'Add first comment',
    remove: 'Remove',
    fieldLabel: 'First comment',
    placeholder: 'A link, a source, or the rest of the story',
    delayLabel: 'Post it',
    delay: {
      now: 'Immediately — with the post',
      minutes_one: '{{count}} min after publish',
      minutes_other: '{{count}} min after publish',
    },
    accountNote: 'Ogen posts it from the account this post goes out on.',
    /** The platform and post type a comment cannot go out on. */
    target: '{{platform}} ({{type}})',
    unsupported:
      '{{target}} doesn’t take a first comment, so this post can’t go out with one. Remove it or pick another platform or post type.',
    check: {
      label: 'First comment',
      unsupported: 'Not supported on {{target}}',
      within: '{{length}} / {{limit}} characters',
      over: '{{length}} / {{limit}} characters — {{over}} over',
    },
    blocker: {
      over: 'Shorten the first comment to {{limit}} characters',
      unsupported: 'Remove the first comment — {{target}} doesn’t take one',
    },
    /** Under a locked comment: when it was set to go out. */
    timing: {
      withPost: 'With the post',
      after_one: '{{count}} min after publish',
      after_other: '{{count}} min after publish',
    },
    /**
     * The line beside the heading once the post has left drafting, one per
     * `first_comment_status` — plus the two plans a scheduled post shows
     * before there is any status at all.
     */
    status: {
      withPost: 'Goes out with the post',
      afterPublish_one: 'Posts ~{{count}} min after publish',
      afterPublish_other: 'Posts ~{{count}} min after publish',
      postingIn_one: 'Posting in ~{{count}} min',
      postingIn_other: 'Posting in ~{{count}} min',
      postingNow: 'Posting now',
      delegated: 'Sent with the post',
      posted: 'Posted · {{at}}',
      postedUndated: 'Posted',
      failed: 'Not posted: {{error}}',
      failedPermission: 'Not posted: the account isn’t allowed to comment.',
      failedUnexplained: 'Not posted',
      reconnect: 'Reconnect account',
      skipped: 'Not posted — the post didn’t publish',
    },
  },

  /**
   * The post's notes (CON-188) — draft theses the content plan captured,
   * prompts the assistant wrote, and anything typed by hand.
   */
  notes: {
    heading: 'Notes',
    add: 'Add note',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit note',

    titlePlaceholder: 'Title (optional)',
    titleLabel: 'Note title',
    bodyPlaceholder: 'What should this post remember?',
    bodyLabel: 'Note',

    deleteConfirm: 'Delete this note? There is no way to get it back.',

    /**
     * Has to be said on the card: queries get no global error toast, and a
     * post whose notes failed to load looks identical to one that has none.
     */
    loadError: "The notes couldn't be loaded. Reload the page to try again.",

    /**
     * Only the machine origins are marked. Labelling a hand-written note
     * "manual" would put a badge on the ordinary case.
     */
    origin: {
      assistant: 'Written by the post assistant',
      generated: 'Captured when this post was generated',
    },

    /**
     * What a note's type is called on screen. The API sends `draft_thesis`,
     * never a label, and `noteTypeKey` maps a type the server grew without
     * us onto `note` rather than leaking a snake_case identifier.
     */
    type: {
      note: 'Note',
      draftThesis: 'Draft thesis',
      imagePrompt: 'Image prompt',
    },
  },
}
