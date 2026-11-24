export const assistant = {
  /**
   * The badge beside the panel's close button: every thread open in the
   * rail. *Pending* — the ones with an answer the user hasn't seen — is the
   * badge's dot, and this is its accessible name and tooltip. A thread that
   * is *working* is not counted, because the mark's animation already says so.
   */
  threadCount_one: '{{formatted}} thread',
  threadCount_other: '{{formatted}} threads',
  pendingThreads_one: '{{formatted}} pending',
  pendingThreads_other: '{{formatted}} pending',

  /**
   * What a thread is called when its subject has no name yet — the assistant
   * names threads after what they are attached to, and an unnamed post is
   * ordinary while it is being drafted.
   */
  untitledCampaign: 'Untitled campaign',
  untitledPost: 'Untitled post',
  /** The thread every workspace-level screen talks to (CON-450). */
  workspaceThread: 'Workspace',

  /**
   * Fired when a turn ends while the user is somewhere else. The dot on the
   * trigger says a thread is waiting; this says which one, once, at the
   * moment it happens — threads run on across navigation, so without it the
   * only report of a finished run is a mark in the corner.
   */
  finished: 'The strategist finished',
  failed: 'The strategist could not finish',

  panel: {
    title: 'Content Strategist',
    /** Over the starters in a thread already going. */
    onThisScreen: 'On this screen',
    /** The title block's label inside a thread, where it leads back out. */
    back: 'Back to all conversations',
    placeholderCampaign: 'Ask for a plan or a review...',
    placeholderPost: 'Ask for a change to this post...',
    placeholderWorkspace: 'Ask for anything on this screen...',
  },

  /**
   * Each screen the assistant can be asked from, as the view context names
   * it with its dots turned to underscores. A detail screen is "an asset",
   * not the asset's title, which the client doesn't hold here.
   */
  screen: {
    home: 'Home',
    ideas: 'Ideas',
    assets: 'Assets',
    asset: 'an asset',
    analytics: 'Analytics',
    analytics_post: 'a post’s numbers',
    calendar: 'Calendar',
    campaigns: 'Campaigns',
    tasks: 'Tasks',
    activity: 'Activity',
    settings: 'Settings',
    profile: 'Profile',
    post: 'a post',
    foundation: 'Foundation',
    foundation_voices: 'Voices',
    foundation_voice: 'a voice',
    foundation_audiences: 'Audiences',
    foundation_audience: 'an audience',
    foundation_facts: 'Facts',
    foundation_guardrails: 'Guardrails',
    foundation_look: 'Look',
    foundation_questions: 'Questions',
    foundation_series: 'Series',
    foundation_series_item: 'a series',
    foundation_templates: 'Templates',
    campaign_overview: 'Overview',
    campaign_strategy: 'Strategy',
    campaign_list: 'Posts',
    campaign_ideas: 'Ideas',
    campaign_assets: 'Assets',
    campaign_asset: 'an asset',
    campaign_analytics: 'Analytics',
    campaign_calendar: 'Calendar',
    campaign_activity: 'Activity',
    campaign_settings: 'Settings',
  },

  /**
   * The composer's chip: what goes with the next message. Dismissing it
   * sends that message with the screen alone.
   */
  chip: {
    selected_one: '{{formatted}} selected · {{screen}}',
    selected_other: '{{formatted}} selected · {{screen}}',
    selectedPosts_one: '{{formatted}} post selected · {{screen}}',
    selectedPosts_other: '{{formatted}} posts selected · {{screen}}',
    selectedCapped: 'First {{limit}} of {{total}} selected · {{screen}}',
    matching_one: 'All {{formatted}} matching · {{screen}}',
    matching_other: 'All {{formatted}} matching · {{screen}}',
    focusIdea: 'This idea is open',
    /** Ticks on the calendar that share a day, and ticks across its days. */
    postsOnDay_one: '{{formatted}} post on {{day}}',
    postsOnDay_other: '{{formatted}} posts on {{day}}',
    postsInWindow_one: '{{formatted}} post · {{window}}',
    postsInWindow_other: '{{formatted}} posts · {{window}}',
    focusAsset: 'This asset is open',
    /** The open asset by name, once its screen has loaded it. */
    focusNamed: '{{title}} · open',
    focusVoice: 'This voice is open',
    focusAudience: 'This audience is open',
    focusSeries: 'This series is open',
    focusPost: 'This post is open',
    helper: 'The assistant sees this with your message',
    dismiss: 'Send without this',
  },

  /**
   * The quiet line a thread draws where the screen changed between turns,
   * written from each turn's stored view context so it replays in history.
   */
  marker: {
    on: 'On {{screen}}',
    onSelected_one: 'On {{screen}} · {{formatted}} selected',
    onSelected_other: 'On {{screen}} · {{formatted}} selected',
    onMatching_one: 'On {{screen}} · all {{formatted}} matching',
    onMatching_other: 'On {{screen}} · all {{formatted}} matching',
    now: 'Now on {{screen}}',
    nowSelected_one: 'Now on {{screen}} · {{formatted}} selected',
    nowSelected_other: 'Now on {{screen}} · {{formatted}} selected',
    nowMatching_one: 'Now on {{screen}} · all {{formatted}} matching',
    nowMatching_other: 'Now on {{screen}} · all {{formatted}} matching',
    /** The open item, or the list's size: "On Assets · Villa Aurora brochure". */
    onItem: 'On {{screen}} · {{item}}',
    nowItem: 'Now on {{screen}} · {{item}}',
    documents_one: '{{formatted}} document',
    documents_other: '{{formatted}} documents',
    /** The place a Foundation library is, and a calendar with its days. */
    foundationPlace: 'Foundation · {{screen}}',
    windowPlace: '{{screen}} · {{window}}',
  },

  /** A count of one kind of thing: the chip's and the rail's selections. */
  kindCount: {
    idea_one: '{{formatted}} idea',
    idea_other: '{{formatted}} ideas',
    asset_one: '{{formatted}} asset',
    asset_other: '{{formatted}} assets',
    post_one: '{{formatted}} post',
    post_other: '{{formatted}} posts',
    campaign_one: '{{formatted}} campaign',
    campaign_other: '{{formatted}} campaigns',
    voice_one: '{{formatted}} voice',
    voice_other: '{{formatted}} voices',
    audience_one: '{{formatted}} audience',
    audience_other: '{{formatted}} audiences',
    fact_one: '{{formatted}} fact',
    fact_other: '{{formatted}} facts',
    series_one: '{{formatted}} series',
    series_other: '{{formatted}} series',
  },

  composer: {
    placeholder: 'Write a message...',
    suggestions: 'Suggestions',
    showActions: 'Show actions',
    input: 'Message the assistant',
    stop: 'Stop the assistant',
    send: 'Send message',
  },

  /** A long instruction folds after five lines. */
  userMessage: {
    showAll: 'Show all',
    showLess: 'Show less',
  },

  /**
   * The thinking timeline's header. The elapsed time is the label while the
   * turn runs and part of the label once it ends.
   */
  timeline: {
    thinking: 'Thinking… {{duration}}',
    thought: 'Worked for {{duration}}',
  },

  /**
   * Steps the client opens itself, rather than the tools the backend
   * reports. `generated` is the running count a generation step carries.
   */
  step: {
    plan: 'Analyzing the request',
    compose: 'Writing the post',
    done_one: '{{formatted}} done',
    done_other: '{{formatted}} done',
    generated_one: '{{formatted}} generated',
    generated_other: '{{formatted}} generated',
    failed: 'didn’t go through',
  },

  /** A sub-flow's stage that has just finished, beside its step. */
  progress: {
    validateInput: 'request checked',
    resolveAssets: 'documents gathered',
    resolvePlatforms: 'platforms resolved',
    resolveTargets: 'targets resolved',
    generatePosts: 'content generated',
    generate: 'draft written',
    validateOutput: 'output checked',
    persistIdeas: 'ideas saved',
    buildContext: 'context gathered',
  },

  /**
   * Each tool in two tenses: while it runs, and once it has. The mutating
   * campaign tools write as they run, so their past tense states a fact.
   * A tool this build has no entry for shows its raw name.
   */
  tool: {
    listAssets: {
      running: 'Listing attached assets',
      done: 'Listed attached assets',
    },
    getAssetChunks: {
      running: 'Reading {{target}}',
      done: 'Read {{target}}',
    },
    searchAssetChunks: {
      running: 'Searching {{asset}} for {{query}}',
      done: 'Searched {{asset}} for {{query}}',
    },
    getCurrentContent: {
      running: 'Re-reading the current post',
      done: 'Re-read the current post',
    },
    runContentPlan: {
      running: 'Generating a content plan',
      done: 'Generated a content plan',
    },
    generatePosts: {
      running: 'Adding posts',
      done: 'Added posts',
    },
    generatePostsFor: {
      running: 'Adding posts for {{platform}}',
      done: 'Added posts for {{platform}}',
    },
    enrichBrief: {
      running: 'Improving the brief',
      done: 'Improved the brief',
    },
    setCampaignDates: {
      running: 'Updating the campaign dates',
      done: 'Updated the campaign dates',
    },
    redistributePosts: {
      running: 'Redistributing posts across the timeline',
      done: 'Redistributed posts across the timeline',
    },
    checkBrief: {
      running: 'Reviewing the brief',
      done: 'Reviewed the brief',
    },
    checkPostsConsistency: {
      running: 'Checking posts against the brief',
      done: 'Checked posts against the brief',
    },
    getCampaignOverview: {
      running: 'Building the campaign overview',
      done: 'Built the campaign overview',
    },
    listCampaignPosts: {
      running: 'Reading the campaign posts',
      done: 'Read the campaign posts',
    },
    findIdeas: {
      running: 'Finding ideas',
      done: 'Found ideas',
    },
    findDuplicateIdeas: {
      running: 'Looking for near-duplicates',
      done: 'Looked for near-duplicates',
    },
    setIdeaVerdict: {
      running: 'Answering an idea',
      done: 'Answered an idea',
    },
    setIdeaVerdicts: {
      running: 'Answering ideas',
      done: 'Answered ideas',
    },
    compileIdeas: {
      running: 'Compiling ideas into a post',
      done: 'Compiled ideas into a post',
    },
    draftIdeas: {
      running: 'Writing drafts from ideas',
      runningCount_one: 'Writing {{formatted}} draft',
      runningCount_other: 'Writing {{formatted}} drafts',
      done: 'Wrote drafts from ideas',
    },
    moveIdeas: {
      running: 'Moving ideas',
      done: 'Moved ideas',
    },
    deleteIdeas: {
      running: 'Deleting ideas',
      done: 'Deleted ideas',
    },
    mergeIdeas: {
      running: 'Merging ideas',
      done: 'Merged ideas',
    },
    findAssets: {
      running: 'Finding assets',
      done: 'Found assets',
    },
    askAssets: {
      running: 'Reading the assets',
      done: 'Read the assets',
      /** `passages` is `count.passages`: "3 passages". */
      doneIn: 'Searched {{subject}} · {{passages}}',
      doneCount: 'Searched the assets · {{passages}}',
    },
    analyseAsset: {
      running: 'Analysing an asset',
      done: 'Analysed an asset',
    },
    readAnalysis: {
      running: 'Reading the analysis',
      done: 'Read the analysis',
      doneWorkspace: 'Read the analysis · workspace lens',
      doneCampaign: 'Read the analysis · {{campaign}}’s lens',
    },
    compareAssets: {
      running: 'Comparing the assets',
      done: 'Compared the assets',
      /** `what` joins `count.analyses` and `count.passages`. */
      doneRead: 'Read {{what}}',
    },
    createCampaignFromAssets: {
      running: 'Setting up the campaign',
      done: 'Set up the campaign',
      doneNamed: 'Created {{campaign}}',
      doneSources_one: 'Created {{campaign}} · attached {{formatted}} source',
      doneSources_other:
        'Created {{campaign}} · attached {{formatted}} sources',
    },
    readAssetsState: {
      running: 'Reading the bank’s state',
      done: 'Read the bank’s state',
    },
    /** The amounts a step's detail carries, inside the sentences above. */
    count: {
      passages_one: '{{formatted}} passage',
      passages_other: '{{formatted}} passages',
      analyses_one: '{{formatted}} analysis',
      analyses_other: '{{formatted}} analyses',
    },
    addVoice: {
      running: 'Adding a voice',
      done: 'Added a voice',
    },
    updateVoice: {
      running: 'Updating the voice',
      done: 'Updated the voice',
    },
    removeVoice: {
      running: 'Removing the voice',
      done: 'Removed the voice',
    },
    addAudience: {
      running: 'Adding an audience',
      done: 'Added an audience',
    },
    updateAudience: {
      running: 'Updating the audience',
      done: 'Updated the audience',
    },
    removeAudience: {
      running: 'Removing the audience',
      done: 'Removed the audience',
    },
    updateGuardrails: {
      running: 'Updating the guardrails',
      done: 'Updated the guardrails',
    },
    renewFact: {
      running: 'Renewing the fact',
      done: 'Renewed the fact',
    },
    editBrand: {
      running: 'Changing the brand',
      done: 'Changed the brand',
    },
    startBrandDistill: {
      running: 'Starting a brand read',
      done: 'Started a brand read',
    },
    getBrandDistill: {
      running: 'Checking the brand read',
      done: 'Checked the brand read',
    },
    answerDistillQuestions: {
      running: 'Answering the read’s questions',
      done: 'Answered the read’s questions',
    },
    commitBrandDistill: {
      running: 'Saving the brand read',
      done: 'Saved the brand read',
    },
    listSeries: {
      running: 'Looking up the series',
      done: 'Looked up the series',
    },
    createSeries: {
      running: 'Making a series',
      done: 'Made a series',
    },
    updateSeries: {
      running: 'Updating the series',
      done: 'Updated the series',
    },
    removeSeries: {
      running: 'Removing the series',
      done: 'Removed the series',
    },
    runSeries: {
      running: 'Running the series in the campaign',
      done: 'Ran the series in the campaign',
    },
    stopSeries: {
      running: 'Stopping the series in the campaign',
      done: 'Stopped the series in the campaign',
    },
    checkBrand: {
      running: 'Checking the posts against the brand',
      done: 'Checked the posts against the brand',
    },
    revisePost: {
      running: 'Rewriting the post',
      done: 'Rewrote the post',
    },
    setPostVoice: {
      running: 'Changing the post’s voice',
      done: 'Changed the post’s voice',
    },
    listSavedViews: {
      running: 'Looking up the smart groups',
      done: 'Looked up the smart groups',
    },
    distillMoreIdeas: {
      running: 'Distilling ideas',
      done: 'Distilled ideas',
    },
    importPage: {
      running: 'Reading a web page',
      done: 'Read a web page',
    },
    tagAssets: {
      running: 'Tagging assets',
      done: 'Tagged assets',
    },
    attachAssets: {
      running: 'Attaching assets',
      done: 'Attached assets',
    },
    checkCalendar: {
      running: 'Checking the calendar',
      done: 'Checked the calendar',
    },
    optimiseCalendar: {
      running: 'Planning a better calendar',
      done: 'Planned a better calendar',
    },
    applyCalendarMoves: {
      running: 'Moving posts',
      done: 'Moved posts',
    },
    reviewCampaign: {
      running: 'Reviewing the campaign',
      done: 'Reviewed the campaign',
    },
    analyticsOverview: {
      running: 'Reading the numbers',
      done: 'Read the numbers',
    },
    topPosts: {
      running: 'Ranking the posts',
      done: 'Ranked the posts',
    },
    analyticsLessons: {
      running: 'Reading what worked',
      done: 'Read what worked',
    },
    postStats: {
      running: 'Reading a post’s numbers',
      done: 'Read a post’s numbers',
    },
    moreLikeThese: {
      running: 'Planning more like these',
      done: 'Planned more like these',
    },
    getBrand: {
      running: 'Reading the foundation',
      done: 'Read the foundation',
    },
    addFact: {
      running: 'Adding a fact',
      done: 'Added a fact',
    },
    updateFact: {
      running: 'Updating a fact',
      done: 'Updated a fact',
    },
    removeFact: {
      running: 'Retiring a fact',
      done: 'Retired a fact',
    },
    activityReport: {
      running: 'Reading the activity',
      done: 'Read the activity',
      doneFor: 'Read the activity for {{period}}',
    },
    workspaceSetup: {
      running: 'Checking the workspace setup',
      done: 'Checked the workspace setup',
    },
    weeklyDigest: {
      running: 'Reading the weekly report',
      done: 'Read the weekly report',
      doneFor: 'Read the week of {{week}}',
    },
    emailWeeklyDigest: {
      running: 'Emailing the weekly report',
      done: 'Emailed the weekly report',
      doneFor: 'Emailed the week of {{week}}',
    },
    postHistory: {
      running: 'Reading the post’s history',
      done: 'Read the post’s history',
      doneFor: 'Read the history of {{post}}',
    },
    setAutoPublish: {
      running: 'Changing auto-publish',
      done: 'Changed auto-publish',
      doneFor: 'Changed auto-publish for {{platform}}',
    },
    navigate: {
      running: 'Opening a screen',
      done: 'Opened a screen',
    },
    setFilter: {
      running: 'Setting a filter',
      done: 'Set a filter',
    },
    select: {
      running: 'Selecting',
      done: 'Selected',
    },
    openSavedView: {
      running: 'Opening a smart group',
      done: 'Opened a smart group',
    },
    getSelection: {
      running: 'Reading the selection',
      done: 'Read the selection',
    },
    getFocus: {
      running: 'Reading what is open',
      done: 'Read what is open',
    },
    loadPack: {
      running: 'Reaching for more tools',
      done: 'Reached for more tools',
    },
    confirmOffer: {
      running: 'Running the offer',
      done: 'Ran the offer',
    },
    dismissOffer: {
      running: 'Dismissing the offer',
      done: 'Dismissed the offer',
    },
    updateCampaignPlatforms: {
      running: 'Updating the platforms',
      done: 'Updated the platforms',
    },
    draftPost: {
      running: 'Writing drafts',
      done: 'Wrote drafts',
    },
    editPost: {
      running: 'Editing the post',
      done: 'Edited the post',
    },
    clonePost: {
      running: 'Cloning the post',
      done: 'Cloned the post',
    },
    restoreVersion: {
      running: 'Restoring a version',
      done: 'Restored a version',
    },
    createNote: {
      running: 'Writing a note',
      done: 'Wrote a note',
    },
    schedulePost: {
      running: 'Scheduling the post',
      done: 'Scheduled the post',
    },
    askCampaignAssets: {
      running: 'Reading the campaign’s assets',
      done: 'Read the campaign’s assets',
    },
    getCampaignBrief: {
      running: 'Reading the campaign brief',
      done: 'Read the campaign brief',
    },
  },

  /** The nouns the tool labels name what they are reading with. */
  toolTarget: {
    anAsset: 'an asset',
    asset: 'asset {{id}}',
    allOf: 'all of {{asset}}',
    chunks_one: '{{formatted}} chunk of {{asset}}',
    chunks_other: '{{formatted}} chunks of {{asset}}',
    anyContent: 'content',
    query: '“{{query}}”',
  },

  /**
   * What an unused thread says for itself: three things the assistant can
   * do here, one per line, above the starters that do them.
   */
  empty: {
    campaign1: 'Plan the campaign and fill it with posts.',
    campaign2: 'Sharpen the brief. Move the schedule.',
    campaign3: 'Review what is here and flag the drift.',
    post1: 'Rewrite the post, or just its opening.',
    post2: 'Shift the tone, the length, the ending.',
    post3: 'Work in anything from the assets.',
    workspace1: 'Find and sort ideas. Ask your assets.',
    workspace2: 'Explain what worked, and make more of it.',
    workspace3: 'Say what happened while you were away.',
    /** On the Assets list, where the chips lead with what is waiting. */
    assets:
      'Ask about the documents on this screen, or start where the bank needs you.',
  },

  /**
   * A starter prefills the composer and never sends, so `text` is a draft
   * the user edits: it is written as the user would say it.
   */
  starter: {
    contentPlan: {
      label: 'Generate a content plan',
      text: 'Generate a content plan for this campaign.',
    },
    addPosts: {
      label: 'Add a few posts',
      text: 'Add a few Threads posts in the current phase for the upcoming weeks.',
    },
    improveBrief: {
      label: 'Improve the brief',
      text: 'Improve the campaign brief — make the tone more technical and benchmark-driven.',
    },
    reviewBrief: {
      label: 'Review consistency',
      text: 'Is the brief consistent? Review it and suggest improvements.',
    },
    moveEnd: {
      label: 'Move the end date',
      text: 'Move the campaign end to the beginning of next month.',
    },
    redistribute: {
      label: 'Redistribute drafts',
      text: 'Redistribute the drafts and unpublished posts across the campaign timeline.',
    },
    overview: {
      label: 'Quick overview',
      text: 'Give me a quick overview of this campaign and how the content is distributed.',
    },
    checkPosts: {
      label: 'Check posts vs brief',
      text: 'Do the posts follow the brief? Flag any that drift.',
    },
    tightenOpening: {
      label: 'Tighten the opening',
      text: 'Tighten the opening — one claim, no throat-clearing.',
    },
    changeTone: {
      label: 'Change the tone',
      text: 'Rewrite this in a plainer, more direct tone.',
    },
    shorter: {
      label: 'Make it shorter',
      text: 'Cut this down to about half its length without losing the argument.',
    },
    useAsset: {
      label: 'Work in an asset',
      text: 'Work the key numbers from the attached assets into this post.',
    },
    callToAction: {
      label: 'Add a call to action',
      text: 'End this with a call to action that matches the campaign brief.',
    },
    missing: {
      label: 'What’s missing?',
      text: 'What’s missing from this post before it goes out?',
    },
    yesterday: {
      label: 'What happened yesterday?',
      text: 'What happened in the workspace yesterday?',
    },
    waitingIdeas: {
      label: 'Ideas waiting on me',
      text: 'Which ideas are still waiting for a decision?',
    },
    whatWorked: {
      label: 'What worked?',
      text: 'What worked best over the last 30 days?',
    },
    findIdeas: {
      label: 'Find ideas about…',
      text: 'Find the ideas about ',
    },
    mergeDuplicates: {
      label: 'Find duplicates',
      text: 'Are any of these ideas saying the same thing?',
    },
    draftSelected: {
      label: 'Draft the selected',
      text: 'Draft the selected ideas for ',
    },
    compileSelected: {
      label: 'Compile into one post',
      text: 'Compile the selected ideas into one planned post.',
    },
    whatShare: {
      label: 'What do these share?',
      text: 'What do these have in common?',
    },
    findSimilar: {
      label: 'Find similar ideas',
      text: 'Find ideas like this one.',
    },
    triageUndecided: {
      label: 'Triage the undecided',
      text: 'Go through the undecided ideas with me.',
    },
    whyFits: {
      label: 'Why does this fit?',
      text: 'Why does this idea fit?',
    },
    similarIdeas: {
      label: 'Similar ideas',
      text: 'Anything similar to this idea?',
    },
    draftIt: {
      label: 'Draft it',
      text: 'Draft this idea for ',
    },
    findDocuments: {
      label: 'Find documents about…',
      text: 'Find documents about ',
    },
    analyseWaiting: {
      label_one: 'Analyse the new one',
      label_other: 'Analyse the {{formatted}} new',
      text: 'Analyse the documents that haven’t been analysed yet.',
    },
    retryFailed: {
      label_one: 'Retry the failed one',
      label_other: 'Retry {{formatted}} failed',
      text: 'Retry the analyses that failed.',
    },
    triageIdeas: {
      label_one: 'Triage 1 idea',
      label_other: 'Triage {{formatted}} ideas',
      text: 'Which of the undecided ideas from these documents are worth keeping?',
    },
    smartGroups: {
      label: 'Open a smart group',
      text: 'Which smart groups do we have?',
    },
    compareSelected: {
      label: 'Compare these',
      text: 'Compare the selected assets.',
    },
    campaignFromSelected: {
      label: 'Campaign from these',
      text: 'Set up a campaign from the selected assets.',
    },
    whatAnalysisFound: {
      label: 'What the analysis found',
      text: 'What did the analysis find?',
    },
    readBrand: {
      label: 'Read the brand',
      text: 'Read our brand from our website: ',
    },
    whichVoice: {
      label: 'Which voice for what?',
      text: 'When should we use each of our voices?',
    },
    summariseVoice: {
      label: 'Summarise this voice',
      text: 'Summarise this voice.',
    },
    checkAgainstVoice: {
      label: 'Check posts against it',
      text: 'Check the scheduled posts against this voice and our guardrails.',
    },
    expiredFacts: {
      label: 'Which facts expired?',
      text: 'Which facts have expired?',
    },
    ourSeries: {
      label: 'Our series',
      text: 'What series do we have?',
    },
    makeSeries: {
      label: 'Make a series',
      text: 'Make a new series: ',
    },
    storyTemplates: {
      label: 'Templates for stories',
      text: 'Which templates fit Instagram stories?',
    },
    ourPalette: {
      label: 'Our palette',
      text: 'What’s our palette?',
    },
    onlyDrafts: {
      label: 'Only the drafts',
      text: 'Show only the drafts.',
    },
    moveThese: {
      label: 'Move these',
      text: 'Move the selected posts to ',
    },
    askAboutThese: {
      label: 'Ask about these',
      text: 'Tell me about the selected ones.',
    },
    checkBrandSelected: {
      label: 'Check against the brand',
      text: 'Check the selected posts against our voice and guardrails.',
    },
    summariseSelected: {
      label: 'Summarise them',
      text: 'Summarise the selected assets.',
    },
    planFromSelected: {
      label: 'Plan from only these',
      text: 'Plan the campaign from only these assets.',
    },
    tagSelected: {
      label: 'Tag them',
      text: 'Tag the selected assets as ',
    },
    summariseIt: {
      label: 'Summarise it',
      text: 'Summarise this asset.',
    },
    askTheAsset: {
      label: 'Ask the asset',
      text: 'What does it say about ',
    },
    ideasFromThis: {
      label: 'Ideas from this',
      text: 'Distill ideas from this asset.',
    },
    tagIt: {
      label: 'Tag it',
      text: 'Tag this asset as ',
    },
    readBrandFromThese: {
      label: 'Read our brand from these',
      text: 'Read our brand from the selected documents.',
    },
    lessFormal: {
      label: 'Make it less formal',
      text: 'Make this voice less formal.',
    },
    readBrandAgain: {
      label: 'Read the brand again',
      text: 'Read our brand again from ',
    },
    checkAgainstThese: {
      label: 'Check posts against these',
      text: 'Check the scheduled posts against our guardrails.',
    },
    addBannedWord: {
      label: 'Add a banned word',
      text: 'We never say ',
    },
    renewFact: {
      label: 'Renew a fact',
      text: 'Renew the fact ',
    },
    addFact: {
      label: 'Add a fact',
      text: 'Add a fact: ',
    },
    runInCampaign: {
      label: 'Run one in a campaign',
      text: 'Run the series ',
    },
    whichTemplate: {
      label: 'Which template fits…',
      text: 'Which template fits ',
    },
    whyTopPost: {
      label: 'Why did the top post work?',
      text: 'Why did the top post do so well?',
    },
    compareMonth: {
      label: 'Compare to last month',
      text: 'How does this period compare with the one before?',
    },
    moreLikeThese: {
      label: 'More like these',
      text: 'Make more like these.',
    },
    whySelected: {
      label: 'Why did these work?',
      text: 'Why did the selected posts do well?',
    },
    checkWeek: {
      label: 'Anything wrong this week?',
      text: 'Anything wrong with this week?',
    },
    optimise: {
      label: 'Optimise the calendar',
      text: 'Optimise the calendar.',
    },
    stanceOn: {
      label: 'What’s our stance on…',
      text: 'What’s our stance on ',
    },
    factsStale: {
      label: 'Facts going stale',
      text: 'Which facts go out of date this month?',
    },
    checkGuardrails: {
      label: 'Check against guardrails',
      text: 'Do the scheduled posts respect our guardrails?',
    },
    lastWeek: {
      label: 'What happened last week?',
      text: 'What happened last week?',
    },
    weeklyReport: {
      label: 'Show the weekly report',
      text: 'Show me last week’s report.',
    },
    failing: {
      label: 'Anything failing?',
      text: 'Is anything failing to go out?',
    },
    thisWeek: {
      label: 'This week so far',
      text: 'What has happened this week so far?',
    },
    autoPublish: {
      label: 'Which platforms publish on their own?',
      text: 'Which platforms publish on their own?',
    },
    connections: {
      label: 'Are my accounts healthy?',
      text: 'Are my accounts healthy?',
    },
  },

  /**
   * The one-line footer under a reply when no result card says it better —
   * in practice, turns restored from history.
   */
  footer: {
    edited: 'Post updated',
    declined: 'No changes made',
    noted: 'Note added',
    content_plan_generated: 'Content plan generated',
    posts_generated: 'Posts added',
    brief_enriched: 'Brief updated',
    dates_updated: 'Campaign dates updated',
    posts_redistributed: 'Posts redistributed',
    brief_reviewed: 'Brief reviewed',
    posts_reviewed: 'Posts reviewed',
    proposed: 'Waiting for your go-ahead',
    post_drafted: 'Drafts written',
    platforms_updated: 'Platforms updated',
    goal_updated: 'Post goal raised',
    cloned: 'Post cloned',
    restored: 'Version restored',
    scheduled: 'Post scheduled',
    versionSaved: 'Version saved',
  },

  reply: {
    openClone: 'Open the clone',
    /** A turn that finished with nothing to say. */
    done: 'Done.',
    /** A post turn writes once, at the end, so stopping it undoes nothing. */
    cancelledPost: 'Cancelled.',
    /** Campaign flows persist as they go; a stop is not a rollback. */
    cancelledCampaign:
      'Stopped. Anything already written to the campaign was kept.',
    failed: 'The assistant failed',
  },

  /** Every open thread, in the rail's list. */
  /** The assets pack's results (CON-460). */
  assets: {
    /** A page imported as a source (CON-484). */
    import: {
      importing: 'IMPORTING',
      imported: 'IMPORTED',
      reading: 'reading the page',
      webPage: 'web page',
    },
    /** distillMoreIdeas: queued, so its ideas aren't known yet (CON-484). */
    distill: {
      word: 'IDEAS',
      queued: 'More ideas on the way',
      notQueued: 'No more ideas were asked for',
      meta: 'saved to Ideas as they’re found',
      open: 'Open ideas',
    },
    /** The bank's state a turn read (`readAssetsState`, CON-476). */
    state: {
      word: 'Assets · now',
      title_one: '{{formatted}} document',
      title_other: '{{formatted}} documents',
      analysed_one: '{{formatted}} analysed',
      analysed_other: '{{formatted}} analysed',
      waiting_one: '{{formatted}} not analysed yet',
      waiting_other: '{{formatted}} not analysed yet',
      failed_one: '{{formatted}} analysis failed',
      failed_other: '{{formatted}} analyses failed',
      undecided_one: '{{formatted}} idea undecided',
      undecided_other: '{{formatted}} ideas undecided',
      /** One lens's undecided ideas: "Workspace lens 29". */
      lensIdeas: '{{lens}} {{ideas}}',
      /** The first few by name, then how many more. */
      namesAndMore_one: '{{names}} and {{formatted}} more',
      namesAndMore_other: '{{names}} and {{formatted}} more',
      analyse: 'Analyse',
      retry: 'Retry',
      triage: 'Triage',
    },
    ask: {
      /** A cited passage from one of several assets. */
      chip: '{{title}} · {{pages}}',
      onlyThis: 'Only this asset.',
      searchAll: 'Search all assets',
      searchAllPrompt: 'Search all the assets for that, not only this one.',
    },
    lens: {
      workspace: 'Workspace lens',
      campaign: '{{name}}’s lens',
      /** Who a lens reads for, in "Read for the workspace on 2 Nov". */
      theWorkspace: 'the workspace',
    },
    analysis: {
      word: {
        ready: 'Analysed',
        pending: 'Waiting to be read',
        running: 'Being read',
        failed: 'Couldn’t be read',
        skipped: 'Skipped for this lens',
        notRead: 'Not read for this lens',
      },
      /** The status word with its lens: "Analysed · Workspace lens". */
      wordLens: '{{word}} · {{lens}}',
      ideas_one: '{{formatted}} idea distilled',
      ideas_other: '{{formatted}} ideas distilled',
      /** The piles, in the Ideas list's own words. */
      pile: {
        waiting_one: '{{formatted}} on the desk',
        waiting_other: '{{formatted}} on the desk',
        yes_one: '{{formatted}} making',
        yes_other: '{{formatted}} making',
        later_one: '{{formatted}} in the drawer',
        later_other: '{{formatted}} in the drawer',
        no_one: '{{formatted}} set aside',
        no_other: '{{formatted}} set aside',
      },
      /** Another lens's row: "4 ideas · read 7 Nov". */
      lensIdeas_one: '{{formatted}} idea',
      lensIdeas_other: '{{formatted}} ideas',
      readOn: 'read {{date}}',
      openIdeas: 'Open ideas',
      notReadFor: '{{lens}} hasn’t read it',
      /** Where another lens has: "Read for the workspace on 2 Nov". */
      readFor: 'Read for {{owner}}',
      readForOn: 'Read for {{owner}} on {{date}}',
      showThat: 'Show that',
      analyseFor: 'Analyse for {{owner}}',
      analysePrompt: 'Analyse it for the {{lens}}.',
      show: 'Show',
      showPrompt: 'What did the analysis find for the {{lens}}?',
      readFrom: 'Read from',
      analysisOf: 'Analysis of {{title}}',
    },
    compare: {
      wordCompared: 'Compared',
      wordSummarised: 'Summarised',
      title_one: '{{formatted}} document',
      title_other: '{{formatted}} documents',
      /** A claim's label, counted by the documents behind it. */
      shared_one: 'All {{formatted}}',
      shared_other: 'All {{formatted}}',
      partial_one: 'Only {{formatted}}',
      partial_other: 'Only {{formatted}}',
      conflicts: 'They disagree',
      askWhich: 'Ask which',
      askWhichPrompt: 'Which is right: {{claim}}?',
      fromPassages_one:
        '{{titles}} isn’t analysed for this lens, so it was read from its passages.',
      fromPassages_other:
        '{{titles}} aren’t analysed for this lens, so they were read from their passages.',
      skipped_one: '{{titles}} had nothing to read.',
      skipped_other: '{{titles}} had nothing to read.',
      missing_one:
        '{{formatted}} of the selected wasn’t found, and was left out.',
      missing_other:
        '{{formatted}} of the selected weren’t found, and were left out.',
    },
    views: {
      word: 'Smart groups',
      title_one: '{{formatted}} on {{list}}',
      title_other: '{{formatted}} on {{list}}',
      none: 'No smart groups on {{list}} yet',
      /** A group's filter as one line; `clauses` is the list's own sentence. */
      sentenceAssets: 'Documents {{clauses}}',
      sentenceIdeas: 'Ideas {{clauses}}',
      /** When the clauses open on what is listed: "PDFs, in Spring reopening". */
      sentenceSubject: '{{clauses}}',
      countAssets_one: '{{formatted}} document',
      countAssets_other: '{{formatted}} documents',
      countIdeas_one: '{{formatted}} idea',
      countIdeas_other: '{{formatted}} ideas',
      /** Inside a campaign: smart groups are the workspace's. */
      workspaceOnly:
        'Smart groups open on the workspace’s {{list}}, outside this campaign.',
      open: 'Open',
    },
    campaign: {
      sources_one: '{{formatted}} source attached',
      sources_other: '{{formatted}} sources attached',
      sourcesNote:
        'The documents stay in the bank; the campaign points at them.',
      open: 'Open',
    },
  },

  /** The brand tools' results (CON-461). */
  foundation: {
    word: {
      added: 'Added',
      removed: 'Removed',
      renewed: 'Renewed',
    },
    /** An update's rows (CON-477): one per field, worded here. */
    change: {
      /** A list's lines added and taken out: "+ luxury". */
      added: '+ {{lines}}',
      removed: '− {{lines}}',
      cleared: 'cleared',
      none: 'Nothing changed',
    },
    field: {
      name: 'Name',
      whenToUse: 'When to use',
      isDefault: 'Default',
      formality: 'Formality',
      person: 'Person',
      length: 'Length',
      emoji: 'Emoji',
      hashtags: 'Hashtags',
      opening: 'Opening',
      closing: 'Closing',
      samples: 'Samples',
      who: 'Who they are',
      readsOn: 'Reads on',
      scrollsPastWhen: 'Scrolls past when',
      believesWhen: 'Believes when',
      mayClaim: 'May claim',
      neverClaim: 'Never claim',
      bannedWords: 'Banned words',
      disclaimer: 'Disclaimer',
      /** A voice's note for one network: "Instagram note". */
      channelNote: '{{channel}} note',
    },
    noun: {
      voice: 'voice',
      audience: 'audience',
      series: 'series',
    },
    open: 'Open',
    unbound_one: 'Taken off {{formatted}} campaign or post that used it',
    unbound_other: 'Taken off {{formatted}} campaigns and posts that used it',
    voice: {
      default: 'The default voice',
      notDefault: 'Not the default',
      noRules: 'No rules set yet',
    },
    audience: {
      readsOn: 'Reads on {{where}}',
    },
    guardrails: {
      title: 'Guardrails',
    },
    fact: {
      expires: 'Expires {{date}}',
      noExpiry: 'Doesn’t expire',
    },
    bulk: {
      title_one: '{{formatted}} change',
      title_other: '{{formatted}} changes',
      failed: 'Couldn’t {{what}}: {{reason}}',
      undoChanged_one:
        '{{formatted}} change couldn’t be undone: it was changed again since.',
      undoChanged_other:
        '{{formatted}} changes couldn’t be undone: they were changed again since.',
      undoGone_one: '{{formatted}} change can no longer be undone.',
      undoGone_other: '{{formatted}} changes can no longer be undone.',
      /** Some of a bulk change put back, and not all of it. */
      undonePart: '{{undone}} of {{total}} undone',
      /** Facts left alone on purpose; the reasons go under it. */
      kept_one: 'Kept {{formatted}}',
      kept_other: 'Kept {{formatted}}',
      /** What a bulk change made, biggest first: "Removed 6 facts". */
      made: {
        removed: {
          facts_one: 'Removed {{formatted}} fact',
          facts_other: 'Removed {{formatted}} facts',
          voices_one: 'Removed {{formatted}} voice',
          voices_other: 'Removed {{formatted}} voices',
          audiences_one: 'Removed {{formatted}} audience',
          audiences_other: 'Removed {{formatted}} audiences',
        },
        updated: {
          facts_one: 'Updated {{formatted}} fact',
          facts_other: 'Updated {{formatted}} facts',
          voices_one: 'Updated {{formatted}} voice',
          voices_other: 'Updated {{formatted}} voices',
          audiences_one: 'Updated {{formatted}} audience',
          audiences_other: 'Updated {{formatted}} audiences',
        },
        added: {
          facts_one: 'Added {{formatted}} fact',
          facts_other: 'Added {{formatted}} facts',
          voices_one: 'Added {{formatted}} voice',
          voices_other: 'Added {{formatted}} voices',
          audiences_one: 'Added {{formatted}} audience',
          audiences_other: 'Added {{formatted}} audiences',
        },
      },
    },
    facts: {
      word: 'Facts',
      none: 'No facts have expired',
      expired_one: '{{formatted}} expired',
      expired_other: '{{formatted}} expired',
      /** After the headline: "3 expired of 29". */
      ofTotal_one: 'of {{formatted}}',
      ofTotal_other: 'of {{formatted}}',
      expiredOn: 'Expired {{date}}',
      renew: 'Renew',
      edit: 'Edit',
      renewPrompt: 'Renew the fact “{{statement}}” for another season.',
      editPrompt: 'Change the fact “{{statement}}” to ',
    },
    distill: {
      word: {
        reading: 'Reading',
        ready: 'Ready to review',
        failed: 'Couldn’t read',
        committed: 'Saved',
      },
      title: 'Your brand',
      running: 'About two minutes. You can leave this screen.',
      ready: 'Ready for you to review',
      failed: 'The reading couldn’t finish.',
      /** What a read reads, after its title: "3 documents". */
      documents_one: '{{formatted}} document',
      documents_other: '{{formatted}} documents',
      /** An answering round, confirmed from the rail. */
      answered_one: 'Answered {{formatted}} question',
      answered_other: 'Answered {{formatted}} questions',
      answerFrom: '{{answer}}, from {{from}}',
      open: 'Open the read',
      voices_one: '{{formatted}} voice',
      voices_other: '{{formatted}} voices',
      audiences_one: '{{formatted}} audience',
      audiences_other: '{{formatted}} audiences',
      guardrails_one: '{{formatted}} guardrail',
      guardrails_other: '{{formatted}} guardrails',
      facts_one: '{{formatted}} fact',
      facts_other: '{{formatted}} facts',
      questions_one: '{{formatted}} question to answer',
      questions_other: '{{formatted}} questions to answer',
      saved: 'Saved from the reading',
      savedNothing: 'Nothing new to save',
      skipped_one: '{{formatted}} skipped',
      skipped_other: '{{formatted}} skipped',
    },
    series: {
      word: 'Series',
      none: 'No series yet',
      title_one: '{{formatted}} in the library',
      title_other: '{{formatted}} in the library',
      notRunning: 'Not running',
      /** Where a series runs: "In Spring reopening · Once a week". */
      runsIn: 'In {{campaign}} · {{rhythm}}',
      recipe: 'Recipe',
      runsInCampaign: 'Runs in {{campaign}}',
      notRun: 'Made, but not run in the campaign: {{reason}}',
    },
    /** The templates and the look, read on their own screens (CON-477). */
    templates: {
      word: 'Templates',
      none: 'No templates yet',
      title_one: '{{formatted}} template',
      title_other: '{{formatted}} templates',
      default: 'default',
    },
    look: {
      word: 'Look',
      palette: 'Palette',
      noPalette: 'No palette yet',
      typefaces: 'Typefaces',
    },
    /** What a voice summary was read from: "Warm host: rules, 3 samples". */
    voiceRead: {
      line: '{{name}}: {{parts}}',
      rules: 'rules',
      samples_one: '{{formatted}} sample',
      samples_other: '{{formatted}} samples',
      notes_one: '{{formatted}} channel note',
      notes_other: '{{formatted}} channel notes',
    },
    rhythm: {
      occasional: 'Now and then',
    },
    run: {
      running: '{{series}} runs in {{campaign}}',
      stopped: '{{series}} stopped in {{campaign}}',
    },
    check: {
      word: 'Checked',
      none: 'Nothing to look at',
      title_one: '{{formatted}} thing to look at',
      title_other: '{{formatted}} things to look at',
      inPosts_one: 'in {{formatted}} post',
      inPosts_other: 'in {{formatted}} posts',
      othersClean_one:
        'The other {{formatted}} follows the voice and the guardrails.',
      othersClean_other:
        'The other {{formatted}} follow the voice and the guardrails.',
      allClean_one: 'It follows the voice and the guardrails.',
      allClean_other: 'All {{formatted}} follow the voice and the guardrails.',
      /** The sources slot: what the posts were read against. */
      against: 'Checked against',
      againstVoice: '{{name}} voice',
      againstGuardrails: 'Guardrails',
      left_one: '{{formatted}} more post wasn’t read; ask again to check it.',
      left_other:
        '{{formatted}} more posts weren’t read; ask again to check them.',
    },
  },

  list: {
    empty1: 'No conversations yet.',
    empty2: 'Open a campaign or a post to start one.',
    empty3: 'The strategist works on whatever you are in.',
    /** Literal capitals: a tag, not a sentence. */
    current: 'CURRENT',
    /** Literal capitals: the thread's campaign is archived. */
    archived: 'ARCHIVED',
    openCampaign: 'Open the campaign',
    openPost: 'Open the post',
    /** A thread not opened yet: `when` is "5 min ago", `preview` its last message. */
    lastMessage: '{{when}} · {{preview}}',
    justNow: 'just now',
    older: 'Show older conversations',
    loadFailed: 'Couldn’t load the conversations.',
  },

  /**
   * A thread's state in the list: what the assistant did, in the timeline's
   * vocabulary, or what it is doing now.
   */
  status: {
    answered: 'Answered a question',
    declined: 'Declined the request',
    edited: 'Edited the post',
    noted: 'Added a note',
    content_plan_generated: 'Generated a content plan',
    posts_generated: 'Added posts',
    brief_enriched: 'Improved the brief',
    dates_updated: 'Updated the campaign dates',
    posts_redistributed: 'Redistributed posts',
    brief_reviewed: 'Reviewed the brief',
    posts_reviewed: 'Checked posts against the brief',
    proposed: 'Waiting for your go-ahead',
    post_drafted: 'Wrote drafts',
    platforms_updated: 'Updated the platforms',
    goal_updated: 'Raised the post goal',
    cloned: 'Cloned the post',
    restored: 'Restored a version',
    scheduled: 'Scheduled the post',
    waiting: 'Waiting for a reply',
    notStarted: 'Not started yet',
    stopped: 'Stopped',
    failed: 'Failed',
    answeredGeneric: 'Answered',
    workingCampaign: 'Working on the campaign',
    workingPost: 'Working on the post',
    workingWorkspace: 'Working',
    running: '{{step}} · {{elapsed}}',
  },

  /**
   * The status word above a result's headline (CON-451): small capitals,
   * written in literal capitals because they are a label, not a sentence.
   */
  word: {
    done: 'DONE',
    reviewed: 'REVIEWED',
    notApplied: 'NOT APPLIED',
    proposal: 'PROPOSAL',
    choose: 'CHOOSE',
    onScreen: 'ON SCREEN',
  },

  /**
   * What a campaign turn read (CON-483): the one quiet line under a reply
   * that changed nothing, the SOURCES card, and the starters that lead
   * with the numbers. The period's name is the server's ("April").
   */
  campaignState: {
    readFrom: 'Read from the campaign',
    period: '{{period}} {{planned}} of {{target}}',
    conflicts_one: '{{formatted}} conflict',
    conflicts_other: '{{formatted}} conflicts',
    sourcesReady: '{{ready}} of {{attached}} sources ready',
    /** The parts a reply can cite (CON-511): the goal as its rate. */
    goalWeek_one: '{{formatted}} a week',
    goalWeek_other: '{{formatted}} a week',
    goalMonth_one: '{{formatted}} a month',
    goalMonth_other: '{{formatted}} a month',
    posts_one: '{{formatted}} post',
    posts_other: '{{formatted}} posts',
    sources: {
      word: 'SOURCES',
      title: '{{ready}} of {{attached}} ready',
      open: 'Open assets',
      ready: 'ready',
      analysing: 'analysing',
      unreadable: 'couldn’t be read',
    },
    starter: {
      fill: 'Fill {{period}}',
      draft_one: 'Draft {{formatted}} post',
      draft_other: 'Draft {{formatted}} posts',
      calendar_one: 'Fix {{formatted}} calendar problem',
      calendar_other: 'Fix {{formatted}} calendar problems',
      sources_one: '{{formatted}} source not ready',
      sources_other: '{{formatted}} sources not ready',
    },
    /**
     * What a starter sends as the user's message (CON-511), in the user's
     * language — the same request the server's English one makes.
     */
    starterSays: {
      fill_one:
        'Draft {{formatted}} post for {{period}}, the slot left in this goal period.',
      fill_other:
        'Draft {{formatted}} posts for {{period}}, the slots left in this goal period.',
      draft_one: 'Draft {{formatted}} post to reach the campaign’s goal.',
      draft_other: 'Draft {{formatted}} posts to reach the campaign’s goal.',
      calendar: 'Review the campaign’s calendar problems and fix them.',
      sources:
        'Which of the campaign’s sources aren’t ready to write from, and why?',
    },
  },

  /** What a turn did to the screen behind the rail (CON-450, D5). */
  uiAction: {
    navigate: 'Opened {{screen}}',
    setFilter: 'Filtered {{screen}}',
    /** What it filtered to, in grey: "drafts · Instagram". */
    setFilterDetail: 'Filtered {{screen}} <where>{{detail}}</where>',
    clearFilter: 'Cleared the filter on {{screen}}',
    select_one: 'Selected {{formatted}} on {{screen}}',
    select_other: 'Selected {{formatted}} on {{screen}}',
    /** `what` is a `kindCount`: "Selected 2 voices". */
    selectKind: 'Selected {{what}}',
    openSavedView: 'Opened a smart group on {{screen}}',
    /** The group by name; `<where>` is drawn in grey. */
    openSavedViewNamed: 'Opened “{{name}}” <where>on {{screen}}</where>',
    setWindow: '{{screen}} set to {{window}}',
    navigateWindow: 'Opened {{screen}} · {{window}}',
    window: {
      period: 'Period',
      platforms: 'Platforms',
      campaign: 'Campaign',
    },
    /** Where it landed; `<where>` is drawn in grey. */
    openReconnect:
      'Settings at {{platform}} <where>reconnect window open</where>',
    openConnect:
      'Settings › Connect another platform <where>{{platform}}</where>',
    /** A reconnect whose account isn't connected here lands on its tile. */
    openNotFound:
      'Settings › Connect another platform <where>{{platform}} isn’t connected here</where>',
    connectNote:
      'The sign-in is {{platform}}’s. Nothing changes until you finish it there.',
    connectCampaignNote:
      'Add {{platform}} to this campaign’s platforms once it is connected — on Strategy.',
    openAddSource: 'Opened {{screen}} to add a source',
    back: 'Back',
    putBack: 'Put back',
  },

  /**
   * An offer held for the user's yes (CON-446). The summary is the server's
   * own words; the client wraps it, it never rewrites it.
   */
  proposal: {
    /** The composer, while an offer is waiting. */
    placeholder: 'Reply “yes” to run it, or say what to change',
    confirm: 'Confirm',
    dismiss: 'Dismiss',
    gone: 'This offer no longer exists.',
    failed: 'It didn’t go through. Ask again to retry.',
    stopped:
      'Stopped before it finished. Anything it did is in the reply below.',
    confirmed: '{{summary}} · confirmed',
    /** `time` is the clock: "15:12". */
    confirmedAt: '{{summary}} · confirmed {{time}}',
    dismissed: '{{summary}} · dismissed',
    expired: '{{summary}} · expired',
    superseded: '{{summary}} · not answered',
    closed: '{{summary}} · not run',
    stale: '{{summary}} · changed since, nothing ran',
    working: '{{summary}} · working…',
    /** Over the one option the server marks (CON-467). */
    answeredElsewhere: 'This offer was already answered.',
    /** The request that waited on a source, back once it is read (CON-484). */
    sourceReady: 'Source ready: “{{title}}”',
    /** An option's own small form: the page's link, then IMPORT (CON-484). */
    import: 'Import',
    inputRequired: 'Paste the page’s link to import it.',
    badLink: 'That doesn’t look like a web address.',
    /** Before a confirmed run: every confirm re-checks the offer first. */
    checked: 'Checked again — nothing changed',
    /** A choice, answered: which way was taken. */
    chose: 'Chose: {{option}}',
    /** A yes that ran nothing because what the offer was made on changed (CON-482). */
    staleCard: {
      checked: 'Checked again before running',
      word: 'NOTHING RAN',
      title: 'Things changed since this offer',
      fresh: 'FRESH OFFER',
    },
    /** An offer that lapsed before its yes. */
    expiredCard: {
      word: 'EXPIRED',
      title: 'That offer lapsed',
      nothing: 'Nothing ran',
      hint: 'Ask again and it will be built from things as they are now.',
      askAgain: 'Ask again',
    },
    recommended: 'RECOMMENDED',
    /** Beside an offer's detail rows (CON-476): what each one is. */
    row: {
      destination: 'Where',
      type: 'Type',
      dates: 'When',
      tags: 'Tags',
    },
  },

  /**
   * A calendar check (CON-454). The findings and their fixes are the
   * server's words; the client counts and frames them.
   */
  findings: {
    title_one: '{{formatted}} thing to look at',
    title_other: '{{formatted}} things to look at',
    /** Beside the headline: the findings whose posts will be refused. */
    blocking_one: '{{formatted}} blocks publishing',
    blocking_other: '{{formatted}} block publishing',
    none: 'Nothing wrong with the calendar.',
    or: 'or {{fix}}',
    dismissed_one: '{{formatted}} dismissed finding left out.',
    dismissed_other: '{{formatted}} dismissed findings left out.',
    ignore: 'Ignore',
    ignored: 'Ignored: {{finding}}',
    ignoreFailed: 'Couldn’t ignore that. Try again.',
    /** The campaign's ignored findings, behind SHOW, each with RESTORE. */
    ignoredCount_one: '{{formatted}} ignored on this campaign',
    ignoredCount_other: '{{formatted}} ignored on this campaign',
    show: 'Show',
    hide: 'Hide',
    restore: 'Restore',
    restoreFailed: 'Couldn’t restore that. Try again.',
    /** A finding whose fix ran; `choice` is the slot or option picked. */
    fixed: 'Fixed: {{fix}}',
    fixedChose: 'Fixed: {{fix}} · {{choice}}',
    /**
     * A fix the server says ran, read back on a reload (CON-495) — since
     * the check; `when` is the day, or day and time, a move landed on.
     */
    fixedSince: 'Fixed since: {{fix}}',
    fixedSinceMoved: 'Fixed since: moved to {{when}}',
    fixing: 'Fixing…',
    /**
     * A post finding's way to its post's thread (CON-495): the row's button
     * when no fix runs on its own, else the last "or …".
     */
    assist: 'Fix with assistant',
    orAssist: 'or fix with assistant',
    /** The idea a same-idea finding's posts share (CON-495). */
    fromIdea: 'All from “{{title}}”',
    /** Under a fix's offer opened in the row: back to the row's fixes. */
    back: 'Back to the fixes',
    /** When the check read the calendar: "Read Wed 12 Nov, 16:40." */
    readAt: 'Read {{when}}.',
    checkAgain: 'Check again',
    checkPrompt: 'Check the calendar again.',
  },

  /**
   * The analytics pack's cards (CON-463). Every figure card ends on what
   * the read was narrowed to: period · platforms · campaign.
   */
  analytics: {
    untitled: 'Untitled post',
    percent: '{{value}}%',
    change: '{{value}}%',
    points: '{{value}} pt',
    lessons: 'Lessons:',
    postStats: 'Post figures:',
    cite: {
      range: '{{from}} – {{to}}',
      since: 'Since {{day}}',
      allTime: 'All time',
      lastDays_one: 'Last {{formatted}} day',
      lastDays_other: 'Last {{formatted}} days',
      lastWeeks_one: 'Last {{formatted}} week',
      lastWeeks_other: 'Last {{formatted}} weeks',
      lastMonths_one: 'Last {{formatted}} month',
      lastMonths_other: 'Last {{formatted}} months',
      allPlatforms: 'All platforms',
      allCampaigns: 'All campaigns',
      against_one: 'against the {{formatted}} day before',
      against_other: 'against the {{formatted}} days before',
    },
    note: {
      postStats: 'that post alone, since it was published',
    },
    unavailable: {
      noData: 'Nothing to report yet',
      addon: 'Needs the publisher’s Analytics add-on',
      notConfigured: 'Analytics isn’t set up for this workspace',
      other: 'Those figures aren’t available right now',
    },
    overview: {
      word: 'Overview',
      workspace: 'The workspace',
      on: '{{subject}} on {{platforms}}',
      empty: 'No figures in this window',
    },
    topPosts: {
      word: 'Top posts',
      title_one: 'Best of {{formatted}} post',
      title_other: 'Best of {{formatted}} posts',
      typical: '{{value}}× typical',
      reach: '{{value}} reach',
      weakest: 'Weakest',
    },
    bestTimes: {
      word: 'Best times',
      at: '{{day}} at {{hour}}:00',
      slot: '{{day}} {{hour}}:00',
      then: 'then {{slot}}',
      avg: '{{value}} avg interactions',
      weakest_one: 'weakest · {{formatted}} post',
      weakest_other: 'weakest · {{formatted}} posts',
      none: 'Too few posts to say yet',
      utc: 'hours in UTC',
    },
    decay: {
      word: 'Decay',
      half: 'Half the engagement comes in {{hours}} hours',
      title: 'How engagement builds',
      tooFew: 'Too few posts to draw how engagement builds yet.',
      hours: '{{value}} h',
      toHalf: 'to half',
    },
    frequency: {
      word: 'Frequency',
      perWeek: '{{value}} posts a week',
      lastMonth_one: '{{formatted}} last month',
      lastMonth_other: '{{formatted}} last month',
      aWeek: '{{value}} a week',
      aria: 'Posts published each week, this week last',
      week_one: 'Week of {{week}}: {{formatted}} post',
      week_other: 'Week of {{week}}: {{formatted}} posts',
      throughOgen: 'posts published through Ogen',
      title_one: '{{formatted}} post a week does best',
      title_other: '{{formatted}} posts a week do best',
      none: 'Too few weeks to say yet',
      row_one: '{{platform}} · {{formatted}} a week',
      row_other: '{{platform}} · {{formatted}} a week',
      weeks_one: '{{formatted}} week',
      weeks_other: '{{formatted}} weeks',
    },
    followers: {
      word: 'Followers',
      biggest: 'Biggest day',
      gainWith: '{{gain}} · {{post}}',
    },
    posts: {
      word: 'Posts',
      title_one: '{{formatted}} post',
      title_other: '{{formatted}} posts',
      count_one: '{{formatted}} post',
      count_other: '{{formatted}} posts',
      lowest_one: '{{formatted}} lowest',
      lowest_other: '{{formatted}} lowest',
      highest_one: '{{formatted}} highest',
      highest_other: '{{formatted}} highest',
      lowestOn_one: '{{formatted}} lowest on {{platform}}',
      lowestOn_other: '{{formatted}} lowest on {{platform}}',
      highestOn_one: '{{formatted}} highest on {{platform}}',
      highestOn_other: '{{formatted}} highest on {{platform}}',
      sortedBy: 'sorted by {{measure}}',
      figures: '{{reach}} reach · {{rate}}',
      open: 'Open',
    },
    compare: {
      word: 'Compared',
      beat: '{{second}} beat {{first}}',
      level: '{{second}} level with {{first}}',
      split: 'up on {{up}}, down on {{down}}',
      trailed: '{{second}} trailed {{first}}',
      on: 'on {{won}} of {{total}}',
      vs: '{{first}} vs {{second}}',
      lengths:
        '{{first}} days against {{second}}: the totals aren’t like for like, the rates are.',
      change: 'Change',
      new: 'new',
    },
    more: {
      trailWord: 'Trail',
      trail: 'Where the examples came from',
      noTrail: 'No trail recorded',
      ownWords:
        'Nothing recorded behind it — the ideas are read from the post’s own words.',
      analysisOf: '{{lens}} analysis',
      workspaceAnalysis: 'Workspace analysis',
      assetAt: '{{asset}} · {{passages}}',
      doneWord: 'Done',
      planned_one: 'Planned {{formatted}} idea',
      planned_other: 'Planned {{formatted}} ideas',
      onIdeas: 'on Ideas · nothing on the calendar',
      open: 'Open',
    },
  },

  /** The workspace pack's cards (CON-464). */
  workspace: {
    open: 'Open',
    allCampaigns: 'The whole workspace',
    activity: {
      day: 'Day',
      week: 'Week',
      weeks: 'Weeks',
      days: 'Days',
      /** "14–20 April", "Mon–Sun". */
      span: '{{from}}–{{to}}',
      soFar: 'so far',
      weeksCount_one: '{{formatted}} week',
      weeksCount_other: '{{formatted}} weeks',
      daysCount_one: '{{formatted}} day',
      daysCount_other: '{{formatted}} days',
      tilePublished: 'published',
      tileScheduled: 'scheduled',
      tileFailed: 'didn’t go out',
      tileDecided: 'ideas decided',
      failedPost: '{{title}} didn’t go out',
      failedUntitled: 'A post didn’t go out',
      dayPublished_one: '{{formatted}} published',
      dayPublished_other: '{{formatted}} published',
      dayFailed_one: '{{formatted}} didn’t go out',
      dayFailed_other: '{{formatted}} didn’t go out',
      dayCreated_one: '{{formatted}} created',
      dayCreated_other: '{{formatted}} created',
      dayCampaigns_one: '{{formatted}} campaign',
      dayCampaigns_other: '{{formatted}} campaigns',
      /** `days` is a joined list of weekdays: "Tue, Fri and Sun". */
      nothingDays: '{{days}} had nothing.',
      quietNext: 'Nothing has gone out yet. The next is {{when}}.',
      quietNone: 'Nothing has gone out, and nothing is scheduled.',
      quietUnknown: 'Nothing has gone out yet.',
      nextAt: '{{day}} at {{time}}',
      toToday: '{{period}}, to today',
    },
    emailed: {
      sentWord: 'Sent',
      notSentWord: 'Not sent',
      sentTo_one: 'Sent to {{formatted}} person',
      sentTo_other: 'Sent to {{formatted}} people',
      justNow: 'just now',
      onItsWay: 'On its way to your inbox',
      invite: 'Invite them first, from Settings › People',
      none: {
        notMember: 'Only members can receive it',
        optedOut: 'They turned the weekly email off',
        alreadySent: 'They’ve had this week already',
        failed: 'It didn’t go out',
        other: 'It went to no one',
      },
      reason: {
        notMember: '{{recipient}} isn’t in this workspace',
        optedOut: '{{recipient}} turned the weekly email off',
        alreadySent: '{{recipient}} already has this week',
        failed: 'It didn’t reach {{recipient}}',
        other: 'It wasn’t sent to {{recipient}}',
      },
    },
    digest: {
      word: 'Weekly report',
      weekOf: 'Week of {{week}}',
      asMonday: 'as Monday’s email',
      empty: 'Nothing went out or changed that week.',
      publishing: 'Publishing',
      published: 'Published',
      failed: 'Didn’t go out',
      performance: 'Performance',
      reach: 'Reach',
      bestPost: 'Best post',
      campaigns: 'Campaigns',
      ideas: 'Ideas',
      decided: 'Decided',
      stillWaiting_one: '{{formatted}} still waiting',
      stillWaiting_other: '{{formatted}} still waiting',
      team: 'Team',
    },
    history: {
      word: 'History',
      untitled: 'Untitled post',
      none: 'Nothing recorded for this post yet.',
      more: 'Older changes aren’t shown.',
      versions: 'VERSIONS',
      versionTag: 'Version {{n}}',
      savedVersion: 'Saved a version',
      scheduledFor: 'Scheduled for {{when}}',
      rescheduled: 'Rescheduled {{from}} → {{to}}',
      failed: 'Didn’t go out: {{reason}}',
      failedBare: 'Didn’t go out',
      status: 'Moved from {{from}} to {{to}}',
      since: 'since {{day}}',
      scope: {
        versions: 'versions',
        schedule: 'schedule changes',
        status: 'status changes',
        failures: 'failures',
        retries: 'retries',
        copies: 'copies',
        compiles: 'made from ideas',
        restores: 'restores',
      },
      events: {
        scheduled: 'Scheduled',
        unscheduled: 'Unscheduled',
        retried: 'Tried publishing again',
        copied: 'Made as a copy of another post',
        compiled: 'Made from ideas',
        restored: 'Restored an earlier version',
        statusChanged: 'Status changed',
      },
      system: 'Ogen',
      systemFor: 'Ogen, when {{name}} acted on it',
      assistant: 'Assistant',
      assistantFor: 'Assistant, asked by {{name}}',
      former: 'A former member',
      unrecorded: 'Someone (not recorded)',
      unrecordedBefore:
        'Versions saved before {{day}} say only whether a person, the assistant or Ogen saved them, not who.',
      unrecordedNote:
        'Versions saved before people were recorded on them say only whether a person, the assistant or Ogen saved them.',
    },
    setup: {
      word_one: 'Connection',
      word_other: 'Connections',
      brokenOne: '{{platform}} needs reconnecting',
      broken_one: '{{formatted}} account needs reconnecting',
      broken_other: '{{formatted}} accounts need reconnecting',
      healthy: 'Every account is connected',
      none: 'No accounts connected yet',
      signedOut: 'Signed out',
      since: 'since {{day}}',
      waiting: 'Waiting on it',
      waitingPosts_one: '{{formatted}} scheduled post',
      waitingPosts_other: '{{formatted}} scheduled posts',
      connected: 'Connected',
      expiresIn_one: 'expires in {{formatted}} day',
      expiresIn_other: 'expires in {{formatted}} days',
      reconnect: 'Reconnect {{platform}}',
      zone: 'Times in {{zone}}',
    },
    autoRead: {
      word: 'Auto-publish',
      one: '{{platform}} publishes on its own',
      many: '{{platforms}} publish on their own',
      none: 'Every platform publishes by hand',
      of: '{{n}} of {{total}}',
      auto: 'Auto-publish',
      byHand: 'By hand',
      reminder: 'you get a reminder at the time',
      needsReconnect: 'but needs reconnecting',
      timezone: 'Timezone',
    },
    autoPublish: {
      word: 'Auto-publish',
      turnedOn: 'Turned on for {{platform}}',
      turnedOff: 'Turned off for {{platform}}',
      title: 'Publishing on their own: {{platforms}}',
      none: 'Nothing publishes on its own now',
      fromNow: 'Posts scheduled from now on follow it.',
      keep_one:
        'Posts scheduled from now on follow it; the {{formatted}} already scheduled keeps how it was scheduled.',
      keep_other:
        'Posts scheduled from now on follow it; the {{formatted}} already scheduled keep how they were scheduled.',
    },
  },

  /**
   * How an offer answered from its card went (CON-467): what a run left
   * undone, each with the server's reason, and a tagging with its undo.
   */
  answered: {
    /** A run that did part of the job (CON-482). */
    partly: {
      word: 'PARTLY DONE',
      title: '{{made}} of {{total}} made',
    },
    /** A retry that made the rest: both runs summed. */
    done: {
      word: 'DONE',
      title: 'All {{total}} made',
      onRetry_one: '{{formatted}} on retry',
      onRetry_other: '{{formatted}} on retry',
    },
    retried_one: 'Retried: {{formatted}} not made',
    retried_other: 'Retried: {{formatted}} not made',
    notMade: {
      word: 'NOT MADE',
      group_one: 'NOT MADE · {{formatted}}',
      group_other: 'NOT MADE · {{formatted}}',
      title_one: '{{formatted}} not made',
      title_other: '{{formatted}} not made',
      retryCount_one: 'Retry {{formatted}}',
      retryCount_other: 'Retry {{formatted}}',
      lapsed: 'The offer behind them lapsed; ask again to make them.',
      /** Items the server names no title for, under one reason. */
      unnamed_one: '{{formatted}} item',
      unnamed_other: '{{formatted}} items',
      more_one: 'and {{formatted}} more',
      more_other: 'and {{formatted}} more',
    },
    replaced: {
      /**
       * One card for the swap (CON-483): what it drafted, what it deleted
       * for good, and where the goal period stands after it.
       */
      replacedWord: 'REPLACED',
      replacedTitle_one:
        '{{drafted}} drafted, {{formatted}} weaker draft removed',
      replacedTitle_other:
        '{{drafted}} drafted, {{formatted}} weaker drafts removed',
      period: '{{period}} stays at {{planned}}',
      draftedGroup: 'DRAFTED · {{formatted}}',
      removedGroup: 'REMOVED · {{formatted}}',
      fit: 'fit {{score}}',
      /** Every draft it named was kept, so none went. */
      noneWord: 'NOTHING DELETED',
      none: 'No drafts deleted',
      /** Drafted, but every draft it named was kept. */
      draftedOnly_one: '{{formatted}} drafted, nothing deleted',
      draftedOnly_other: '{{formatted}} drafted, nothing deleted',
      kept_one:
        '{{formatted}} kept: it changed since the offer, or wasn’t needed.',
      kept_other:
        '{{formatted}} kept: they changed since the offer, or weren’t needed.',
    },
    /** A removal put off until its scheduled posts are out (CON-483). */
    later: {
      word: 'NOTHING REMOVED',
      title: '{{what}} stays until its scheduled posts are out',
      until: 'until {{date}}',
    },
    tagged: {
      word: 'TAGGED',
      title_one: '{{formatted}} asset tagged',
      title_other: '{{formatted}} assets tagged',
      /** A tag by name, as the card quotes it. */
      quote: '“{{tag}}”',
      titleNamed_one: '{{formatted}} asset tagged {{tags}}',
      titleNamed_other: '{{formatted}} assets tagged {{tags}}',
      untagged_one: '{{formatted}} asset untagged {{tags}}',
      untagged_other: '{{formatted}} assets untagged {{tags}}',
      titleRetagged_one:
        '{{formatted}} asset retagged: {{added}} added, {{removed}} removed',
      titleRetagged_other:
        '{{formatted}} assets retagged: {{added}} added, {{removed}} removed',
      added: '{{tags}} added',
      removed: '{{tags}} removed',
      addedRemoved: '{{added}} added, {{removed}} removed',
      already: 'already as asked',
      putBack_one:
        'Put back: {{tags}} taken back from the {{formatted}} it changed',
      putBack_other:
        'Put back: {{tags}} taken back from the {{formatted}} it changed',
      note: 'Undo takes back only what the job changed — the ones already as asked keep their tags.',
      cantWord: 'CAN’T UNDO',
      cantTitle: 'Tags changed since',
      changedSince: '{{changed}} of {{of}} retagged since',
      cantHint: 'Undo would overwrite that change; untag by hand from Assets.',
      open: 'Open',
    },
  },

  /** The ideas pack's cards (CON-465/466). */
  ideas: {
    untitled: 'Untitled idea',
    open: 'Open',
    /** Exactly a card's ideas, on the Ideas list (CON-510). */
    openAll: 'Open all',
    noDate: 'no date',
    backOn: 'back on {{day}}',
    more_one: 'and {{formatted}} more',
    more_other: 'and {{formatted}} more',
    failed_one: '{{formatted}} idea couldn’t be changed',
    failed_other: '{{formatted}} ideas couldn’t be changed',
    stopped: 'It stopped before the end; the rest are as they were.',
    found: {
      word: 'Found',
      title_one: '{{formatted}} idea',
      title_other: '{{formatted}} ideas',
      /**
       * What the search named, in the Ideas list's own clauses (CON-509):
       * "6 ideas from Brochure, in Spring reopening".
       */
      titleNamed_one: '{{formatted}} idea {{clauses}}',
      titleNamed_other: '{{formatted}} ideas {{clauses}}',
      none: 'No ideas match',
      /** The pile the filter named, counted whole: "of 14 · On the desk". */
      ofPile: 'of {{total}} · {{pile}}',
      show: 'Show on screen',
      fit: 'fit {{score}}',
    },
    decided: {
      word: 'Decided',
      title: '{{pile}}: {{idea}}',
      many_one: '{{formatted}} idea decided',
      many_other: '{{formatted}} ideas decided',
      manyTo_one: '{{pile}}: {{formatted}} idea',
      manyTo_other: '{{pile}}: {{formatted}} ideas',
      undone_one: 'Undone: {{formatted}} idea back where it was',
      undone_other: 'Undone: {{formatted}} ideas back where they were',
    },
    moved: {
      word: 'Moved',
      title_one: '{{formatted}} idea moved',
      title_other: '{{formatted}} ideas moved',
    },
    deleted: {
      word: 'Deleted',
      title_one: '{{formatted}} idea deleted',
      title_other: '{{formatted}} ideas deleted',
    },
    compiled: {
      word_one: 'Planned post',
      word_other: 'Planned posts',
      editedSince: 'edited since',
      noPlatform: 'no platform yet',
      builtFrom_one: 'Built from {{formatted}} idea',
      builtFrom_other: 'Built from {{formatted}} ideas',
      cantUndo:
        'Can’t undo: the post has changed since it was compiled. Delete it from the post itself if you no longer want it.',
      fromIdeas_one:
        'The idea cites no document; the theses come from its own words.',
      fromIdeas_other:
        'None of the ideas cites a document; the theses come from their own words.',
    },
    drafted: {
      word: 'Drafted',
      one: 'Draft',
      writing: 'Writing',
      writingNth: 'Draft {{n}} of {{total}}',
      /** The post being written (CON-510): its idea, or ideas, and platform. */
      writingIdeaOn: '{{ideas}} · {{platform}}',
      writingIdea: '{{ideas}}',
      title_one: '{{formatted}} post',
      title_other: '{{formatted}} posts',
      fromIdeas_one: '{{drafts}} from {{formatted}} idea',
      fromIdeas_other: '{{drafts}} from {{formatted}} ideas',
      /** Opens the calendar's Not scheduled panel (CON-485). */
      show: 'Show',
      /** A row's day, and why it is that day (CON-485). */
      notScheduled: 'Not scheduled',
      datedPlan: '{{date}} · the idea’s plan date',
      datedAsked: '{{date}} · the day you chose',
      someUnscheduled_one: '{{formatted}} not scheduled',
      someUnscheduled_other: '{{formatted}} not scheduled',
      grounded: 'grounded',
      notGrounded: 'not grounded',
      dropped_one: '{{formatted}} draft couldn’t be written',
      dropped_other: '{{formatted}} drafts couldn’t be written',
      openAll: 'Open all',
      fromIdea_one: 'The idea cites no document; written from its own words.',
      fromIdea_other:
        'Its ideas cite no document; written from their own words.',
    },
    idea: {
      word: 'Why it fits',
      fitFor: 'Fit {{score}} for {{scope}}',
      workspace: 'the workspace',
      aCampaign: 'a campaign',
      angle: 'Angle',
      rationale: 'Rationale',
      from: 'From',
      fromLens: '{{asset}} · lens: {{lens}}',
      /** With the passage it came from (CON-487): "Brochure · p. 12 · lens: offers". */
      fromLensAt: '{{asset}} · {{place}} · lens: {{lens}}',
      post: 'Made into',
    },
    edited: {
      word: 'Edited',
      changed: 'changed its {{fields}}',
      empty: 'No note',
      noPlan: 'Nothing planned',
      phase: 'phase {{phase}}',
      fields: {
        title: 'Title',
        note: 'Note',
        plan: 'Plan',
        platform: 'platform',
        postType: 'post type',
        phase: 'phase',
        date: 'date',
      },
    },
    readOnly: {
      word: 'Not changed',
      title: 'This idea is read-only',
      why: 'It came from an analysis',
      instead:
        'Its words follow the source; only its campaign and plan can change. Want a new idea with that angle instead?',
    },
    similar: {
      word: 'Similar',
      title_one: '{{formatted}} idea like this one',
      title_other: '{{formatted}} ideas like this one',
      none: 'Nothing like it yet',
      note: 'Similar isn’t duplicate: ask to merge them if two say the same thing.',
    },
    common: {
      word: 'In common',
      title_one: '{{formatted}} idea, one thread',
      title_other: '{{formatted}} ideas, one thread',
      nothing_one: '{{formatted}} idea, nothing to compare',
      nothing_other: '{{formatted}} ideas, nothing in common',
      value: '{{value}} · {{formatted}} of {{of}}',
      angle: 'Angle',
      lenses: 'Lens',
      assets: 'Sources',
      splitTitle: 'Where they split',
      split: {
        campaign: 'Campaigns: {{values}}',
        lens: 'Lenses: {{values}}',
        platform: 'Planned for {{values}}',
        postType: 'Post types: {{values}}',
        phase: 'Phases: {{values}}',
        other: '{{values}}',
      },
    },
    duplicates: {
      word: 'Duplicates',
      title_one: '{{formatted}} group of look-alikes',
      title_other: '{{formatted}} groups of look-alikes',
      none: 'No duplicates',
      with: '+ {{ideas}} · {{alike}} alike',
    },
    merged: {
      word: 'Merged',
      groups_one: '{{formatted}} group merged',
      groups_other: '{{formatted}} groups merged',
      ideas: '{{before}} ideas → {{after}}',
      removed_one: '{{formatted}} merged into it',
      removed_other: '{{formatted}} merged into it',
    },
  },

  repair: {
    untitled: 'Untitled post',
    withdrawing_one:
      '{{formatted}} scheduled post is being withdrawn from publishing. It keeps its date, and no undo puts it back.',
    withdrawing_other:
      '{{formatted}} scheduled posts are being withdrawn from publishing. They keep their dates, and no undo puts them back.',
    skipped: 'Left as it was: {{reason}}',
    revised: {
      /** A rewrite that ran (CON-484), and how long it is now. */
      revisedWord: 'REVISED',
      length: '{{before}} → {{after}} characters',
      word: 'Rewritten',
      title: 'Post rewritten',
      /** After the post's title: "Chef’s table rewritten". */
      meta: 'rewritten',
      inVoice: 'A new version, in {{voice}}',
      newVersion: 'A new version',
      open: 'Open',
      notRevised: 'Post left as it was',
      versioned: 'The old one stays in the post’s versions',
      unversioned:
        'Saving the rewrite as a version failed, so the post’s history has no copy of it',
    },
    /** One post given another voice (`setPostVoice`, CON-494). */
    voiceChanged: {
      word: 'VOICE CHANGED',
      title: 'Post voice changed',
      /** "Formal → Plain". */
      fromTo: '{{from}} → {{to}}',
      fromToCampaign: '{{from}} → {{to}}, the campaign’s voice',
      /** No voice it had to name. */
      to: 'Now in {{to}}',
      toCampaign: 'Now in {{to}}, the campaign’s voice',
      /** The campaign's voice, unnamed. */
      campaign: 'Now in the campaign’s voice',
      /** A voice of its own the result didn't name. */
      ownUnnamed: 'Now in a voice of its own',
      copyKept:
        'The copy stays as it is; checks and rewrites read it in this voice',
      open: 'Open',
    },
    converted: {
      word: 'Converted',
      title_one: '{{formatted}} post changed type',
      title_other: '{{formatted}} posts changed type',
      /** A post's types: "Story → Image post". */
      types: '{{from}} → {{to}}',
      kept: 'Kept {{what}}',
      keptWhat: {
        caption: 'caption',
        media: 'media',
      },
      still: 'Still scheduled {{when}}',
      /**
       * Whether a converted post passes its new type's rules (CON-495):
       * "Passes the Image post rules on Instagram". `rules` is the rules it
       * still breaks, joined as a list.
       */
      passes: 'Passes the {{type}} rules on {{platform}}',
      passesAny: 'Passes the new type’s rules',
      breaks: 'Still breaks: {{rules}}',
      breaksAny: 'Still breaks the new type’s rules',
    },
    unscheduled: {
      word: 'Unscheduled',
      title_one: '{{formatted}} post taken off the calendar',
      title_other: '{{formatted}} posts taken off the calendar',
      /** `status` is the post's status now, as the app names it. */
      back: 'Back to {{status}}',
      was: 'Was {{when}}',
      wasOn: 'Was {{when}} on {{platform}}',
    },
    /** What a confirmed move did (`applyCalendarMoves`, CON-478). */
    moved: {
      word: 'Moved',
      title_one: '{{formatted}} post',
      title_other: '{{formatted}} posts',
      over_one: 'over {{formatted}} week',
      over_other: 'over {{formatted}} weeks',
      early: 'Drafts and planned posts',
      ready: 'Ready to publish',
      count_one: '{{formatted}} moved',
      count_other: '{{formatted}} moved',
      locked_one: '{{formatted}} scheduled',
      locked_other: '{{formatted}} scheduled',
      lockedNote: 'Kept where they were',
      skipped_one: '{{formatted}} couldn’t be moved',
      skipped_other: '{{formatted}} couldn’t be moved',
    },
    deleted: {
      word: 'Deleted',
      title_one: '{{formatted}} post deleted',
      title_other: '{{formatted}} posts deleted',
    },
    /**
     * The lines an edit rewrote (CON-495): struck old over new. Only a
     * screen reader hears these words.
     */
    lines: {
      label: 'Lines changed',
      removed: 'Removed: ',
      added: 'Added: ',
    },
    review: {
      word: 'Review',
      none: 'The brief and the posts agree',
      title_one: '{{formatted}} thing drifts from the brief',
      title_other: '{{formatted}} things drift from the brief',
      read_one: '{{formatted}} post read',
      read_other: '{{formatted}} posts read',
      /** The brief or the posts checked alone. */
      briefTitle_one: '{{formatted}} thing in the brief',
      briefTitle_other: '{{formatted}} things in the brief',
      postsTitle_one: '{{formatted}} thing drifts from the brief',
      postsTitle_other: '{{formatted}} things drift from the brief',
      /** Nothing open, but not because nothing was found. */
      noneOpen_one: 'Nothing open · {{formatted}} ignored',
      noneOpen_other: 'Nothing open · {{formatted}} ignored',
      /** Under a finding: where it is. */
      inPost: 'In {{title}}.',
      inBrief: '{{aspect}}.',
      /** A finding about some of a post's words leads with them (CON-495). */
      quoted: '“{{quote}}”',
      /**
       * FIX WITH ASSISTANT's message to the post's thread (CON-495). The
       * finding goes with it by key; the thread shows the finding instead.
       */
      fixPrompt: 'Fix this finding from the review.',
      /** Over the finding a post thread was asked to fix. */
      fromReview: 'From the review',
      fromReviewQuoted: '“{{quote}}” — {{issue}}',
      from: {
        brief: 'Brief',
        posts: 'Posts',
      },
      again: {
        review: 'Review the campaign again.',
        brief: 'Check the brief again.',
        posts: 'Check the posts against the brief again.',
      },
    },
    plan: {
      word: 'Proposed',
      even: 'The calendar is already even',
      title_one: 'Move {{formatted}} post',
      title_other: 'Move {{formatted}} posts',
      locked_one: '{{formatted}} scheduled post stays',
      locked_other: '{{formatted}} scheduled posts stay',
      move: '{{from}} → {{to}}',
      stays: 'Stays {{date}}',
      more_one: 'and {{formatted}} more',
      more_other: 'and {{formatted}} more',
      /** After the headline: "within Mon 13–Sun 19". */
      window: 'within {{from}} – {{to}}',
      confirm_one: 'Move {{formatted}} post',
      confirm_other: 'Move {{formatted}} posts',
      before: 'Before',
      after: 'After',
      legendMoved: 'moved',
      legendLocked: 'scheduled, stays',
    },
  },

  /** Reversing a change a turn made. */
  undo: {
    undo: 'Undo',
    undone: 'Undone',
    changed: 'Can’t undo: it was changed again since.',
    gone: 'This can no longer be undone.',
    failed: 'Couldn’t undo that. Try again.',
  },

  /**
   * The one slot every generating result ends on: where its output came
   * from, or that it came from nowhere of yours.
   */
  sources: {
    label: 'Sources',
    yourMaterial: 'your material',
    notGrounded: 'Not grounded',
    generalKnowledge: '— general knowledge',
    /** Why it drew on nothing, from the server's reason (CON-484). */
    reason: {
      noSources: 'there are no documents to draw on yet',
      chosen: 'you chose to go ahead without sources',
      noneRelevant: 'nothing in the campaign’s documents is about this',
    },
  },

  /** The structured result under a campaign turn. */
  result: {
    datesUpdated: 'Campaign dates updated',
    outsideRange_one:
      '{{formatted}} post now falls outside the range — ask to redistribute it.',
    outsideRange_other:
      '{{formatted}} posts now fall outside the range — ask to redistribute them.',
    postsRedistributed: 'Posts redistributed',
    redistributed_one: 'Re-dated {{formatted}} post across {{phases}}.',
    redistributed_other: 'Re-dated {{formatted}} posts across {{phases}}.',
    phases_one: '{{formatted}} phase',
    phases_other: '{{formatted}} phases',
    /** Planning writes ideas, not posts (CON-449). */
    ideasNone: 'No ideas planned',
    ideas_one: '+{{formatted}} idea on the Ideas tab',
    ideas_other: '+{{formatted}} ideas on the Ideas tab',
    draftsNone: 'No drafts written',
    /**
     * What draftPost made (CON-484): the count, then where and when —
     * "1 post · Threads · Thu 24" — and a row per draft.
     */
    draftedWord: 'DRAFTED',
    drafted_one: '{{formatted}} post',
    drafted_other: '{{formatted}} posts',
    notScheduled: 'not scheduled',
    openPost: 'Open',
    openPosts: 'Open all',
    platformsUpdated: 'Platforms updated',
    /** The server's words for what changed, e.g. "Threads". */
    platformsAdded: 'added {{what}}',
    platformsRemoved: 'removed {{what}}',
    platformsChanged: 'added {{added}} · removed {{removed}}',
    /**
     * A removal or an addition on its own (CON-483): the platform or post
     * type in the server's words, e.g. "Facebook", "reel".
     */
    removedWord: 'REMOVED',
    addedWord: 'ADDED',
    platformsOff: '{{what}} is off the campaign',
    platformsOn: '{{what}} is on the campaign',
    noPostsOn: 'no posts on it',
    /** The posts a removal leaves where they were, flagged. */
    keptNote_one:
      '{{formatted}} unpublished post stays where it is, flagged in Quality.',
    keptNote_other:
      '{{formatted}} unpublished posts stay where they are, flagged in Quality.',
    unscheduled_one:
      '{{formatted}} post unscheduled first. UNDO puts the platform back, not the schedule.',
    unscheduled_other:
      '{{formatted}} posts unscheduled first. UNDO puts the platform back, not the schedule.',
    /** The days saved ideas target, after their count. */
    ideasWindow: 'targeting {{range}}',
    openIdeas: 'Open',
    /** The goal is a rate; the total is the whole campaign's. */
    goal: {
      week_one: 'Goal raised to {{formatted}} post a week',
      week_other: 'Goal raised to {{formatted}} posts a week',
      month_one: 'Goal raised to {{formatted}} post a month',
      month_other: 'Goal raised to {{formatted}} posts a month',
      total_one: '{{formatted}} in all',
      total_other: '{{formatted}} in all',
    },
    briefApplied: 'Brief updated and saved',
    briefNotApplied: 'Brief suggested but not applied',
    /** enrichBrief, field by field (CON-484). */
    briefWord: 'BRIEF',
    briefRewritten: 'Messaging rewritten',
    briefFields_one: '{{formatted}} field',
    briefFields_other: '{{formatted}} fields',
    briefField: {
      description: 'Description',
      targetPersona: 'Target persona',
      keyMessages: 'Key messages',
      toneGuidelines: 'Tone',
    },
  },
}
