/**
 * Ideas: a backlog anyone can add a line to, and the three answers triage
 * gives it. The verdicts are nouns for the piles (`verdict.*`) and verbs for
 * the controls (`action.*`) — the same word does not do both jobs in every
 * language, and a button reading "Yes" beside a tab reading "Yes" is only
 * accidentally right in English.
 */
export const ideas = {
  capture: {
    /** The field carries no visible label — the placeholder is the prompt. */
    label: 'Write down an idea',
    /**
     * The prompt, one picked per visit. Each says what an idea is here — a
     * post somebody could make — rather than asking for a finished one.
     */
    prompt: {
      post: 'A post worth making…',
      postingAbout: 'What’s worth posting about?',
      worthAPost: 'Something worth a post?',
      story: 'A story worth telling…',
      stopScrolling: 'What would make people stop scrolling?',
      wantToRead: 'A post you’d want to read…',
      thisWeek: 'What’s worth sharing this week?',
      audienceHear: 'Something your audience should hear…',
      format: 'A carousel, a reel, a thread — what’s the idea?',
      deserves: 'What deserves a post?',
      behindScenes: 'A behind-the-scenes worth showing…',
      keepsAsking: 'A question your audience keeps asking…',
    },
    hint: 'Return <key/> to keep it',
    /** An idea whose save failed, kept under the field. */
    unsaved: 'Not kept: “{{title}}”',
    retry: 'Try again',
    dismiss: 'Dismiss',
    hintMultiline: 'Shift <key/> for a new line · Return <key/> to keep it',
    /** The header's button that opens the field, and the way out of it. */
    open: 'ADD IDEA',
    close: 'Stop adding ideas',
    /** The field's send button: Return, for the mouse. */
    keep: 'Keep this idea',
  },
  /** The verdicts as the piles they name. */
  verdict: {
    yes: 'Making',
    later: 'In the drawer',
    no: 'Set aside',
  },
  /** The same verdicts as the controls that give them — named as the state. */
  action: {
    yes: 'Making',
    later: 'In the drawer',
    no: 'Set aside',
    undecide: 'Put it back on the desk',
    delete: 'DELETE IDEA',
  },
  horizon: {
    week: 'Ask me in a week',
    month: 'Ask me in a month',
    quarter: 'Ask me in three months',
  },
  pile: {
    /** Not "Inbox": the rail already has one of those, and it holds tasks. */
    waiting: 'On the desk',
  },
  pileEmpty: {
    waiting: 'The desk is clear.',
    yes: 'Nothing is being made yet.',
    later: 'Nothing is in the drawer.',
    no: 'Nothing has been set aside.',
  },
  /** Said on a postponed idea whose day has come round. */
  backFrom: 'back again',
  field: {
    title: 'The idea',
    note: 'Notes',
    notePlaceholder: 'Anything worth remembering about it',
    noCampaign: 'No campaign',
  },
  /** An idea's own history, joined — never a sentence built from fragments. */
  record: {
    yes: 'Making since {{at}}',
    no: 'Set aside on {{at}}',
    /** A drawer idea's day: when it comes back to the desk. */
    returns: 'Back on the desk on {{at}}',
  },
  empty: {
    title: 'Nothing written down yet.',
    subtitle:
      'Anything worth making, however half-formed. Deciding about it is a separate job, and it can wait.',
  },
  /**
   * The figure on the sidebar's Ideas row, read out rather than seen.
   *
   * The desk and not the backlog's size: a backlog is meant to be long, so
   * the number worth a slot in the rail is the one that goes down when
   * somebody answers a row. Same word as the pile it counts.
   */
  undecidedCount_one: '{{count}} idea on the desk',
  undecidedCount_other: '{{count}} ideas on the desk',
  /** The Ideas page's card (CON-388): where each idea came from. */
  card: {
    writtenBy: 'Written by {{name}}',
    writtenByAt: 'Written by {{name}} · {{at}}',
    /** An idea generated from no document, opened (CON-484). */
    suggestedAt: 'Suggested by the assistant · {{at}}',
    /** The assistant's spark, in the card's mark column. */
    suggested: 'Suggested by the assistant',
    /** Its writer's slot: the assistant, not whoever asked. */
    assistant: 'Assistant',
    /** A written idea whose writer was never named. */
    someone: 'Someone',
    /** An idea generated from no document (CON-484). */
    byAssistant: 'suggested by the assistant',
    documentDeleted: 'Document deleted',
    morePlaces: '+{{count}} more',
    quickAnswers: 'Answer “{{title}}”',
    openSource: 'Open source',
    filedUnder: 'Filed under',
    change: 'Change',
    unscored:
      'Written ideas have no score: a score rates what an analysis read against its brief.',
    savedOnBlur: 'Saved as you leave a field',
    source: {
      heading: 'Source',
      pages_one: '{{count}} page',
      pages_other: '{{count}} pages',
      minutes_one: '{{count}} min',
      minutes_other: '{{count}} min',
      readFor: 'read for {{campaign}}',
      readForWorkspace: 'read for the workspace',
    },
  },
  /** Deleting ideas always asks, and names a single one. */
  delete: {
    titleNamed: 'Delete “{{title}}”?',
    title_one: 'Delete {{count}} idea?',
    title_other: 'Delete {{count}} ideas?',
    body_one:
      'This idea will be permanently deleted, with its verdict. This cannot be undone.',
    body_other:
      'These ideas will be permanently deleted, with their verdicts. This cannot be undone.',
    keep_one: 'KEEP IDEA',
    keep_other: 'KEEP IDEAS',
    confirm_one: 'DELETE IDEA',
    confirm_other: 'DELETE {{count}} IDEAS',
  },
  /** The smart filter on the Ideas list (CON-388 §4). */
  filter: {
    origin: {
      asset_analysis: 'From a document',
      manual: 'Written',
    },
    fit: {
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      unscored: 'Not scored',
    },
    fitBand: {
      high: '70–100',
      medium: '40–69',
      low: '10–39',
    },
    fitRange: '{{band}} · {{range}}',
    /**
     * Whether a post was made from the idea (CON-470), worded as the
     * sentence reads it (CON-485).
     */
    used: {
      unused: 'not used yet',
      used: 'used in a post',
    },
    /** `source_asset=none`: written ideas, and ones whose document was deleted. */
    noDocument: 'No document',
    unknownDocument: 'A deleted document',
    formerMember: 'A former member',
    nothingMatches: 'No ideas match these filters',
  },
  view: {
    group: {
      none: 'No grouping',
      source: 'Source',
      campaign: 'Campaign',
      fit: 'Fit',
      origin: 'Origin',
      author: 'Author',
      created: 'Date added',
      used: 'Used',
    },
    sort: {
      waiting: 'Waiting longest',
      fit: 'Best fit first',
      created_desc: 'Newest first',
    },
  },
  list: {
    label: 'Ideas',
    moreFailed: 'Couldn’t load more ideas.',
    band: {
      /** Grouped by author: the ideas no member wrote. */
      noAuthor: 'From documents',
    },
  },
  /** Selecting ideas and deleting them together (CON-388 §6). */
  /**
   * Ideas becoming posts (CON-449). COMPILE makes a planned post — a title
   * and theses, no body; DRAFT writes the body. Neither schedules.
   */
  lifecycle: {
    /** Literal capitals: the slot's tag on the calendar. */
    slot: 'IDEA',
    compile: 'COMPILE',
    draft: 'DRAFT',
    compiled_one: 'Compiled into a planned post',
    compiled_other: 'Compiled into {{formatted}} planned posts',
    /**
     * Unscheduled is the default (CON-470): only a day the user chose, or
     * one planned on an idea, dates a draft.
     */
    drafted_one: '{{formatted}} draft written, not scheduled',
    drafted_other: '{{formatted}} drafts written, not scheduled',
    draftedDated_one: '{{formatted}} draft written',
    draftedDated_other: '{{formatted}} drafts written',
    draftedSome_one:
      '{{formatted}} draft written, {{unscheduled}} not scheduled',
    draftedSome_other:
      '{{formatted}} drafts written, {{unscheduled}} not scheduled',
    /** The toast's way to the drafts: the calendar's Not scheduled panel. */
    show: 'SHOW',
    inNotScheduled: 'In Not scheduled, until you drag them onto a day.',
    /** Drafts that went to several campaigns: one toast each (CON-485). */
    inCampaign: 'In {{campaign}}',
    aCampaign: 'a campaign',
    /** Used in the row's source line (CON-470): a fact, not a verdict. */
    used_one: 'Used in {{formatted}} post',
    used_other: 'Used in {{formatted}} posts',
    /** The opened idea's list of the posts made from it. */
    madeInto: {
      heading: 'Made into',
      untitled: 'Untitled post',
      notScheduled: 'Not scheduled',
      failed: 'Couldn’t load the posts made from this idea.',
      loading: 'Reading its posts…',
      /** The count said posts, but none came back: deleted since. */
      empty: 'The posts made from it have been deleted.',
    },
    /**
     * The small form behind COMPILE and DRAFT (CON-470): which platforms,
     * and for a draft of several ideas, one post each or one from all.
     */
    form: {
      compileTitle_one: 'Compile {{formatted}} idea',
      compileTitle_other: 'Compile {{formatted}} ideas',
      draftTitle_one: 'Draft {{formatted}} idea',
      draftTitle_other: 'Draft {{formatted}} ideas',
      /** One idea, named (CON-485): Draft “The kitchen garden”. */
      compileNamed: 'Compile “{{title}}”',
      draftNamed: 'Draft “{{title}}”',
      platforms: 'Platforms',
      fromPlan_one: 'from the idea’s plan',
      fromPlan_other: 'from the ideas’ plan',
      pickOne: 'Pick at least one platform.',
      noPlatforms: 'This campaign has no platforms yet.',
      platformsFailed: 'Couldn’t load the campaign’s platforms.',
      retry: 'TRY AGAIN',
      noCampaign:
        'These ideas aren’t filed under one campaign, so each goes to the platform its plan names.',
      howMany: 'How many',
      perIdea: 'One post per idea, per platform',
      together: 'One post from all {{count}}, per platform',
      /** Under each choice: what it makes (CON-485). */
      drafts_one: '{{formatted}} draft',
      drafts_other: '{{formatted}} drafts',
      when: 'When',
      /** How many of the ideas have a day planned (CON-485). */
      datedOf_one:
        '{{dated}} of {{total}} has a date; the rest stay unscheduled.',
      datedOf_other:
        '{{dated}} of {{total}} have a date; the rest stay unscheduled.',
      result: 'Result',
      compileResult:
        'One planned post per platform: the same theses, each with its platform’s type.',
      compileNote:
        'Planned posts have no body and no date; WRITE THE POST turns each into a draft.',
      cancel: 'CANCEL',
      onDay: 'Dated {{date}}, the idea’s day.',
      unscheduled: 'Not scheduled, unless an idea has a day planned.',
      /** Every idea has a day planned (CON-485). */
      allDated: 'Each dated on its idea’s planned day.',
      /** No idea has a day planned (CON-485). */
      undated_one: 'Not scheduled: the idea has no day planned.',
      undated_other: 'Not scheduled: none of the ideas has a day planned.',
      compile: 'COMPILE',
      compileCount_one: 'COMPILE {{formatted}} PLANNED POST',
      compileCount_other: 'COMPILE {{formatted}} PLANNED POSTS',
      draft: 'DRAFT',
      draftCount_one: 'DRAFT {{formatted}} POST',
      draftCount_other: 'DRAFT {{formatted}} POSTS',
    },
    draftFailed: 'The drafts could not all be written',
    compileFailed: 'Couldn’t compile the idea',
    draftsKept_one: 'The {{formatted}} already written was kept.',
    draftsKept_other: 'The {{formatted}} already written were kept.',
    tooMany: 'Pick up to 10 ideas to compile or draft them',
    noBody: 'No body yet.',
    noBodyHint: 'Write it from the theses, or ask the assistant.',
    write: 'WRITE THE POST',
    writePrompt: 'Write this post in full from its theses.',
    builtFrom_one: 'Built from {{count}} idea',
    builtFrom_other: 'Built from {{count}} ideas',
    builtFromFailed: 'Couldn’t load the ideas this post was built from.',
  },
  bulk: {
    select: 'Select “{{title}}”',
    /** The list head's box: the ideas loaded, not every match. */
    selectPage: 'Select the ideas shown',
    /** The named step from a ticked page to every match in the pile. */
    selectAllIn_one: 'Select the {{formatted}} idea in “{{pile}}”',
    selectAllIn_other: 'Select all {{formatted}} ideas in “{{pile}}”',
    allIn_one: 'The {{formatted}} idea in “{{pile}}” is selected',
    allIn_other: 'All {{formatted}} ideas in “{{pile}}” are selected',
    /** Ticked but not on screen — in another pile, or not loaded. */
    elsewhere_one: '{{formatted}} more selected elsewhere',
    elsewhere_other: '{{formatted}} more selected elsewhere',
    clearAll: 'Clear the selection',
    tooMany: 'Narrow the filter to select all (up to 5,000).',
    count_one: '{{count}} selected',
    count_other: '{{count}} selected',
    delete: 'DELETE',
    done_one: 'Deleted {{count}} idea.',
    done_other: 'Deleted {{count}} ideas.',
    partial_one: 'Deleted {{count}} idea; {{failed}} couldn’t be deleted.',
    partial_other: 'Deleted {{count}} ideas; {{failed}} couldn’t be deleted.',
    failed: 'Could not delete the ideas. Some may still be there.',
  },
  /**
   * The filter as a sentence you edit (CON-391). One sentence per field
   * and operator, its chosen words marked `<v>`, so a language orders the
   * words its own way; the clauses are joined by `Intl.ListFormat`.
   */
  sentence: {
    /** `<clauses>` is the list of clauses, already joined. */
    showing: 'Showing ideas <clauses></clauses>',
    showingAll: 'Showing <v>all ideas</v>',
    clause: {
      origin: '<v>{{values}}</v>',
      origin_not: 'not <v>{{values}}</v>',
      source_asset: 'from <v>{{values}}</v>',
      source_asset_none: 'with <v>no document</v>',
      source_asset_not: 'not from <v>{{values}}</v>',
      campaign_id: 'in <v>{{values}}</v>',
      campaign_id_not: 'outside <v>{{values}}</v>',
      kind: 'that are <v>{{values}}</v>',
      kind_not: 'that aren’t <v>{{values}}</v>',
      fit: 'with a <v>{{values}}</v> fit',
      fit_unscored: '<v>not yet scored</v>',
      fit_not: 'without a <v>{{values}}</v> fit',
      phase: 'for the <v>{{values}}</v> phase',
      phase_not: 'outside the <v>{{values}}</v> phase',
      author: 'written by <v>{{values}}</v>',
      author_not: 'not written by <v>{{values}}</v>',
      created: 'added <v>{{values}}</v>',
      created_range: 'added <v>between {{from}} and {{to}}</v>',
      created_not: 'added <v>before {{values}}</v>',
      created_not_preset: 'added <v>{{values}}</v>',
      text: 'mentioning <v>“{{values}}”</v>',
      used: '<v>{{values}}</v>',
      /** Exactly the ideas an assistant card named (CON-510). */
      ids_one: 'limited to <v>this one</v>',
      ids_other: 'limited to <v>these {{formatted}}</v>',
    },
    origin: {
      asset_analysis: 'from documents',
      manual: 'written by people',
    },
    kind: {
      pdf: 'PDFs',
      web: 'web pages',
      audio: 'recordings',
      note: 'notes',
      image: 'images',
      document: 'documents',
      spreadsheet: 'spreadsheets',
      csv: 'CSVs',
      presentation: 'presentations',
    },
    fit: {
      high: 'high',
      medium: 'medium',
      low: 'low',
      unscored: 'unscored',
    },
    used: {
      unused: 'not used yet',
      used: 'used in a post',
    },
    created: {
      today: 'today',
      week: 'in the last 7 days',
      days30: 'in the last 30 days',
      month: 'this month',
    },
    createdBefore: {
      today: 'before today',
      week: 'more than 7 days ago',
      days30: 'more than 30 days ago',
      month: 'before this month',
    },
    noCampaign: 'no campaign',
    noDocument: 'no document',
    /** The question a clause's panel asks. */
    question: {
      origin: 'Ideas that came…',
      source_asset: 'Ideas taken from…',
      campaign_id: 'Ideas filed under…',
      kind: 'Ideas from documents that are…',
      fit: 'Ideas whose fit is…',
      phase: 'Ideas for the phase…',
      author: 'Ideas written by…',
      created: 'Ideas added…',
      text: 'Ideas mentioning…',
      used: 'Ideas that are…',
    },
    /** The two-word switch: the clause as it is, and left out. */
    include: {
      source_asset: 'from',
      campaign_id: 'in',
      kind: 'are',
      fit: 'with',
      phase: 'in',
      author: 'by',
      created: 'in',
    },
    exclude: {
      source_asset: 'not from',
      campaign_id: 'not in',
      kind: 'aren’t',
      fit: 'without',
      phase: 'not in',
      author: 'not by',
      created: 'before',
    },
    find: {
      source_asset: 'Find a document',
      campaign_id: 'Find a campaign',
      kind: 'Find a type',
      author: 'Find a person',
      phase: 'Find a phase',
    },
    textPlaceholder: 'Words in the title or note',
    /** How a detail starts, in the add-a-detail list. */
    starter: {
      origin: 'from documents, or written…',
      source_asset: 'from a document…',
      campaign_id: 'in a campaign…',
      kind: 'that are…',
      fit: 'with a … fit',
      phase: 'for a phase…',
      author: 'written by…',
      created: 'added…',
      used: 'used in a post, or not yet…',
    },
    starterHint: {
      kind: 'PDFs, web pages',
      created: 'last 7 days',
    },
    ideas_one: '{{formatted}} idea',
    ideas_other: '{{formatted}} ideas',
  },
  loadFailed: 'Unable to load ideas',
  saveFailed: 'Could not save that. Your ideas are unchanged.',
}
