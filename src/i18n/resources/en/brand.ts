/**
 * The Content Bank. Still largely hard-coded English (CON-174) — these are
 * the strings converted so far, not the screen's full copy.
 */
/**
 * The Campaigns list and the lifecycle actions on a campaign (CON-156).
 *
 * Archive and delete are described in terms of what happens to the *posts*,
 * because that is what a campaign is made of and what someone is really
 * asking about. Neither describes the server's soft delete: the row it keeps
 * is a safety net for us, not an undo for the user, and hinting at one would
 * be a promise nothing in the product can keep.
 */
/**
 * The Brand *binding* — the pickers a campaign and a post use to choose out
 * of the workspace's library (CON-245). Only the binding: the Brand screens
 * themselves are still hard-coded English and are legacy to be converted,
 * not a precedent (CON-174).
 *
 * The two hints are the load-bearing strings. Each says how many may be
 * picked and what happens when nothing is, because both controls clear on a
 * second click and neither has a "None" row to make that visible — a picker
 * that silently means "the workspace default" has to say so somewhere.
 */
export const brand = {
  /**
   * Ticking entries in a library (CON-472): a selection to ask the
   * assistant about, so its bar only says how many and clears.
   */
  selection: {
    select: 'Select “{{name}}”',
    fact_one: '{{formatted}} fact selected',
    fact_other: '{{formatted}} facts selected',
    selectAll: 'Select every fact shown',
    clearAll: 'Clear the selection',
    clear: 'CLEAR',
    /** The facts ledger's bulk removal, which asks first. */
    remove: 'REMOVE',
  },
  binding: {
    voice: 'Voice',
    audience: 'Audience',
    campaignVoiceHint:
      'Every post in this campaign is written in this voice. One post can still pick another, on the post.',
    campaignAudienceHint:
      'Every post in this campaign is written to these people. One post can still address somebody else, on the post.',
    workspaceDefault: 'Workspace default — {{name}}',
    manageVoices: 'Edit voices',
    manageAudiences: 'Edit audiences',
    noVoice: 'No voice',
    noAudience: 'No audience',
    sourcePost: 'Set on this post',
    sourceCampaign: 'From the campaign',
    sourceLibrary: "The workspace's default",
    reset: 'RESET',
    resetHint: 'Go back to what the campaign says',
    emptyTitle: 'Voice and audience',
    emptyBody:
      'This workspace has no voices or audiences yet. They are written once and every campaign draws on them.',
    emptyShort: 'This workspace has no voices or audiences yet.',
    openBrand: 'Open Foundation',
    saveError: 'Unable to save the campaign voice',
  },

  /**
   * The five sections, as the app names and marks them.
   *
   * The words for what `BRAND_SECTIONS` used to carry inline. That table now
   * holds behaviour only — the glyph, the hue, who reads the section, whether
   * it is offered — and a module-level `const` can no longer freeze whichever
   * language happened to load first. Keyed by `BrandSectionId`, so a section
   * added to the table without copy here does not compile.
   *
   * One entry heads two places: the Overview's card and the intro card of the
   * page that card opens. Renaming one renames both, which is the point of
   * their being one entry.
   */
  sections: {
    voices: {
      label: 'Voices',
      description:
        'A voice is three to eight real posts you would be happy to have written, and the app writes from those rather than from an adjective. Several is normal: sarcastic commentary and the company page are not two tones of one personality.',
      whenEmpty:
        'No voice of its own — everything generated here sounds generated.',
    },
    audiences: {
      label: 'Audiences',
      description:
        'Who the posts are written to, described by what follows from it: where they read, what makes them scroll past, and what they need before they believe a number. Every campaign asks who this is for, and this is where the answer comes from.',
      whenEmpty: 'Nobody in particular is being written to.',
    },
    guardrails: {
      label: 'Guardrails',
      description:
        'What is true, what may be claimed, and what may never be. These are the rules nobody opts out of — they hold for every generated post whichever voice wrote it, and the more convincing the voice, the more convincing the invention they exist to stop.',
      whenEmpty: 'Nothing is off limits. Any voice here may promise anything.',
    },
    facts: {
      label: 'Facts',
      description:
        'What is true — about this business, about the problems its readers have, and about the openings nobody has taken — one statement at a time, with where it came from and the date it stops being repeatable. Everything a generated post states as a figure comes from here, or is invented.',
      whenEmpty:
        'Nothing is stated as true. Every figure in every post is invention, written confidently.',
    },
    series: {
      label: 'Series',
      description:
        'The recurring things this workspace makes — a weekly digest, a profile that runs twice a month. Each one is a name the audience would recognise and a recipe for building the next one, so the tenth is as good as the first and nobody starts from a blank page.',
      whenEmpty:
        'Nothing recurs. Every post starts from scratch, and nothing can be measured as a run.',
    },
    look: {
      label: 'Look',
      description:
        'Logos with a declared job, colours with roles, type, and imagery to work from. Enough for the app to make a picture that looks like yours without stopping to ask which of four files goes in the corner.',
      whenEmpty:
        'No logo, no colours, no type — generated images land wherever the model puts them.',
    },
    templates: {
      label: 'Templates',
      description:
        'A full-canvas frame per platform and per ratio — not a layout engine, which is why nothing here reflows. A set that misses a ratio its platform posts in is unusable there, so the screen leads with platforms rather than with sets.',
      whenEmpty:
        'Pictures go out bare. Nothing marks one as yours once it has left the app.',
    },
  },

  /** The facts ledger's refusals, said beside the statement (CON-316). */
  factsLedger: {
    duplicate: 'This workspace already has that statement as a fact.',
    gone: 'Someone removed this fact while it was open. The ledger has been refreshed.',
    saveFailed: 'The fact could not be saved. Try again.',
    /** The ledger's table. */
    table: {
      statement: 'Statement',
      about: 'About',
      kind: 'Kind',
      source: 'Source',
      added: 'Added',
      checked: 'Checked',
      expires: 'Expires',
      notWritten: 'Not written yet',
      nobodySaid: 'nobody said',
      never: 'never',
      noExpiry: 'doesn’t expire',
      expiredOn: 'Expired {{date}}',
      expiresOn: 'Expires {{date}}',
      remove: 'Remove “{{statement}}”',
      removeUnnamed: 'Remove this fact',
    },
    /** Asking before facts go: one named, several counted. */
    remove: {
      titleNamed: 'Remove “{{statement}}”?',
      title_one: 'Remove {{formatted}} fact?',
      title_other: 'Remove {{formatted}} facts?',
      body_one:
        'Posts written from now on won’t be able to state it. Nothing brings it back.',
      body_other:
        'Posts written from now on won’t be able to state them. Nothing brings them back.',
      keep_one: 'KEEP IT',
      keep_other: 'KEEP THEM',
      confirm_one: 'REMOVE FACT',
      confirm_other: 'REMOVE {{formatted}} FACTS',
    },
  },
  /**
   * The counts a piece of material is described by — `components/brand/
   * format.ts`, which takes `t` as its first argument for exactly this.
   *
   * `samplesNone` and `usageNever` are separate keys rather than a `_zero`
   * plural: both are the sentence a *missing* thing gets rather than a count
   * of zero, and the English happens to agree with that reading while other
   * languages need not.
   */
  facts: {
    samplesNone: 'no samples',
    samples_one: '{{count}} sample',
    samples_other: '{{count}} samples',
    usagePublished: '{{count}} published',
    usageDrafts: '{{count}} in draft',
    usageNever: 'never used',
    /**
     * Which campaigns use a voice or an audience (`useUsedBy`). A voice a
     * campaign does not choose is the workspace default's, and says so;
     * `{{campaigns}}` is a joined list of names, the last item possibly
     * `usedByMore`.
     */
    usedByChosen: 'Chosen by {{campaigns}}',
    usedByDefault: 'The default for {{campaigns}}',
    usedByBoth: 'Chosen by {{chosen}}; the default for {{inherited}}',
    usedByNone: 'No campaign uses it',
    usedByMore_one: '{{count}} more',
    usedByMore_other: '{{count}} more',
    /**
     * How the parts of a fact are joined — a comma and a space in English.
     * On the catalogue rather than in the helper because the separator is a
     * property of the language, and a hard-coded `', '` is the same class of
     * bug as a hard-coded date format.
     */
    separator: ', ',
  },

  /** The furniture every Brand screen is built from — `shell.tsx`. */
  shell: {
    /** The word beside the star. Lower case is deliberate — it sits in a row of facts. */
    default: 'default',
    chipMore: '+{{count}} more',
    origin: {
      blank: 'Written here',
      template: 'From a template',
      website: 'Read off the website',
      posts: 'Learned from published posts',
      promoted: 'Saved from a post',
      document: 'Taken from a document',
      questions: 'From your answers',
    },
    /** The detail beside `origin.posts` — how many posts it was learned from. */
    originPostCount_one: '{{count}} post',
    originPostCount_other: '{{count}} posts',
    offer: {
      dismiss: "Don't offer this again",
      title: 'Fill this in from what you already have',
      /** Names the three routes, so the sentence stands without its tiles. */
      body: 'One pass fills {{fills}} — from your website, a document you already have, or a handful of questions. Your own words, not a template, and you see everything it proposes before any of it is saved.',
      website: {
        title: 'Read it off your website',
        body: 'Voice samples from your own copy, the disclaimer you already run, and the product facts behind every claim.',
      },
      document: {
        title: 'Take it from a document',
        body: 'A brand deck, a tone-of-voice PDF, an old style guide. Whatever it was written in works as well as the site does.',
      },
      questions: {
        title: 'Answer a handful of questions',
        body: 'For when none of it is written down anywhere. Ogen drafts it with you and you correct it.',
      },
      /**
       * The sections named *inside* `body`, which is why these are their own
       * keys rather than `sections.<id>.label`. A heading and a noun in the
       * middle of a sentence are two forms of one word, and English writes
       * them differently; a language that capitalises differently again
       * needs both spellings available rather than one derived from the
       * other by the client.
       */
      fills: {
        voices: 'voices',
        audiences: 'audiences',
        guardrails: 'guardrails',
        facts: 'the facts',
      },
    },
  },

  /**
   * Brand from what you have (CON-400) — reading a brand off the website, a
   * document or a handful of answers, reviewing what it proposes, and saving
   * what is kept. Everything under `components/brand/distill`.
   */
  distill: {
    cancel: 'CANCEL',
    offer: {
      /** Before the two routes not chosen, demoted to links under a rule. */
      or: 'Or',
      resumeReading: 'Reading {{what}}',
      resumeReady: '{{what}} is read — review what it proposes',
      resumeReadingBody:
        'It carries on without you. Open it to watch, or come back when Ogen says it is ready.',
      resumeReadyBody:
        'Nothing is saved to your Foundation until you have been through it.',
      resumeFiles_one: '{{count}} file',
      resumeFiles_other: '{{count}} files',
      resumeAnswers: 'Your answers',
    },
    website: {
      label: 'Your website',
      placeholder: 'acme.com',
      invalid: "That doesn't look like a web address.",
      what: 'We read up to ten pages — home, about, what you sell, pricing, terms, and a couple of recent posts. They stay in Assets afterwards, like any page you add.',
      read: 'READ THE SITE',
    },
    document: {
      formats:
        'PDF, Word, PowerPoint, Excel, OpenDocument, EPUB, Markdown, email, audio, images',
      inAssets: 'Already in Assets',
      search: 'Search your assets',
      none: 'Nothing in Assets yet — drop a file above.',
      noMatch: 'Nothing in Assets matches that.',
      chosen_one: '{{count}} chosen',
      chosen_other: '{{count}} chosen',
      read_one: 'READ {{count}} FILE',
      read_other: 'READ {{count}} FILES',
      uploading: 'uploading {{percent}}%',
      processing: 'reading',
      ready: 'ready',
      uploadFailed: "couldn't upload",
    },
    /** Why a read was refused before it started, said where it was asked. */
    refusal: {
      invalidUrl: "That address can't be read — it has to be a public website.",
      scrapingUnavailable: 'Reading websites is not set up here yet.',
      gateOff: 'Your plan does not include reading a brand.',
      unavailable:
        'Reading a brand is not available right now. Try again in a minute.',
      failed: "That didn't start. Try again in a minute.",
    },
    page: {
      reading: 'Reading {{what}}',
      draftingAnswers: 'Drafting from your answers',
      readOff: 'What we read off {{what}}',
      readIn: 'What we read in {{what}}',
      fromAnswers: 'What we drafted from your answers',
      missingHeader: 'No such read',
      missingMessage:
        'This read does not exist in this workspace, or it was removed.',
    },
    reading: {
      steps: {
        finding: 'Finding the pages',
        readingPages: 'Reading the pages',
        readingFiles: 'Reading the files',
        drafting: 'Drafting voices, audiences, guardrails and facts',
        checking: 'Checking every line against what you wrote',
        checkingAnswers: 'Checking every line against your answers',
      },
      found_one: '{{count}} found, {{chosen}} chosen',
      found_other: '{{count}} found, {{chosen}} chosen',
      homepageOnly: 'the site had no map, so the homepage alone',
      progress: '{{done}} of {{total}}',
      /** What a page was read for — judged from its address. */
      kind: {
        home: 'home',
        about: 'about',
        product: 'what you sell',
        pricing: 'pricing',
        legal: 'terms',
        article: 'a post',
      },
      reading: 'reading',
      truncated: 'read in part',
      overLimit: 'over your page limit',
      thin: 'too little text',
      timedOut: 'took too long',
      failed: "couldn't be read",
      title: 'Progress',
      leave:
        'This takes a few minutes. You can leave — it carries on, and Ogen lets you know when it is ready to look at. Nothing is saved to your Foundation until you say so.',
      pagesLand:
        'The pages land in Assets as they are read, so the assistant can search them too. Reading the site again later refreshes them instead of adding copies.',
    },
    /** Counted phrases, joined by the language's list format. */
    count: {
      voices_one: '{{count}} voice',
      voices_other: '{{count}} voices',
      audiences_one: '{{count}} audience',
      audiences_other: '{{count}} audiences',
      lines_one: '{{count}} guardrail line',
      lines_other: '{{count}} guardrail lines',
      words_one: '{{count}} banned word',
      words_other: '{{count}} banned words',
      disclaimer: 'the disclaimer',
      facts_one: '{{count}} fact',
      facts_other: '{{count}} facts',
    },
    summary: {
      title: 'Summary',
      fromPages_one: 'From {{count}} page of {{site}}',
      fromPages_other: 'From {{count}} pages of {{site}}',
      fromFile: 'From {{title}}',
      fromFiles_one: 'From {{count}} file',
      fromFiles_other: 'From {{count}} files',
      fromAnswers: 'From your answers',
      files_one: '{{count}} file',
      files_other: '{{count}} files',
      proposes:
        '{{from}}, Ogen proposes {{what}} — every one quoting where it came from. Keep, change or drop each; only what you keep is saved.',
      nothing: '{{from}}, Ogen found nothing new to propose.',
      leftOut: 'Left out: {{what}}.',
      leftDuplicate_one: '{{count}} item you already have',
      leftDuplicate_other: '{{count}} items you already have',
      leftUngrounded: {
        site_one: "{{count}} line that wasn't word for word on the site",
        site_other: "{{count}} lines that weren't word for word on the site",
        files_one: "{{count}} line that wasn't word for word in the files",
        files_other: "{{count}} lines that weren't word for word in the files",
        answers_one: "{{count}} line your answers didn't back up",
        answers_other: "{{count}} lines your answers didn't back up",
      },
      leftLimit_one: '{{count}} item over your Foundation’s limits',
      leftLimit_other: '{{count}} items over your Foundation’s limits',
      gaps: {
        website_one: 'There is {{count}} thing the site didn’t say.',
        website_other: 'There are {{count}} things the site didn’t say.',
        document_one: 'There is {{count}} thing the files didn’t say.',
        document_other: 'There are {{count}} things the files didn’t say.',
        questions_one: 'There is {{count}} thing your answers left open.',
        questions_other: 'There are {{count}} things your answers left open.',
      },
      answer_one: 'Answer {{count}} question',
      answer_other: 'Answer {{count}} questions',
    },
    gaps: {
      close: 'Close the questions',
      title: {
        website_one: '{{count}} thing the site didn’t say',
        website_other: '{{count}} things the site didn’t say',
        document_one: '{{count}} thing the files didn’t say',
        document_other: '{{count}} things the files didn’t say',
        questions_one: '{{count}} thing your answers left open',
        questions_other: '{{count}} things your answers left open',
      },
      /** Between the section a question would fill and why it is asked. */
      whyJoin: ' — ',
      /** Over the questions; answers confirmed in the rail fill them in. */
      label_one: '{{formatted}} question · answers fill in as you confirm',
      label_other: '{{formatted}} questions · answers fill in as you confirm',
      placeholder: 'Your answer…',
      note: {
        website:
          'Answering drafts the proposal again with your answers in it, without reading the site again. What you have kept, dropped or edited so far stays as you left it.',
        document:
          'Answering drafts the proposal again with your answers in it, without reading the files again. What you have kept, dropped or edited so far stays as you left it.',
        questions:
          'Answering drafts the proposal again with these answers added. What you have kept, dropped or edited so far stays as you left it.',
      },
      ask: 'Ask again with these',
    },
    questions: {
      title: 'A handful of questions',
      cardTitle: 'Questions',
      intro:
        'Answer what you can and skip the rest. Ogen drafts voices, audiences, guardrails and facts from your words, and you review them before anything is saved — the same as reading a website.',
      placeholder: 'Skip, or say it in a line or two',
      unavailable: "The questions couldn't be loaded. Try again in a minute.",
      answered: '{{answered}} of {{count}} answered',
      draft: 'Draft it',
      /** The server's seven starter questions, by their stable ids. */
      starter: {
        q_offer: 'What do you sell, and who buys it?',
        q_three_words: 'Three words a customer would use about you.',
        q_never_post: 'A sentence you would never post.',
        q_not_for: 'Who are you not for?',
        q_proof: 'What can you prove?',
        q_legal: 'What does legal not let you say?',
        q_disclaimer: 'The disclaimer you already run, if any.',
      },
    },
    source: {
      from: 'From',
      answer: 'your answer',
      answerTo: 'your answer to “{{question}}”',
    },
    review: {
      proposed_one: '{{count}} proposed',
      proposed_other: '{{count}} proposed',
      proposedNoneYet_one: '{{count}} proposed · you have none',
      proposedNoneYet_other: '{{count}} proposed · you have none',
      lines_one: '{{count}} line',
      lines_other: '{{count}} lines',
      words_one: '{{count}} word',
      words_other: '{{count}} words',
      qualifierJoin: ', ',
      keepOrDrop: 'Keep or drop',
      keep: 'Keep',
      drop: 'Drop',
      keepLine: 'Keep “{{line}}”',
      dropLine: 'Drop “{{line}}”',
      edit: 'EDIT',
      done: 'DONE',
      undo: 'UNDO',
      dropped: 'dropped',
      becomesDefault: 'becomes your default',
      voiceName: 'Name',
      whenToUse: 'When to use it',
      audienceName: 'Name',
      who: 'Who they are',
      removeSample: 'Remove this sample',
      samplesFrom: {
        site_one: '{{count}} sample, word for word from the site',
        site_other: '{{count}} samples, each word for word from the site',
        files_one: '{{count}} sample, word for word from the files',
        files_other: '{{count}} samples, each word for word from the files',
        answers_one: '{{count}} sample, from your answers',
        answers_other: '{{count}} samples, from your answers',
      },
      thinVoice_one:
        'One sample. There was only one passage in this voice — one is an example, three is a pattern. Add one, or keep it thin and add later.',
      thinVoice_other:
        '{{count}} samples. There were only {{count}} passages in this voice — one is an example, three is a pattern. Add one, or keep it thin and add later.',
      line: 'Line',
      disclaimerDiffers:
        'The site’s differs from yours. Keep yours unless you choose it.',
      compare: 'COMPARE',
      keepYours: 'Keep yours',
      useTheirs: 'Use the one from the site',
      writtenHereOn: 'Written here · {{date}}',
      disclaimerRule: 'Nothing is replaced unless you pick the site’s.',
      factColumns: {
        statement: 'Statement',
        about: 'About',
        kind: 'Kind',
        expires: 'Expires',
      },
      noExpiry: 'Does not expire',
      moreFacts_one: 'Show {{count}} more fact',
      moreFacts_other: 'Show {{count}} more facts',
      openPage: 'Open the page',
      openFile: 'Open the file',
      kept: '{{kept}} of {{count}} kept',
      keptShort: '{{kept}}/{{count}}',
      discard: 'Discard',
      save: 'Save to Foundation',
    },
    saved: {
      title: 'Saved to your Foundation',
      nothing: 'nothing new',
      fromWebsite: '{{what}}, read off {{site}}.',
      fromDocument: '{{what}}, taken from {{title}}.',
      fromAnswers: '{{what}}, from your answers.',
      duplicateFacts_one:
        '{{count}} fact was already in your ledger, so it was left as it was.',
      duplicateFacts_other:
        '{{count}} facts were already in your ledger, so they were left as they were.',
      duplicateItems_one:
        '{{count}} item was already in your Foundation, so it was left as it was.',
      duplicateItems_other:
        '{{count}} items were already in your Foundation, so they were left as they were.',
      overLimit_one:
        '{{count}} item didn’t fit under your Foundation’s limits and was not saved.',
      overLimit_other:
        '{{count}} items didn’t fit under your Foundation’s limits and were not saved.',
    },
    failed: {
      title: 'This read didn’t finish',
      nothingTitle: {
        website: 'Not enough on the site to go on',
        document: 'Not enough in the files to go on',
        questions: 'Not enough in the answers to go on',
      },
      nothingBody: {
        website_one:
          'Ogen read {{count}} page but found almost no text on it — often a site that builds its pages in the browser, where what comes back is menus and a cookie banner. Nothing was proposed, and this read did not count against your allowance.',
        website_other:
          'Ogen read {{count}} pages but found almost no text on them — often a site that builds its pages in the browser, where what comes back is menus and a cookie banner. Nothing was proposed, and this read did not count against your allowance.',
        document_one:
          'Ogen found almost no text in the file — a scan, or an image with no words in it. Nothing was proposed, and this read did not count against your allowance.',
        document_other:
          'Ogen found almost no text in the {{count}} files — scans, or images with no words in them. Nothing was proposed, and this read did not count against your allowance.',
        questions_one:
          'There was too little in the answers to draft from. Nothing was proposed, and this read did not count against your allowance.',
        questions_other:
          'There was too little in the answers to draft from. Nothing was proposed, and this read did not count against your allowance.',
      },
      source: {
        thin: 'too little text',
        failed: "couldn't be read",
        overLimit: 'over your page limit',
        timedOut: 'took too long',
        read: 'read',
      },
      tryInstead: 'Try instead',
      instead: {
        website: 'A site often says more than a single file does.',
        document: 'A deck or a style guide reads better than a site like this.',
        questions: 'Seven questions; skip any you like.',
      },
      reason: {
        scraping:
          'Reading websites is not set up here, so the site could not be read. Nothing was proposed, and this read did not count against your allowance.',
        refused:
          'The model declined to read this. Nothing was proposed, and this read did not count against your allowance.',
        plan: 'Your plan stopped this read before it finished. Nothing was proposed, and it did not count against your allowance.',
        internal:
          'Something went wrong on our side. Nothing was proposed, and this read did not count against your allowance.',
      },
      tryAgain: 'Try again',
    },
    closed: {
      back: 'Back to Foundation',
      committed: {
        title: 'Saved to your Foundation',
        body: 'What was kept from this read is in your Foundation now, each item saying where it was read from.',
        bodyOn:
          'What was kept from this read was saved on {{date}}, and is in your Foundation now, each item saying where it was read from.',
      },
      discarded: {
        title: 'This read was discarded',
        body: 'Nothing from it was saved. Start another from Foundation whenever you like.',
      },
      expired: {
        title: 'This read has expired',
        body: 'A proposal waits thirty days to be reviewed, and this one was not. Nothing from it was saved; start another from Foundation.',
      },
    },
  },

  /** The hub — `BrandOverview.tsx`. */
  overview: {
    /**
     * The sentence the hub opens with — `FoundationIntro`.
     *
     * It names what is on the screen and stops there, which is a correction:
     * it used to promise "one place for all five", counting the documents
     * among them, and the documents left for `/assets` when Assets became a
     * module of its own. A sentence that lists the contents of a screen has
     * to be rewritten every time the screen changes, so this one lists no
     * count and nothing it cannot see — the facts card comes and goes with
     * its flag, and the line stays true either way.
     */
    /**
     * The honesty rule at index length. The section's own screen says it in a
     * sentence (`shell.readByNothing`); five sentences down one page is the
     * noise that made this screen read as an essay, so here it is three
     * words.
     */
    nothingReads: 'Nothing reads this yet',
    /**
     * A card whose contents did not load — see `CardContents`. Names the
     * card rather than the app: the other five are drawn from a second
     * query and are on the screen beside it, so "Foundation could not be
     * loaded" would be false about everything the user can see.
     */
    unreadable: 'What is in here could not be loaded.',
    /** The right margin of a row that counts a list. */
    stated: '{{count}} stated',
    none: 'none',
    logosWithJobs: '{{count}} with jobs',
    coloursWithRoles: '{{count}} with roles',
    bannedWordCount: '{{count}} words',
    written: 'written',
    guardrails: {
      mayClaim: 'May claim',
      mayClaimEmpty: 'Nothing has a form we know is safe to repeat.',
      neverClaim: 'Never claim',
      neverClaimEmpty:
        'Nothing is off limits. Every voice here may promise anything, in any words.',
      bannedWords: 'Banned words',
      disclaimer: 'Disclaimer',
    },
    templates: {
      isDefault:
        'Applied by default, wherever nothing else claims the platform.',
      forPlatforms: 'For {{platforms}}.',
      unreachable:
        'Claimed by no platform, and not the default — nothing ever reaches it.',
      ratios: '{{covered}} of {{total}} ratios',
    },
  },

  /** The section screen's chrome — `detail.tsx` and the routes under it. */
  detail: {
    back: 'Back to Foundation',
    backToVoices: 'Back to voices',
    backToAudiences: 'Back to audiences',
    errorHeader: 'Foundation could not be loaded',
    errorMessage:
      "The workspace's voices, audiences and guardrails are not reachable right now. Everything else in the app is unaffected.",
    guardrailsErrorHeader: 'Guardrails could not be loaded',
    guardrailsErrorMessage:
      "The workspace's rules are not reachable right now, and editing them without seeing them would overwrite what is there. Everything else in the app is unaffected.",
    noVoiceHeader: 'No such voice',
    noAudienceHeader: 'No such audience',
    missingMessage:
      'It may have been deleted, or the link may be to another workspace.',
    /** The confirmations. `{{name}}` is the entry's own, always the user's words. */
    deleted: '{{name}} was deleted.',
    guardrailsDeleted: 'The guardrails were deleted.',
    /** The side column's card: what the section is for. */
    about: 'About',
  },

  /** The visual half — `LookSection.tsx`. */
  look: {
    edit: 'Edit',
    gap: 'No logo, no colours, no type. Anything generated with an image in it will look like stock.',
    uploadLogo: 'Upload a logo',
    best: 'best',
    logoSlot: 'Logo',
    paletteSlot: 'Palette',
    typeSlot: 'Type',
    referenceSlot: 'Reference imagery',
    noLogo: 'No logo. Templates and profile images have nothing to place.',
    noPalette: 'No colours stated.',
    noTypefaces: 'No typefaces stated.',
    noReference:
      "Nothing to steer generated images by — they will land wherever the model's defaults are.",
    /** A logo's declared job. It is both the caption and the image's `alt`. */
    job: {
      profile: 'Profile photo',
      watermark: 'Watermark',
      mark: 'Mark only',
    },
  },

  /** The cast — `VoicesSection.tsx`. */
  voices: {
    writeFromScratch: 'Write one from scratch',
    writeFromScratchHint: 'Start from a blank page and set its rules yourself.',
    add: 'Add voice',
    addHint: 'Another one, for the posts none of the above are right for.',
    starterGroupTitle: 'Start from a template',
    starterGroupBody:
      'Yours the moment you pick it — a copy, not a link, so ours changing never changes yours. The samples you add afterwards are what stop it sounding like a template.',
    /**
     * The three we offer for a cold start. `title` and `body` are the card;
     * `draft` is what forking one puts in the editor, and it is translated
     * for the same reason the card is — a Spanish workspace that forks a
     * starter and receives English material has been handed something it has
     * to rewrite before it can use it.
     */
    starters: {
      plain: {
        title: 'Plain and direct',
        body: 'Short sentences, no jargon, no emoji. Says the thing and stops.',
        name: 'Plain and direct',
        whenToUse: 'Anything that has to be understood on one read',
        opening: 'States the point in the first sentence.',
        closing: 'Stops. No sign-off, no question.',
      },
      warm: {
        title: 'Warm and conversational',
        body: 'One person talking to another. Contractions, the odd aside, first name terms.',
        name: 'Warm and conversational',
        whenToUse:
          'The posts that are meant to sound like a person, not a company',
        opening: 'Opens with something that actually happened.',
        closing: 'Ends on a question worth answering.',
      },
      sharp: {
        title: 'Sharp and opinionated',
        body: 'Takes a position in the opening line and defends it. Dry, a little arch, never neutral.',
        name: 'Sharp and opinionated',
        whenToUse:
          'Commentary, and anything the industry is already arguing about',
        opening: 'Opens with the claim, then earns it.',
        closing: 'Ends on the sharpest line, not on a summary.',
      },
    },
    noSamples:
      'No samples. This voice has a name and nothing behind it — it will generate exactly what no voice at all would.',
    thin: '{{count}} is where it starts working',
    postsBehind: '{{count}} could be redone',
    defaultBacked:
      'The default voice — posts start in it unless something else is picked.',
    defaultThin:
      'The default voice, with nothing like enough behind it — posts start in it and it changes almost nothing about what they say.',
    /**
     * The explicit habits, rendered as one line under a voice card.
     *
     * `formality` and `length` are keyed off the stored enum like the other
     * three. They used to print the raw value — `neutral`, `short` — which is
     * English by accident rather than by decision, and the only two fields
     * here that were never a label map at all.
     */
    rules: {
      formality: {
        casual: 'casual',
        neutral: 'neutral',
        formal: 'formal',
      },
      person: {
        i: 'first person',
        we: 'we',
        third: 'third person',
        none: 'no narrator',
      },
      emoji: {
        never: 'no emoji',
        sparingly: 'some emoji',
        freely: 'emoji freely',
      },
      length: {
        short: 'short posts',
        medium: 'medium posts',
        long: 'long posts',
      },
    },

    /** The one place a voice is written — `VoiceEditor.tsx`. */
    editor: {
      needsName: 'Needs a name before it can be saved.',
      create: 'Create voice',
      introNamed: '{{name}} Voice',
      introNew: 'A new voice',
      introBody:
        'Three to eight real posts you would be happy to have written are what make one. Everything else on this screen is what a sample cannot say for itself.',
      forkedNote:
        'Nothing is saved yet, and the samples are empty: that is the half a template cannot give you, and the half that does the work.',
      general: 'General',
      name: 'Name',
      namePlaceholder: 'Founder, off the cuff',
      description: 'Description',
      descriptionHint:
        'When to use it — one line, and the one a picker shows under the name.',
      descriptionPlaceholder: 'The lighter end-of-week post, and nothing else',
      samples: 'Samples',
      readsAs: 'Reads as',
      summaryPending: 'Read back off the samples once this is saved.',
      samplesShort:
        'Three to eight real posts you would be happy to have written. This is the voice — everything below is only what a sample cannot say for itself.',
      addSample: 'Add a sample',
      editSample: 'Edit sample',
      samplePlaceholder: 'Paste a post you would be happy to have written.',
      removeSample: 'REMOVE SAMPLE',
      cancel: 'CANCEL',
      addIt: 'ADD IT',
      done: 'DONE',
      resetSamples: 'Reset samples',
      rules: 'Rules',
      rulesHint:
        'What a sample cannot say for itself. A pasted post shows the register; it cannot promise that the next thirty stay off the exclamation marks.',
      opening: 'How a post opens',
      openingHint:
        'The most recognisable habit a voice has, and worth writing out rather than picking.',
      openingPlaceholder: 'Opens with the claim, then earns it.',
      closing: 'How a post closes',
      closingHint:
        'The half people notice when it is wrong: a question, a call to action, or nothing at all.',
      closingPlaceholder: 'Ends on the sharpest line, not on a summary.',
      channels: 'Per-channel customisation',
      channelsHint:
        'A note inside this voice, not a second voice. “Dialled down on LinkedIn” belongs here; a near-identical second entry in the library does not.',
      channelsUnbuilt:
        'Not built yet. Every channel uses this voice exactly as written above — including hashtags, which belong here rather than in the rules, and which nothing states until this is built.',
      /**
       * The four scales, as the *editor* words them — deliberately not
       * `brand.voices.rules.*`, which is how a library card *describes* a
       * voice. "I / we / the company" is a set being chosen between; "first
       * person / we / third person" is a sentence about a voice. Two
       * registers, so two sets of keys.
       */
      choices: {
        formalityLabel: 'Formality',
        formality: {
          casual: 'casual',
          neutral: 'neutral',
          formal: 'formal',
        },
        personLabel: 'Speaks as',
        person: {
          i: 'I',
          we: 'we',
          third: 'the company',
          /**
           * Not a blank option and not "no preference": copy with no speaker
           * in it is a style plenty of brands write in on purpose, and it is
           * the fourth answer to the question rather than the refusal to
           * answer it.
           */
          none: 'no narrator',
        },
        emojiLabel: 'Emoji',
        emoji: {
          never: 'never',
          sparingly: 'sparingly',
          freely: 'freely',
        },
        lengthLabel: 'Length',
        length: {
          short: 'short',
          medium: 'medium',
          long: 'long',
        },
      },
      noun: 'voice',
      deleteCostPublished_one:
        '{{count}} published post was written in this voice. Deleting it leaves it exactly as it is — its text was written and it stands — but nothing new can be generated in it, and any campaign pointing here falls back to no voice at all.',
      deleteCostPublished_other:
        '{{count}} published posts were written in this voice. Deleting it leaves them exactly as they are — their text was written and it stands — but nothing new can be generated in it, and any campaign pointing here falls back to no voice at all.',
      deleteCostDrafts_one:
        '{{count}} draft points at this voice and will fall back to no voice at all.',
      deleteCostDrafts_other:
        '{{count}} drafts point at this voice and will fall back to no voice at all.',
      deleteCostNone:
        'Nothing has been written in this voice, so nothing else changes.',
    },
  },

  /** Who the content is for — `AudiencesSection.tsx`. */
  audiences: {
    describeYourself: 'Describe one yourself',
    describeYourselfHint: 'Say who they are in your own words.',
    add: 'Add audience',
    addHint: 'Another one, for the posts the others are not written to.',
    starterGroupTitle: 'Start from a template',
    starterGroupBody:
      'Three every business has, so none of them needs inventing. Pick one and fill in what follows from it.',
    /** A relationship rather than a demographic — see `AUDIENCE_STARTERS`. */
    starters: {
      customers: {
        title: 'The people who already buy from you',
        body: 'Described as they actually are, not as the deck describes them. The easiest one to get right and the one most often skipped.',
        name: 'People who already buy from us',
      },
      nearly: {
        title: 'The people who nearly bought',
        body: 'They know the category, they looked at you, and they chose somebody else. What they needed and did not get is the whole brief.',
        name: 'People who nearly bought',
      },
      advisers: {
        title: 'The people who recommend you',
        body: 'They never buy anything. They pass your name on, and they need something quotable to pass on with it.',
        name: 'People who recommend us',
      },
    },
    readsOn: 'Reads on',
    scrollsPast: 'Scrolls past',
    believesWhen: 'Believes you when',
    notSaid: '— not said',

    /** One audience, being described — `AudienceEditor.tsx`. */
    editor: {
      needsName: 'Needs a name before it can be saved.',
      create: 'Create audience',
      introNamed: '{{name}} Audience',
      introNew: 'A new audience',
      introBody:
        'One relationship, described concretely enough to be wrong about. The three lines further down are what make it usable — where they read, what loses them, and what they need before they believe a number.',
      forkedNote:
        'Nothing is saved yet, and the three lines below are blank: a template knows which relationship you mean, and nothing whatever about the people in it.',
      general: 'General',
      name: 'Name',
      namePlaceholder: 'Time-poor team leads',
      who: 'Who they are',
      whoHint:
        'Concrete and narrowing. An age, a habit and a suspicion — not “professionals”.',
      whoPlaceholder:
        'Team leads, 30–45, already run two tools that half-solve this, distrust anything that sounds like a pitch, read on a phone between meetings.',
      consequences: 'What follows',
      readsAs: 'Reads as',
      summaryPending: 'Read back off these three once this is saved.',
      consequencesHint:
        'The three things that change what gets written. An audience that cannot answer them is a label, and a label moves nothing.',
      blank:
        'Nothing yet. Saved like this the audience is a label, and not one post will come out differently because it exists.',
      readsOnLabel: 'Reads on',
      readsOnHint:
        'Where, on what, and at what hour. Half of what you would otherwise post is ruled out by this line alone.',
      readsOnPlaceholder: 'Phone, after 8pm, one-handed',
      scrollsPastLabel: 'Scrolls past when',
      scrollsPastHint:
        'The line that loses them — worth writing as the sentence they would actually see.',
      scrollsPastPlaceholder:
        'The first line contains a percentage or the word "solution"',
      believesLabel: 'Believes you when',
      believesHint:
        'What has to sit next to a claim before they will accept it.',
      believesPlaceholder:
        'The number comes with the period it was measured over',
      /** The noun spliced into the danger zone's labels — capitals are the copy. */
      noun: 'audience',
      deleteCostPublished_one:
        '{{count}} published post was written for this audience. Deleting it leaves it exactly as it is — its text was written and it stands — but nothing new can be written to it, and any campaign pointing here falls back to no audience at all.',
      deleteCostPublished_other:
        '{{count}} published posts were written for this audience. Deleting it leaves them exactly as they are — their text was written and it stands — but nothing new can be written to it, and any campaign pointing here falls back to no audience at all.',
      deleteCostDrafts_one:
        '{{count}} draft points at this audience and will fall back to no audience at all.',
      deleteCostDrafts_other:
        '{{count}} drafts point at this audience and will fall back to no audience at all.',
      deleteCostNone:
        'Nothing has been written for this audience, so nothing else changes.',
    },
  },

  /** The frames — `TemplatesSection.tsx` and `TemplatesScreen.tsx`. */
  templates: {
    add: 'Add template',
    gap: 'Images go out bare. Nothing marks a picture as yours once it has left the app.',
    gapScreen:
      'Images go out bare. Nothing marks a picture as yours once it has left the app — and nothing here is per-platform yet, so there is no Instagram story frame and no LinkedIn lockup.',
    buildFromLogo: 'Build one from your logo',
    uploadPng: 'Upload a PNG',
    appliedByDefault: 'Applied by default',
    overImage: 'Sits over the image',
    underImage: 'Sits under the image',
    missingRatios:
      'Nothing to apply on {{ratios}} — one PNG per ratio is what buys the simplicity.',

    everywhere: 'Everywhere',
    everywhereDetail: 'When nothing else claims it',
    everywhereSubtitle:
      'What gets applied on any platform that has not been given one of its own.',
    noDefault:
      'No default template. Every platform without one of its own sends pictures bare.',
    connectedGroup: 'Connected',
    notConnectedGroup: 'Not connected yet',
    notConnected: 'not connected',
    connected: 'connected',
    inherited:
      'Falling through to the default — nothing here is specific to this platform yet.',
    ownTemplate: 'Has a template of its own.',
    giveItsOwn: 'GIVE IT ITS OWN',
    replace: 'REPLACE',
    nothingApplies:
      'Nothing applies here, and there is no default to fall back on.',
    drawnOver: 'drawn over the picture',
    sitsUnder: 'sits under the picture',
    isDefaultSuffix: ' · the default',
    /**
     * The destination a set is judged against, as a phrase the three coverage
     * sentences below take. A phrase rather than three whole sentences per
     * destination because the destination is the variable and the verdict is
     * the sentence — the alternative is six near-identical entries that drift.
     */
    neededEverything: 'every ratio the app produces',
    neededPlatform_one: 'the ratio {{platform}} posts in',
    neededPlatform_other: 'the {{count}} ratios {{platform}} posts in',
    coversAll: 'Covers {{needed}}.',
    coversNone: 'Covers none of {{needed}}. Every picture here goes out bare.',
    coversSome_one:
      'Missing {{ratios}} — that ratio goes out bare against {{needed}}.',
    coversSome_other:
      'Missing {{ratios}} — those ratios go out bare against {{needed}}.',
    openInCompositor: 'OPEN IN COMPOSITOR',
  },

  /** The singleton with real weight — `GuardrailsEditor.tsx`. */
  guardrails: {
    cleared:
      'Everything has been cleared. Guardrails that state nothing are the same as none — delete them below instead.',
    forkedNote:
      'The rules arrived and the facts did not: a template knows what a business like yours may never claim, and nothing at all about what is true of you. It is saved as it stands, so read every line — this is the section people stop checking.',
    starterGroupTitle: 'Start from a template',
    starterGroupBody:
      'Three shapes the rules take, rather than thirty industries. Pick the closest and it fills the lists below — every line is meant to be read and edited, because this is the one section people will trust.',
    mayClaim: 'May claim',
    mayClaimHint:
      'Claims already checked, in the form they were checked in. This is what stops a sentence that took a lawyer an hour being written from scratch every time.',
    mayClaimPlaceholder: 'That setup takes two weeks, start to finish.',
    addClaim: 'ADD A CLAIM',
    neverClaim: 'Never claim',
    neverClaimHint:
      'Write the claim itself rather than the topic — “any guaranteed outcome, in any form” rather than “results”. A topic is something to avoid mentioning; a claim is something a sentence can be checked against.',
    neverClaimEmpty:
      'Nothing is off limits yet. Every voice in the workspace may promise anything, in any words.',
    neverClaimPlaceholder: 'That the result is guaranteed, in any form.',
    addRule: 'ADD A RULE',
    bannedWords: 'Banned words',
    bannedWordsHint:
      'Words that may never appear, in any voice. Type one and press Enter; commas and pasted lists split into separate words.',
    bannedWordPlaceholder: 'guaranteed',
    removeWord: 'Remove {{word}}',
    disclaimer: 'Disclaimer',
    disclaimerHint:
      'Carried by every post, added exactly as written and never reworded — a required legal line, a registration number, an ad disclosure.',
    disclaimerPlaceholder:
      'Results vary. Nothing here is a promise of the outcome you will get.',
    removeLine: 'Remove this line',
    keyboardHint:
      'Enter starts the next one. Paste a list to add all of it at once.',
    noun: 'guardrails',
    /** The `name` in the delete dialog's title — a singleton has no name of its own. */
    dangerName: 'Guardrails',
    deleteCost:
      'The section goes back to empty: nothing sanctioned and nothing off limits, for every voice in the workspace. It takes the facts ledger with it — the statements are stored on this same record — so anything the app knows to be true goes too. Posts already published are untouched: their text was written and it stands.',
    /**
     * The three starters. `neverClaim` and `bannedWords` are arrays in the
     * catalogue and read with `returnObjects` — they are lists of whole
     * sentences, and numbering them into `neverClaim1…4` would fix their
     * length in the schema for every language that follows.
     *
     * Translated for the same reason the voice starters are, and with more
     * force: this is compliance copy that a workspace saves as its own, and
     * a Spanish firm handed four English rules has been given a section it
     * must retype before it can trust it.
     */
    starters: {
      regulated: {
        title: 'Regulated, and outcomes are the risk',
        body: 'Finance, health, law. No result may be promised or implied, every figure names its source, and nothing is described as advice.',
        neverClaim: [
          'Any future return or outcome, in any form — including “historically”, and including as a joke.',
          'That anything we publish is advice. It is information, and the difference is regulatory.',
          'That a result is typical, protected, guaranteed or safe.',
          'A figure without the period it was measured over and where it came from.',
        ],
        bannedWords: [
          'guaranteed',
          'risk-free',
          'safe',
          'proven',
          'passive income',
        ],
      },
      product: {
        title: 'A product, and features are the risk',
        body: 'Software, hardware, retail. Only what ships today: the roadmap is not a feature, and no integration exists until it is live.',
        neverClaim: [
          'A feature that is not in the build people can use today. The roadmap is not a feature.',
          'An integration, platform or format we do not already support in production.',
          'A number about speed, uptime or scale that we cannot point at a source for.',
          'That a competitor lacks something, unless it is checkable today and dated.',
        ],
        bannedWords: [
          'seamless',
          'effortless',
          'unlimited',
          'instantly',
          'revolutionary',
        ],
      },
      plain: {
        title: 'Everyone else, and overstating is the risk',
        body: 'No superlatives, no invented statistics, no customer named without permission and no authority borrowed from a logo.',
        neverClaim: [
          'That we are the best, the first, the only or the fastest-growing anything.',
          'A statistic we cannot show the source of.',
          'A customer by name, or their results, without written permission.',
          'An endorsement nobody has given — including implying one with a logo.',
        ],
        bannedWords: [
          'best-in-class',
          'world-class',
          'game-changing',
          'unrivalled',
          'no-brainer',
        ],
      },
    },
  },

  /** What every Brand editor is made of — `editor.tsx`. */
  editor: {
    cancel: 'Cancel',
    /**
     * Leaving a new entry that was never created — the one draft on these
     * screens that exists nowhere else. `discard` is destructive, so its
     * capitals are part of the copy.
     */
    leave: {
      title: 'Leave without creating it?',
      body: 'Nothing on this screen has been saved yet. Leaving now loses it.',
      stay: 'Keep editing',
      discard: 'DISCARD',
    },
    /** The fork note: its title names the starter, its body begins with this. */
    forkedTitle: 'Started from {{name}}',
    forkedFrom:
      'Copied rather than linked — ours changing will never change yours.',
    danger: {
      title: 'Danger zone',
      /**
       * `{{noun}}` arrives in lower case (`voice`, `audience`): a card's
       * buttons are written in sentence case. Every language writes its own.
       */
      delete: 'Delete {{noun}}',
      keep: 'Keep {{noun}}',
      confirmTitle: 'Delete "{{name}}"?',
      confirmBody: '{{cost}} This cannot be undone.',
    },
    default: 'Default',
    makeDefault: 'Make default',
  },
}
