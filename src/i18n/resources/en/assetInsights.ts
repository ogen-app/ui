/**
 * The asset page's two-column layout (CON-366): the LLM's
 * reading of an asset (CON-364) under Insights, the old screen under Source.
 */
export const assetInsights = {
  /** Beside the back caret: where it goes. */
  header: {
    bank: 'Content bank',
    campaign: '{{campaign}} · Assets',
  },
  /** A PDF's first page on the stage, and opened whole. */
  cover: {
    zoom: 'View the cover full size',
    zoomImage: 'View the image full size',
    close: 'Close',
  },
  /** Shown for a moment when a reading lands while the page is open. */
  arrived_one: 'Insights ready — {{count}} idea added',
  arrived_other: 'Insights ready — {{count}} ideas added',
  /** The loading tracker. Illustrative: analyse and distil are one step. */
  steps: {
    upload: 'Upload',
    extract: 'Extract text',
    analyse: 'Analyse',
    ideas: 'Distil ideas',
  },
  /** A Word file's or a deck's outline, drawn where its picture would be. */
  outline: {
    contents: 'Contents',
    slides: 'Slides',
    untitled: 'Slide {{number}}',
  },
  /** The reading at rest and in full (CON-369). */
  summaryMore: 'Read the full summary',
  summaryLess: 'Show less',
  /** Topics, mentions and sheets, under the ideas. */
  covers: 'What it covers',
  /** A mention group's name, by the kind the analysis gave. */
  mentionKind: {
    org: 'Organisations',
    product: 'Products',
    person: 'People',
    place: 'Places',
    other: 'Other',
  },
  moreMentions_one: '+{{count}} more',
  moreMentions_other: '+{{count}} more',
  tabs: {
    insights: 'Insights',
    source: 'Source',
  },
  lens: {
    workspaceOnly: 'Read for your workspace',
    readingFor: 'Reading for',
    workspace: 'Workspace',
    /** A campaign lens whose campaign name did not arrive. */
    campaign: 'Campaign',
    /** In a sentence: "Analysing for the workspace". */
    theWorkspace: 'the workspace',
  },
  /** A campaign's fit, 0–100 from the analysis. */
  fit: '{{score}}% fit',
  meta: {
    status: {
      reading: 'Reading the file…',
      transcribing: 'Transcribing · {{done}} of {{total}} segments',
      fetching: 'Fetching the page…',
      unreadable: 'Couldn’t read this file',
      analysing: 'Analysing…',
      analysed: 'Analysed · {{when}}',
      analysisFailed: 'Analysis failed',
      notAnalysed: 'Not analysed',
      ready: 'Ready',
    },
    addedBy: 'Added by',
    added: 'Added',
    file: 'File',
    language: 'Language',
    download: 'Download',
    campaigns: 'Campaigns',
    noCampaigns: 'Not in a campaign yet.',
    moreCampaigns: '+{{count}} more',
    addToCampaign: 'Add to campaign',
    /** Who added it, when that membership has since left the workspace. */
    formerMember: 'Former member',
    /** A scraped page's address, where a file would have its name. */
    source: 'Source',
    /** A web page's last change: a re-read or an edit — there is no scrape date. */
    updated: 'Updated',
    images: 'Images',
    minutes_one: '{{count}} min',
    minutes_other: '{{count}} min',
    tags: 'Tags',
  },
  player: {
    play: 'Play',
    pause: 'Pause',
    seek: 'Position in the recording',
  },
  summary: 'Summary',
  keyPoints: 'Key points',
  topics: 'Topics',
  relevance: {
    title: 'Read for {{campaign}}',
  },
  partialSource:
    'Part of this file couldn’t be read, so this reading covers only the rest of it.',
  truncated:
    'This file is longer than one reading covers, so its last part was left out.',
  meeting: {
    participants: 'Participants',
    /** Said of a participant or an owner the model guessed rather than heard named. */
    inferred: 'inferred',
    commitments_one: 'Commitments · {{count}}',
    commitments_other: 'Commitments · {{count}}',
    unattributed: 'Unattributed',
    decisions: 'Decisions',
    openQuestions: 'Open questions',
  },
  ideas: {
    /** The verdict piles above the asset page's ideas (CON-370). */
    pile: {
      waiting: 'On the desk',
      yes: 'Making',
      later: 'In the drawer',
      no: 'Set aside',
    },
    /** The heading, with the count (CON-369). */
    count_one: '{{count}} post idea',
    count_other: '{{count}} post ideas',
    waiting:
      'New ideas land on the desk in Ideas, to make, put in the drawer or set aside.',
    waitingFor:
      'New ideas land on the desk in the Ideas for {{campaign}}, to make, put in the drawer or set aside.',
    heading: 'Ideas',
    open: 'Open in Ideas',
    emptyTitle: 'No ideas from this one',
    emptyBody:
      'The summary is here, but the source was too short or too far off the brief to draw posts from.',
    /** The opened idea's answer, as a group of buttons (CON-387). */
    answer: 'Answer this idea',
  },
  /**
   * Asking a reading for more ideas (CON-398): the ghost button under the
   * ideas, its modal, and the run's state at the foot of the list.
   */
  distill: {
    action: 'Distill more ideas',
    /** Beside the disabled button: why it can't be pressed right now. */
    reason: {
      analysing: 'Analysis in progress',
      running: 'Finding more ideas…',
      limit: 'No runs left this month',
      plan: 'Not on your plan',
    },
    running_one: 'Distilling {{count}} more idea…',
    running_other: 'Distilling {{count}} more ideas…',
    runningFocused:
      'Focused on “{{focus}}”. They’ll land in this list, sorted by fit.',
    runningBody: 'They’ll land in this list, sorted by fit.',
    empty: 'No new ideas this time — try a different focus.',
    emptyFocused: 'Focused on “{{focus}}”.',
    failed: 'Couldn’t distill more ideas.',
    failure: {
      empty_source: 'There was no text in the source to draw from.',
      invalid_output: 'The new ideas came back malformed.',
      source_unavailable: 'The source’s text couldn’t be loaded.',
      model_unavailable: 'The model could not be reached.',
      model_refused: 'The model declined to read this source.',
      lens_gone: 'This reading was replaced before the ideas were saved.',
      unknown: 'Something went wrong. Nothing was added.',
    },
    limit: 'This month’s idea runs are used up.',
    limitBody: 'Upgrade for more, or wait for next month.',
    plan: 'More ideas aren’t included in your plan.',
    planBody: 'Upgrade to ask for more ideas from a document.',
    tryAgain: 'Try again',
    seePlans: 'See plans',
    /** The chip that narrows the list to this visit's new ideas, and the row's dot. */
    fresh_one: '{{count}} new',
    fresh_other: '{{count}} new',
    freshLabel_one: 'Show the {{count}} new idea only',
    freshLabel_other: 'Show the {{count}} new ideas only',
    freshMark: 'New',
    modal: {
      title: 'Distill more ideas',
      howMany: 'How many',
      howManyHint: 'New ideas this run, {{min}} to {{max}}.',
      focus: 'Focus (optional)',
      focusPlaceholder:
        'e.g. objections a CFO would raise, contrarian takes, numbers that would surprise a buyer',
      focusHint:
        'What the new ideas should lean towards. Leave it empty for Ogen’s own pick.',
      focusTooLong: 'Focus can be at most {{max}} characters.',
      counter: '{{count}} / {{max}}',
      context:
        'Ogen reads the source again for the workspace. It won’t repeat the ideas already here, and keeps away from the ones you set aside. Every existing idea stays.',
      contextFor:
        'Ogen reads the source again for {{campaign}}. It won’t repeat the ideas already here, and keeps away from the ones you set aside. Every existing idea stays.',
      invalid: 'Check the focus and the count, then try again.',
      failed: 'Couldn’t ask for more ideas. Try again in a moment.',
      cancel: 'CANCEL',
      submit_one: 'DISTILL {{count}} IDEA',
      submit_other: 'DISTILL {{count}} IDEAS',
    },
  },
  /** Why an idea scores what it does, criterion by criterion (CON-385/387). */
  ideaFit: {
    heading: 'Why it scores {{score}}',
    forCampaign: 'for {{campaign}}',
    forWorkspace: 'for the workspace',
    /** An idea keeps its score when filed elsewhere, and says where it got it. */
    scoredWorkspace: 'scored for the workspace',
    scoredOther: 'scored for another campaign',
    /** A criterion's rating, read out: "Key message: 4 of 5". */
    rating: '{{criterion}}: {{level}} of 5',
    criterion: {
      message_fit: 'Key message',
      audience_fit: 'Audience',
      evidence: 'Backed by the source',
      gap_fill: 'Fills a gap',
      phase_fit: 'Campaign phase',
      timeliness: 'Timing',
      brand_fit: 'Brand voice',
      brand_relevance: 'Brand relevance',
      campaign_potential: 'Feeds a campaign',
      evergreen: 'Evergreen',
    },
    /** A cap overrides every rating, so it is said first. */
    cap: {
      guardrail_breach: 'Capped: it would break a brand guardrail.',
      off_brief: 'Capped: it goes against the brief.',
      unsupported: 'Capped: it relies on a fact the source doesn’t contain.',
    },
  },
  /** Where in the source an idea comes from. */
  reference: {
    heading: 'Reference',
    page: 'page {{from}}',
    pages: 'pages {{from}}–{{to}}',
  },
  state: {
    reading: 'Reading the file first',
    readingBody: 'Insights start once its text has been extracted.',
    analysing: 'Analysing for {{lens}}',
    refreshing:
      'Re-reading for {{lens}} — this reading stays until the new one is ready.',
    analysingBody:
      'This usually takes under a minute. It appears here without a refresh.',
    assetFailed: 'Nothing to analyse',
    assetFailedBody:
      'This file couldn’t be read, so there is no text to draw insights from.',
    failed: 'Couldn’t analyse this asset',
    notInPlan: 'Asset insights aren’t included in your plan.',
    notInPlanBody: 'The Source tab stays available.',
    limitReached: 'This month’s analyses are used up.',
    limitReachedBody: 'It runs again next month, or try again after upgrading.',
    loadFailed: 'Couldn’t load the insights',
    loadFailedBody: 'Check your connection; this retries on its own.',
    none: 'Not analysed',
    noneNoteBody:
      'Insights appear a little while after you stop editing this note — or analyse it now.',
    analyseNow: 'Analyse now',
    emptyNote: 'Nothing to read yet',
    emptyNoteBody:
      'Write in this note and its summary and ideas follow once you pause.',
    startWriting: 'Start writing',
    emptySource: 'No text to analyse',
    emptySourceBody:
      'This file has no text the analysis could read — an image-only PDF or a blank sheet, say.',
    noneBody:
      'This asset was added before insights existed. It is being picked up in the background — or analyse it now.',
  },
  failure: {
    entitlement_disabled: 'Asset insights aren’t included in your plan.',
    limit_reached: 'This month’s analyses are used up.',
    empty_source: 'There was no text in this file to analyse.',
    invalid_output: 'The analysis came back malformed.',
    source_unavailable: 'The file’s text couldn’t be loaded for analysis.',
    model_unavailable: 'The analysis model could not be reached.',
    model_refused: 'The analysis model declined to read this file.',
    unknown: 'Something went wrong while analysing it.',
  },
  /**
   * A spreadsheet's stage, facts and Source table (CON-366 §5.4). Sheet
   * names and row ranges inside chips are the file's and the server's.
   */
  sheet: {
    kind: 'spreadsheet',
    sheets_one: '{{count}} sheet',
    sheets_other: '{{count}} sheets',
    rows_one: '{{formatted}} row',
    rows_other: '{{formatted}} rows',
    fact: 'Sheets',
    moreSheets: '+{{count}} more',
    chip_one: '{{name}} · {{formatted}} row',
    chip_other: '{{name}} · {{formatted}} rows',
    footnote:
      'Figures in ideas come straight from the sheet — check what is public before posting.',
    open: 'Open the {{name}} sheet',
    openRows: 'Show {{label}} in the sheet',
    readOnly: 'Read-only · the text the assistant reads',
    citedRange: 'Rows {{from}}–{{to}}',
    citedBy: 'cited by “{{idea}}”',
    clear: 'Clear',
    showing: 'Showing {{shown}} of {{total}} rows',
    loaded_one: '{{shown}} row loaded',
    loaded_other: '{{shown}} rows loaded',
    loadMore: 'Load more',
    loadFailed: 'Couldn’t load this sheet',
    empty: 'This sheet has no rows.',
    notLoaded: 'This sheet’s rows are further on — load more to reach them.',
  },
  retry: 'Try again',
  retryFailed: 'Couldn’t start the analysis again',
  seePlans: 'See plans',
}
