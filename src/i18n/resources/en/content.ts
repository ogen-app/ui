export const content = {
  /** Provenance on an image the Figma plugin sent (CON-339). */
  figmaOrigin: {
    chip: 'From Figma',
  },
  /**
   * The documents list, at both scopes — `ContentPage` is one component and
   * two screens. The workspace's title is the module's name on its own,
   * because the rail's row is the whole address; the campaign's takes the
   * shape every other campaign section uses, `${campaign} ${section}`, so
   * the page says whose documents these are.
   */
  page: {
    title: 'Assets',
    /** The ADD CONTENT menu (CON-484 moved it into the catalogue). */
    add: {
      button: 'Add content',
      note: 'Write a note',
      upload: 'Upload file',
      webPage: 'Add a web page',
    },
    /** The page the assistant opened for a source (CON-484). */
    openedForSource:
      'Opened by the assistant — the request waits until a file is read.',
    back: 'Back',
  },

  /**
   * What to call each kind of asset, under its count on the preview cards
   * (`AssetKindTally`). "Text files" rather than "notes" for the first: it
   * holds both the notes written here and the markdown files uploaded, and
   * calling an upload a note would be the summary disagreeing with the row
   * it stands for. "Documents" are the office and text files document-service
   * reads (CON-280); "recordings" are audio (CON-282).
   */
  kinds: {
    text_one: 'text file',
    text_other: 'text files',
    page_one: 'web page',
    page_other: 'web pages',
    pdf_one: 'PDF',
    pdf_other: 'PDFs',
    document_one: 'document',
    document_other: 'documents',
    image_one: 'image',
    image_other: 'images',
    audio_one: 'recording',
    audio_other: 'recordings',
    /** Muted notes under the tiles — a state, not a fifth kind of thing. */
    waiting: '{{count}} still being read',
    unreadable: '{{count}} couldn’t be read',
  },

  /**
   * Shown in place of the editor for an asset this build can't open — in
   * practice, one whose `type` the server added after this version shipped
   * (CON-16 R32). It has to explain itself without naming the kind, because
   * not knowing the kind is the entire situation.
   *
   * The second sentence is the load-bearing one: someone who opened a thing
   * they uploaded and found no editor needs to be told the asset is intact,
   * or the reasonable next move is to delete and re-upload it.
   */
  unsupported: {
    title: "This isn't a document",
    body: 'This app version has no way to show this kind of asset. Nothing has been changed — it is still here, and a newer version will open it.',
  },

  /** The title field on the screens whose body isn't edited here. */
  titlePlaceholder: 'Title',
  titleLabel: 'Title',

  /** The size of an asset, under its name in a list (`lib/assetExtent`). */
  extent: {
    words_one: '{{formatted}} word',
    words_other: '{{formatted}} words',
    pages_one: '{{count}} page',
    pages_other: '{{count}} pages',
    waiting: 'Not read yet',
    nothing: 'Nothing extracted',
    noDescription: 'No description',
  },

  /**
   * The Assets list's rows (CON-370): columns, the kind mark, statuses
   * shown only when something is off, and the Ideas column's verdict pill.
   */
  list: {
    start: {
      addWebPage: 'Add a web page',
      upload: 'Upload files',
      write: 'Write a note',
    },
    /** The list's accessible name. */
    label: 'Documents',
    untitled: 'Untitled',
    selectRow: 'Select {{title}}',
    /** A group head's box, over its cards' boxes. */
    selectGroup: 'Select everything in {{group}}',
    justNow: 'just now',
    minutes_one: '{{count}} min',
    minutes_other: '{{count}} min',
    /** The facts line's date: `when` is a distance, "14 months ago". */
    publishedAgo: 'published {{when}}',
    addedAgo: 'added {{when}}',
    /** The card's one standing fact, and its mark's name, while it is read. */
    reading: 'Reading it…',
    /** …and when it couldn't be: the reason is where the summary would be. */
    failed: 'Couldn’t read it',
    /** After the reason a file failed. Nothing re-runs a PDF or an office file. */
    failedNext: 'Upload it again, or delete it.',
    noIdeas: 'No ideas came out of it',
    analyseAgain: 'Analyse again',
    /** A file on its way in, as a card at the list's head. */
    uploading: 'Uploading, {{progress}}%',
    retryUpload: 'Upload {{name}} again',
    dismissUpload: 'Dismiss {{name}}',
    /** The card's end: the ideas still waiting on it, opening that pile. */
    ideasWaiting_one: '{{formatted}} idea →',
    ideasWaiting_other: '{{formatted}} ideas →',
    /** A group band's fold, named for the group. */
    fold: 'Fold {{group}}',
    unfold: 'Unfold {{group}}',
    /** The asset's ideas, on hover over the next one. */
    otherIdeasLoading: 'Loading the ideas…',
    otherIdeasNone: 'No ideas from this reading.',
    /** An idea's fit score on its track (CON-385), 10–100. */
    fitScore: 'Fit {{score}} of 100',
    fitUnscored: 'Not scored',
    /** One idea's verdict on the hover card, as its mark's name. */
    ideaVerdict: {
      waiting: 'On the desk',
      yes: 'Making',
      later: 'In the drawer',
      no: 'Set aside',
    },
    /** The bands of the Date added grouping (CON-379). */
    band: {
      created: {
        '1d': 'Today',
        '7d': 'Past week',
        '30d': 'Past month',
        earlier: 'Earlier',
      },
    },
    status: {
      partial: 'Partial — not all of it was read',
      partialPage: 'Partial — page cut short',
      partialAudio: 'Partial — some of it wasn’t transcribed',
    },
    verdict: {
      waiting_one: '{{count}} on the desk',
      waiting_other: '{{count}} on the desk',
      yes_one: '{{count}} making',
      yes_other: '{{count}} making',
      later_one: '{{count}} in the drawer',
      later_other: '{{count}} in the drawer',
      no_one: '{{count}} set aside',
      no_other: '{{count}} set aside',
    },
    kind: {
      pdf: 'PDF',
      document: 'Document',
      spreadsheet: 'Spreadsheet',
      csv: 'CSV',
      web: 'Web page',
      presentation: 'Presentation',
      audio: 'Recording',
      image: 'Image',
      note: 'Note',
    },
  },
  /**
   * The Assets filter's values as a panel lists them (CON-371), and the
   * words both lists' filter sentences share: the count, the date step, the
   * keys and the empty state. How the sentence itself reads is
   * `content.sentence` (CON-392).
   */
  filter: {
    status: {
      partial: 'Partial',
      failed: 'Failed',
      pending: 'Processing',
      ready: 'Ready',
    },
    ideas: {
      undecided: 'On the desk',
      yes: 'Making',
      later: 'In the drawer',
      no: 'Set aside',
      none: 'No ideas found',
      unread: 'Not read yet',
    },
    updated: {
      today: 'Today',
      week: 'Last 7 days',
      days30: 'Last 30 days',
      month: 'This month',
      custom: 'Custom range…',
      date: 'A date…',
      from: 'From',
      to: 'To',
      on: 'Before',
      apply: 'Apply',
    },
    noCampaign: 'No campaign',
    noTags: 'No tags',
    unknownCampaign: 'A deleted campaign',
    unknownTag: 'A deleted tag',
    count_one: '{{shown}} of {{total}}',
    count_other: '{{shown}} of {{total}}',
    textTooShort_one: 'Type at least {{count}} character',
    textTooShort_other: 'Type at least {{count}} characters',
    nothingMatches: 'Nothing matches that',
    matchAt: '{{place}} ·',
    loadingMore: 'Loading more…',
    loadFailed: 'Unable to load these assets. Try removing a filter.',
    keys: {
      move: 'move',
      pick: 'pick',
      close: 'close',
      escape: 'esc',
    },
    empty: {
      title: 'No assets match these filters',
      removing_one: 'Removing “{{filter}}” would show {{formatted}}.',
      removing_other: 'Removing “{{filter}}” would show {{formatted}}.',
      remove: 'Remove “{{filter}}”',
      clearAll: 'Clear all filters',
    },
  },
  /**
   * The Assets filter's pills (CON-392): one catalogue sentence per field
   * and operator, its chosen words marked `<v>`.
   */
  sentence: {
    clause: {
      kind: '<v>{{values}}</v>',
      kind_not: 'that aren’t <v>{{values}}</v>',
      campaign: 'in <v>{{values}}</v>',
      campaign_not: 'outside <v>{{values}}</v>',
      tag: 'tagged <v>{{values}}</v>',
      tag_none: 'with <v>no tags</v>',
      tag_not: 'not tagged <v>{{values}}</v>',
      title: 'with <v>{{values}}</v> in the title',
      title_not: 'without <v>{{values}}</v> in the title',
      status: '<v>{{values}}</v>',
      status_not: 'not <v>{{values}}</v>',
      updated: 'updated <v>{{values}}</v>',
      updated_range: 'updated <v>between {{from}} and {{to}}</v>',
      updated_not: 'updated <v>before {{values}}</v>',
      ideas: 'with ideas <v>{{values}}</v>',
      ideas_none: 'with <v>no ideas</v>',
      ideas_unread: '<v>not analysed yet</v>',
      ideas_not: 'without ideas <v>{{values}}</v>',
      text: 'mentioning <v>“{{values}}”</v>',
    },
    quoted: '“{{text}}”',
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
    status: {
      partial: 'only partly read',
      pending: 'still being read',
      failed: 'that couldn’t be read',
      ready: 'ready',
    },
    ideas: {
      undecided: 'on the desk',
      yes: 'making',
      later: 'in the drawer',
      no: 'set aside',
      none: 'none',
      unread: 'not analysed yet',
    },
    updated: {
      today: 'today',
      week: 'in the last 7 days',
      days30: 'in the last 30 days',
      month: 'this month',
    },
    noCampaign: 'no campaign',
    question: {
      kind: 'Assets that are…',
      campaign: 'Assets filed under…',
      tag: 'Assets tagged…',
      title: 'Assets with, in the title…',
      status: 'Assets that are…',
      updated: 'Assets updated…',
      ideas: 'Assets with ideas…',
      text: 'Assets mentioning…',
    },
    include: {
      kind: 'are',
      campaign: 'in',
      tag: 'tagged',
      title: 'with',
      status: 'are',
      updated: 'in',
      ideas: 'with',
    },
    exclude: {
      kind: 'aren’t',
      campaign: 'not in',
      tag: 'not tagged',
      title: 'without',
      status: 'aren’t',
      updated: 'before',
      ideas: 'without',
    },
    find: {
      kind: 'Find a type',
      campaign: 'Find a campaign',
      tag: 'Find a tag',
    },
    textPlaceholder: {
      title: 'Words in the title, comma-separated',
      text: 'Words inside the documents',
    },
    starter: {
      kind: 'that are…',
      campaign: 'in a campaign…',
      tag: 'tagged…',
      title: 'with “…” in the title',
      status: 'read…',
      updated: 'updated…',
      ideas: 'with ideas…',
    },
    starterHint: {
      kind: 'PDFs, web pages',
      status: 'partly, not yet',
      updated: 'last 7 days',
      ideas: 'on the desk, making',
    },
    assets_one: '{{formatted}} asset',
    assets_other: '{{formatted}} assets',
  },

  /**
   * An uploaded file an ingestion service is still reading, or has given up
   * on (`AssetIngestState`). The failure's own reason comes from the asset's
   * `failure_code`, worded by `uploads.errors`; this is the frame around it.
   */
  ingest: {
    readingTitle: 'Reading this file',
    readingBody:
      'This happens in the background and can take a few minutes. You can leave — it fills in here on its own, and the campaign can use it as soon as it does.',
    failedTitle: "We couldn't read this file",
    failedUnstated:
      "The server didn't say why. Delete it and upload it again, or try a different copy of the file.",
  },

  /**
   * A PDF or an office document's extracted text, shown read-only
   * (`AssetExtractedView`, CON-312). The server refuses edits to it, because
   * saving would re-chunk the text and lose where each part came from.
   */
  extracted: {
    readOnly:
      'This is the text read out of the file, in the sections the assistant cites. It can’t be edited here — upload a new version to change it.',
    partial:
      'Only part of this file could be read. The rest is not searchable.',
    empty: 'Nothing could be read from this file — it may only contain images.',
    loadFailed: "This file's text couldn't be loaded. Try reloading the page.",
    shown: 'Showing {{shown}} of {{total}} sections',
    more: 'Show more',
    page: 'Page {{page}}',
    pages: 'Pages {{from}}–{{to}}',
  },

  /**
   * A recording's screen (`AssetAudioView`, CON-282): the player, and the
   * transcript the audio service wrote — read-only, like a PDF's text.
   */
  audio: {
    transcript: 'Transcript',
    playFrom: 'Play from {{time}}',
    normalizing: 'Preparing the recording…',
    progress: 'Transcribed {{done}} of {{total}} parts',
    partial: 'Some parts of the recording could not be transcribed.',
    empty: 'No speech was found in this recording.',
    loadFailed: "The transcript couldn't be loaded. Try reloading the page.",
    /** The file never reached storage — a deployment fault, not a bad file. */
    missing: 'This recording was not stored, so there is nothing to play.',
    retry_one: 'Retry the failed part',
    retry_other: 'Retry the {{count}} failed parts',
    /** Runs the whole transcription again and replaces the transcript. */
    reextract: 'Transcribe again',
  },

  /** A PUT that tried to change ingested text (CON-312 `content_locked`). */
  locked: {
    title: "This file's text can't be edited",
    body: 'It was read out of the uploaded file. Upload a new version to change it.',
  },

  /**
   * An image asset's screen (CON-246). The two text fields are the whole
   * point of it, so their help lines carry the distinction rather than
   * leaving it to be guessed from the labels: one is read out to a person,
   * the other is read by the assistant looking for a picture.
   */
  image: {
    altLabel: 'Alt text',
    altPlaceholder: 'A person at a workbench, holding a dental implant',
    altHelp:
      'What someone who cannot see the picture is told it is. It travels with the image when it goes onto a post.',
    /** Only shown near the cap, so it says what is left rather than what is used. */
    altCount_one: '{{count}} character left',
    altCount_other: '{{count}} characters left',
    descriptionLabel: 'Description',
    descriptionPlaceholder:
      'What is in this picture, and what it is for — the words that should find it.',
    descriptionHelp:
      'Not shown to anyone. This is what the assistant searches when it looks for a picture to use.',
    tagsLabel: 'Tags',
    tagsPlaceholder: 'Add a tag…',
    /**
     * Tags are the only field here that isn't about this picture — it is
     * about finding it among the others, which is the thing the filter above
     * the list has always been able to do and nothing has been able to set.
     */
    tagsHelp: 'How you find this image again in the list.',
    /** The bytes never reached storage — a deployment fault, not a bad file. */
    missing: 'This image was not stored, so there is nothing to show.',
    animated: 'Animated',
    /** Shown instead of `altHelp` while the alt text is image-service's. */
    altGenerated:
      'Written automatically from the picture. Edit it to make it yours — reading the image again keeps what you write.',
    /** Replaces the alt text on the spot, a person's included. */
    altRegenerate: 'Write a new one',
    /** The heading over a failed or partial reading, above its reason. */
    failedTitle: "This image wasn't processed",
    partialTitle: 'This image was only partly processed',
    partial:
      'The picture was described, but the text in it could not all be read.',
    reextract: 'Read again',
    undrawable:
      "This image's format can't be shown in a browser, and no viewable copy was made.",
  },

  /** The list head over a ticked selection in the documents list. */
  selection: {
    count_one: '{{count}} selected',
    count_other: '{{count}} selected',
    delete: 'Delete',
    /** The head's box: the documents loaded, not every match. */
    selectPage: 'Select the documents shown',
    /** The named step from a ticked page to every match. */
    selectAll_one: 'Select the {{formatted}} document',
    selectAll_other: 'Select all {{formatted}} documents',
    allSelected_one: 'The {{formatted}} document is selected',
    allSelected_other: 'All {{formatted}} documents are selected',
    /** Ticked but not loaded — the assistant's choice, say. */
    elsewhere_one: '{{formatted}} more selected elsewhere',
    elsewhere_other: '{{formatted}} more selected elsewhere',
    clearAll: 'Clear the selection',
    failed: 'Unable to select every match',
  },

  /**
   * The line between the filter bar and the list (CON-378): how much is left
   * to answer, and how the list is grouped and sorted.
   */
  view: {
    /**
     * `<ideas>` links to where they are answered. `documents` is
     * `content.view.documents`: the filtered count, or all of them.
     */
    undecided_one:
      '<ideas>{{formatted}} idea</ideas> from {{documents}} is on the desk.',
    undecided_other:
      '<ideas>{{formatted}} ideas</ideas> from {{documents}} are on the desk.',
    documents_one: '{{formatted}} document',
    documents_other: '{{formatted}} documents',
    groupBy: 'Group by',
    groupByHeading: 'Group by',
    sortBy: 'Sort',
    group: {
      created: 'Date added',
      campaign: 'Campaign',
      tag: 'Tag',
      kind: 'Type',
      none: 'No grouping',
    },
    /** Beside an option in the menu: what is not obvious about it. */
    groupHint: {
      tag: 'once per tag',
    },
    sort: {
      updatedNewest: 'Recently updated',
      updatedOldest: 'Least recently updated',
      addedNewest: 'Newest first',
      addedOldest: 'Oldest first',
      titleAsc: 'Title A–Z',
      titleDesc: 'Title Z–A',
      relevance: 'Best match',
    },
  },

  /**
   * Confirmation for deleting documents — one row's bin, or a whole ticked
   * selection. Both, now: the row used to delete on one click, on the
   * argument that a mistake among twenty rows is visible immediately. It
   * isn't. There is no undo anywhere in the product and the bin sits inches
   * from the row click that opens the document, so the cheapest gesture on
   * the screen was also the only unrecoverable one.
   *
   * A single row is named, because the dialog can be: it is the one fact
   * that tells a misclick from the delete that was meant. A selection says
   * how many instead — the names would be a list, and the count is what the
   * reader checks against what they think they ticked.
   */
  delete: {
    titleNamed: 'Delete "{{title}}"?',
    title_one: 'Delete this document?',
    title_other: 'Delete {{count}} documents?',
    /** What else stops working, which is the part a list can't show. */
    bodyCampaign_one:
      'This document will be permanently deleted, and this campaign will stop writing from it. This cannot be undone.',
    bodyCampaign_other:
      'These documents will be permanently deleted, and this campaign will stop writing from them. This cannot be undone.',
    bodyBank_one:
      'This document will be permanently deleted, and any campaign using it will stop writing from it. This cannot be undone.',
    bodyBank_other:
      'These documents will be permanently deleted, and any campaign using them will stop writing from them. This cannot be undone.',
    keep_one: 'Keep document',
    keep_other: 'Keep documents',
    confirm_one: 'Delete document',
    confirm_other: 'Delete {{count}} documents',
    done_one: '{{count}} document deleted',
    done_other: '{{count}} documents deleted',
    failed_one: '{{count}} document couldn’t be deleted',
    failed_other: '{{count}} documents couldn’t be deleted',
  },

  /**
   * Filing a selection of documents under tags (CON-279).
   *
   * `addHelp` says what happens to a document that already carries the tag,
   * because that is the question a half-tagged selection raises and the
   * answer — nothing — is the reason this can be used without checking each
   * row first.
   */
  tagging: {
    action: 'Tag',
    title_one: 'Tag this document',
    title_other: 'Tag {{count}} documents',
    addLabel: 'Add tags',
    addPlaceholder: 'Add a tag…',
    addHelp:
      'Every selected document gets these. Ones that already have a tag are left as they are.',
    removeLabel: 'Remove tags',
    removeHelp: 'Click a tag to take it off the documents that carry it.',
    removeNone: 'Nothing in this selection is tagged yet.',
    /** Sits inside the chip, so it is the count alone rather than a sentence. */
    onCount: 'on {{count}} of {{total}}',
    cancel: 'Cancel',
    submit: 'Apply',
    done_one: '{{count}} document updated',
    done_other: '{{count}} documents updated',
  },
}
