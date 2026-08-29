/**
 * The English catalogue — bundled into the main chunk, and the shape every
 * other locale is typed against (`Translation`).
 *
 * Everything the user can read lives here — not just labels and headings, but
 * placeholders, empty states, toast and validation messages, tooltips, and the
 * strings only a screen reader reaches (`aria-label`, `title`, `alt`). A
 * literal left in a component is invisible until someone switches language and
 * finds one word of English in the middle of their page. Developer-facing text
 * (`console.*`, thrown errors, test fixtures) stays where it is.
 *
 * Conventions:
 *
 * - **Keys name the place, values carry the voice.** `profile.dangerZone.body`,
 *   not `deletingYourAccountAlsoDeletes`. A key that quotes its own English is
 *   a lie the moment the copy is edited.
 * - **One key per sentence the user reads.** Never assemble a sentence from
 *   fragments in JSX: word order is not portable. Where a sentence has markup
 *   or a link inside it, keep it whole and render it with `<Trans>`.
 * - **Plurals use i18next's `_one` / `_other` suffixes** and spell out the
 *   whole sentence in each form. English pronouns ("it"/"them") and Spanish
 *   agreement do not survive being stitched together at runtime.
 * - **Destructive-action labels stay in literal capitals in every language**
 *   (`DELETE ACCOUNT`, `ELIMINAR CUENTA`). The caps are part of the copy — see
 *   CLAUDE.md.
 */
export const en = {
  common: {
    cancel: 'Cancel',
    close: 'Close',
    done: 'Done',
    save: 'Save',
    tryAgain: 'Try again',
    trying: 'Trying…',
    loading: 'Loading…',
    somethingWentWrong: 'Something went wrong.',
    opensInNewTab: 'Opens in a new tab',
  },

  // The switching screen's own copy is deliberately NOT here — it lives in
  // `i18n/bootMessages.ts`, in the main chunk, because it has to render while
  // this file's counterpart for another language is still being fetched.
  locale: {
    section: {
      title: 'Language',
      label: 'Interface language',
      description:
        'Applies to this browser only — it is not shared with the rest of your workspace. English is built in; other languages are downloaded the first time you choose them.',
    },
  },

  validation: {
    firstName: {
      required: 'First name is required',
      tooLong: 'First name must be at most 50 characters',
      whitespace: 'First name cannot be only whitespace',
    },
    lastName: {
      required: 'Last name is required',
      tooLong: 'Last name must be at most 50 characters',
      whitespace: 'Last name cannot be only whitespace',
    },
    organizationName: {
      required: 'Organization name is required',
      tooLong: 'Organization name must be at most 100 characters',
      whitespace: 'Organization name cannot be only whitespace',
    },
    email: {
      required: 'Email is required',
      invalid: 'Invalid email format',
    },
    password: {
      required: 'Password is required',
      tooShort: 'Password must be at least 8 characters',
      needsUppercase: 'Must contain an uppercase letter',
      needsLowercase: 'Must contain a lowercase letter',
      needsDigit: 'Must contain a digit',
    },
    confirmPassword: {
      required: 'Confirm your password',
      mismatch: 'Passwords do not match',
    },
    /**
     * The live checklist under a new-password field. Each rule is coloured
     * independently as it passes, so the list is assembled from parts — but
     * the joins are translated too, because "a, b, c, and d" is an English
     * habit that Spanish does not share ("a, b, c y d").
     */
    passwordRules: {
      minChars: 'Min. 8 chars',
      uppercase: 'an uppercase',
      lowercase: 'a lowercase',
      digit: 'a digit',
      separator: ', ',
      lastSeparator: ', and ',
    },
  },

  auth: {
    login: {
      title: 'Log in',
      subtitle: 'Log in to continue managing your content',
      submit: 'LOG IN',
      expired: 'Your session expired — log in again to pick up where you left off',
      afterReset: 'Your password has been changed. Log in with the new one',
      emailLabel: 'Email',
      emailPlaceholder: 'Enter your email',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter password',
      // `resetLink`, not `link`: `link` is an HTML void element, so the Trans
      // parser self-closes it and the label falls outside the anchor.
      forgot: 'Forgot your password? <resetLink>Reset it here</resetLink>.',
      noAccount: "Don't have an account?",
      signUpLink: 'Sign up',
    },
    register: {
      title: 'Create your organization',
      subtitle: 'Sign up to start managing your content',
      submit: 'SIGN UP',
      organizationLabel: 'Organization Name',
      organizationPlaceholder: 'Enter your organization name',
      firstNameLabel: 'First Name',
      firstNamePlaceholder: 'Enter your first name',
      lastNameLabel: 'Last Name',
      lastNamePlaceholder: 'Enter your last name',
      emailLabel: 'Email',
      emailPlaceholder: 'Enter your email',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter password',
      haveAccount: 'Already have an account?',
      logInLink: 'Log in here',
    },
    forgot: {
      title: 'Reset your password',
      subtitle: "We'll email you a link to set a new one",
      submit: 'SEND RESET LINK',
      emailLabel: 'Email',
      emailPlaceholder: 'Enter your email',
      remembered: 'Remembered it?',
      logInLink: 'Log in',
      sentTitle: 'Check your inbox',
      /** Conditional on purpose: the endpoint answers identically for an
       *  address with no account, so promising delivery would be a claim we
       *  cannot make. */
      sentBody:
        'If <strong>{{email}}</strong> has an Ogen account, a link to set a new password is on its way. It expires in an hour.',
      resend: 'SEND IT AGAIN',
      resentNote: 'Sent again — give it a minute.',
      emailHint: 'Use the address you log in with. The link stops working after an hour.',
      backToLogin: 'Back to log in',
    },
    reset: {
      title: 'Set a new password',
      subtitle: "Choose something you haven't used here before",
      submit: 'SET NEW PASSWORD',
      passwordLabel: 'New password',
      passwordPlaceholder: 'Enter a new password',
      confirmLabel: 'Confirm new password',
      confirmPlaceholder: 'Enter it again',
      confirmHint: 'Type it again — a typo here locks you out of your own account.',
      requestNewLink: 'Request a new link',
      knowPassword: 'Know your password?',
      logInLink: 'Log in',
      brokenTitle: "This link doesn't work",
      brokenSubtitle:
        'It looks incomplete — mail clients sometimes cut long links in half',
      brokenBody: 'Open the link straight from the email, or <request>request a new one</request>.',
    },
    /** The emailed invitation's landing page (CON-26). */
    invite: {
      title: 'Join the workspace',
      /** Who invited you and where — the two facts that decide whether this link was meant for you. */
      subtitle: '{{inviter}} invited you to {{workspace}}',
      emailLabel: 'Your email',
      firstNameLabel: 'First name',
      lastNameLabel: 'Last name',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Choose a password',
      submit: 'JOIN THE WORKSPACE',
      haveAccount: 'Already have an Ogen account?',
      logInLink: 'Log in',
      brokenTitle: 'This invitation link no longer works',
      brokenSubtitle:
        'Invitations expire after seven days, and each one can only be used once',
      brokenBody:
        'Ask whoever invited you to send another. If you already accepted, <login>log in</login> instead.',
      /** Already signed in as the invited address: nothing to create, one thing to confirm. */
      joinBody: "You're signed in as {{email}}, which is who this invitation is for. Accepting adds this workspace to your account.",
      joinSubmit: 'ACCEPT INVITATION',
      /** Signed in as somebody else — no form on this page can fix that. */
      wrongAccountBody:
        'This invitation is for {{invited}}, but you are signed in as {{current}}. Log out and open the link again to accept it.',
      logOutLink: 'Log out',
      /** The server's answer when the invited address already has an account. */
      existingAccountBody:
        '{{email}} already has an Ogen account. Log in as that account and this invitation will be waiting.',
    },
    logout: {
      pendingTitle: 'Logging Out...',
      pendingMessage: 'This may take a few seconds',
      doneTitle: "You've Been Logged Out",
      doneMessage: 'See you next time!',
      home: 'TAKE ME HOME',
      footer: 'LOGOUT',
    },
  },

  nav: {
    modules: 'Modules',
    activity: 'Activity',
    tasks: 'Tasks',
    /** The count beside the Activity row, read out rather than seen. */
    activityUnread_one: '{{count}} unread entry',
    activityUnread_other: '{{count}} unread entries',
    campaigns: 'Campaigns',
    contentBank: 'Content Bank',
    /** CON-227. Behind the `brand-materials` flag — hidden while it is off. */
    brand: 'Brand',
    workspaceSettings: 'Workspace Settings',
    profile: 'Profile',
    help: 'Help and support',
    logOut: 'Log out',
    closeSidebar: 'Close sidebar',
    /** Both halves of what the /workspaces page offers, in one row. */
    switchWorkspace: 'Create or switch',
    untitledCampaign: 'Untitled campaign',
    campaign: {
      overview: 'Overview',
      // Named for where it goes, not for what it holds: this row opens the
      // calendar, and "Posts" alone read like a list.
      posts: 'Posts calendar',
      analytics: 'Analytics',
      brief: 'Brief',
      content: 'Content',
      settings: 'Settings',
    },
  },

  /**
   * Tasks (CON-225): the workspace's open work, its own module next to the
   * feed. The titles themselves still speak the rule set's own English
   * (`campaignReadiness`), which is legacy to convert, not a precedent — only
   * the screen's own copy lives here.
   */
  tasks: {
    title: 'Tasks',
    add: 'ADD TASK',
    newTask: 'New task',
    create: 'CREATE TASK',
    cancel: 'Cancel',
    complete: 'Mark this task done',
    reopen: 'Reopen this task',
    delete: 'DELETE TASK',
    unassigned: 'Unassigned',
    /**
     * The assignee's picture is a button, and these name it: initials read out
     * as letters, so the name has to be said rather than shown.
     */
    assignedTo: 'Assigned to {{name}} — change',
    assign: 'Assign this task',
    /** Who made the task, and when — one sentence, never a name glued to a date. */
    createdBySystem: 'Raised automatically on {{at}}',
    createdBy: 'Written by {{name}} on {{at}}',
    closedBy: 'Ticked by {{name}} on {{at}}',
    /** Said on the task itself, where the work went without anyone ticking it. */
    autoResolved: 'Resolved on its own — the warning behind it cleared',
    /** Stands in the description's place, on the row and in the section. */
    noDescription: 'No description',
    saveFailed: 'Could not save the change to your tasks.',
    loadFailed: 'Unable to load tasks',
    empty: {
      title: 'Nothing to do',
      subtitle:
        'Tasks you write land here, and so does anything the campaigns need doing about them.',
    },
    /**
     * What a task raised from a warning is about — one paragraph per rule, in
     * the imperative: the title already says what is wrong.
     */
    rule: {
      failedPosts:
        'The publisher tried and the channel refused. Open the posts, read what came back — a disconnected account, a rejected image, a caption the channel would not take — fix it and publish again.',
      manualPublishDue:
        'These are set to be published by hand and their time has come. Nothing goes out until someone opens each post and publishes it.',
      autoPublishOverdue:
        'The slot has passed and the publisher has not sent these. Check the channel is still connected before rescheduling them.',
      notPublished:
        'The window closed with these still waiting, so they were never sent. Decide for each one whether it is still worth publishing or should be dropped.',
      plannedTodayUnscheduled:
        'Posts dated for the next day are still drafts. A date on a post is a plan, not an instruction — until they are scheduled, nothing will send them.',
      pipelineGap:
        'Nothing is scheduled for the next week. Write and schedule posts now, or the campaign goes quiet.',
      accountsMissingBlocking:
        'A channel this campaign publishes to has no connected account, so its posts cannot go out. Connect the account, or take the channel off the campaign.',
      accountInactive:
        'A connected account has stopped authorising, usually an expired token. Reconnect it in Workspace Settings before its next slot.',
      channelDroppedScheduled:
        'A channel was taken off the campaign while posts were still scheduled to go out on it. Those posts have nowhere to publish.',
      behindPace:
        'Fewer posts have gone out than the campaign’s goal implies for the time elapsed. Schedule more, or revise the goal to what the campaign is actually doing.',
    },
    field: {
      title: 'What needs doing',
      titlePlaceholder: 'Write the task as you would say it',
      description: 'Description',
      descriptionPlaceholder: 'What the work is, and anything the next person needs to know',
      campaign: 'Campaign',
      noCampaign: 'No campaign',
      assignee: 'Assigned to',
    },
    /** The figure on the sidebar's Tasks row, read out rather than seen. */
    openCount_one: '{{count}} open task',
    openCount_other: '{{count}} open tasks',
  },

  /**
   * Activity (CON-225): the feed of what happened, and the daily report it
   * opens. Counts are written out whole in each plural form — "1 post
   * published" and "6 posts published" are one key each, never a number glued
   * to a noun.
   */
  activity: {
    title: 'Activity',
    /** Capitals are the copy, as on every other list's header action. */
    markAllRead: 'MARK ALL READ',
    markReadFailed: 'Could not save your place in the feed.',
    loadFailed: 'Unable to load activity',
    empty: {
      title: 'Nothing has happened yet',
      subtitle:
        'Posts going out, posts failing, and a report of each day land here as they happen.',
    },
    /** The dot's accessible name — the only thing that says what it means. */
    unread: 'Unread',
    /** Relative day names, used instead of a date for the two recent ones. */
    today: 'Today',
    yesterday: 'Yesterday',
    /** A section's heading inside a day's card. Each one stands alone. */
    entry: {
      failed: 'A {{channel}} post failed to publish',
      notPublished: 'A {{channel}} post was never published',
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
    report: {
      /**
       * The tiles' labels: a noun beside a figure, where the sentence forms
       * below are what a line of prose uses. Two sets on purpose — "3" over
       * "3 posts published" reads as thirty-three.
       */
      label: {
        published: 'Published',
        failed: 'Failed',
        notPublished: 'Never published',
        created: 'Created',
      },
      published_one: '{{count}} post published',
      published_other: '{{count}} posts published',
      failed_one: '{{count}} post failed to publish',
      failed_other: '{{count}} posts failed to publish',
      notPublished_one: '{{count}} post was never published',
      notPublished_other: '{{count}} posts were never published',
      created_one: '{{count}} post created',
      created_other: '{{count}} posts created',
      byChannel: 'Published by channel',
      byCampaign: 'By campaign',
      nothing: 'Nothing happened on this day.',
      /**
       * What the report counted and what it could not — it is computed from
       * the workspace's posts, so it knows nothing about the AI runs, uploads
       * or connection health that the feed will carry once the server records
       * them.
       */
      coverage: 'Counted from this workspace’s posts, by your local calendar day.',
    },
  },

  /**
   * The campaign Overview's cards. Their titles are the nav's own
   * `nav.campaign.*` strings — one section, one name — so only what is unique
   * to the screen lives here.
   */
  campaignOverview: {
    /**
     * The ghost button in a card's header: open the section this card
     * summarises. Written out per section rather than composed from a verb and
     * a name — the article and word order are not the same in every language.
     * Capitals are the copy, as with every other button in the app.
     */
    openOverview: 'OPEN OVERVIEW',
    openPosts: 'OPEN CALENDAR',
    openAnalytics: 'OPEN ANALYTICS',
    openBrief: 'OPEN BRIEF',
    openContent: 'OPEN CONTENT',
    openSettings: 'OPEN SETTINGS',

    /**
     * Stands in the time column of a post row that has no timestamp. A post
     * really can be published without one — see the note at the call site —
     * and a blank cell reads as a bug rather than as the fact it is.
     */
    noDate: 'No date',
  },

  calendar: {
    /**
     * The header's counter button: the posts that have no date on them yet.
     * `unscheduled` is the visible label beside the glyph and is a button, so
     * it is capitalised like every other; `unscheduledPosts` is its accessible
     * name, and starts with the same word so voice control can reach it.
     */
    unscheduled: 'UNSCHEDULED',
    unscheduledPosts: 'Unscheduled posts',
    settings: 'Calendar settings',

    /**
     * The view switch, which draws each arrangement rather than naming it.
     * These are the names it stopped showing: each one is its segment's
     * accessible name *and* the tooltip, so what a pointer user reads and what
     * a screen reader announces are the same word.
     *
     * Not capitalised like the buttons around them — a tooltip is a label, not
     * an action.
     */
    viewWeek: 'Week',
    viewMonth: 'Month',
    viewList: 'List',

    /**
     * The two arrows either side of the range. They name the unit they move by,
     * which changes with the view — the same pair of glyphs steps a week in one
     * and a month in the other, and only the accessible name says which.
     */
    previousWeek: 'Previous week',
    nextWeek: 'Next week',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',

    /**
     * Calendar Settings. One picture switch for the whole calendar, then one
     * section of row switches per view. The note is state rather than teaching
     * — a post with no picture has nothing to preview, and a user who turns
     * this on and sees half their cards unchanged is owed the reason. Both
     * halves of it are that: the second says why a busy day in the month goes
     * back to plain cards, which is the calendar overruling the switch and so
     * the one thing here that must not read as a bug.
     */
    /**
     * Calendar Settings' section headings, and the two rows that are state
     * rather than teaching — neither can move into an `<Explainer>`, because
     * both say something a user still needs after closing the note.
     */
    preferences: 'PREFERENCES',
    daysVisibility: 'DAYS VISIBILITY',
    firstDayOfWeek: 'First Day of Week',
    statusColourAlways: "The status colour down the card's left edge is always shown.",
    notAPublishingDay: 'Not a publishing day',
    showDay: 'Show {{day}}',

    /**
     * The card switches. `fieldNoteStatus` is the one label that can't carry
     * itself: turning the status on doesn't add it — the card already has it,
     * in colour — it spends a line writing it out.
     */
    field: {
      status: 'Status label',
      time: 'Time',
      title: 'Title',
      platform: 'Platform',
      account: 'Account',
    },
    fieldNoteStatus: 'Writes the status out, and gives the time its own line',
    showFieldOnWeek: 'Show {{field}} on the week card',
    showFieldOnMonth: 'Show {{field}} on the month card',

    imagePreviews: 'Show cards as image previews',
    imagePreviewsNote: 'Only posts that have a picture, and in the month only on the days with room for one',
    weekCard: 'WEEK CARD',
    monthCard: 'MONTH CARD',

    /**
     * The month grid's two hover titles. Both name the day they are on, which
     * is the only thing distinguishing one cell's control from the next — the
     * add button is an icon, and the density is a count.
     *
     * `density` says "open this week" rather than "open the day": the month
     * has no day view to go to, and the week is where those posts become
     * readable again.
     */
    addPostOn: 'Add a post on {{date}}',
    density_one: '{{count}} post on {{date}} — open this week',
    density_other: '{{count}} posts on {{date}} — open this week',

    /** The right rail's holding pen for posts with no date yet. */
    notScheduled: 'Not Scheduled Posts',

    /**
     * The one control a day offers, in both grids. Capitalised like every
     * other action; the month's is icon-only and takes `addPostOn` above as
     * its title instead.
     */
    addPost: 'ADD POST',

    /**
     * A post whose date can no longer be moved by dragging it. The mark is the
     * only thing saying so, so its accessible name is the explanation.
     */
    dateLocked: "This post's date is locked",

    /**
     * The empty states, one per surface. Week and month deliberately share
     * their words: it is the same empty calendar, and a user switching
     * granularity on an empty campaign should not be told two different things
     * about it.
     */
    empty: {
      calendarTitle: 'Your calendar is empty',
      calendarSubtitle:
        'Add your first post and it will show up here, ready to schedule.',
      listTitle: 'No posts yet',
      listSubtitle: 'Add your first post to start building this campaign.',
      panelTitle: 'Nothing unscheduled',
      panelSubtitle:
        'Posts without a date wait here — drag one off the calendar, or add a new one.',
    },
  },

  assistant: {
    /**
     * The status line under the panel's title.
     *
     * Two states get a number and one deliberately does not. *Active* is every
     * thread open in the rail — the rail is where a thread lives, so opening
     * one is what makes it active and closing it is what ends it. *Pending* is
     * the subset waiting on the user: a turn that landed while they were
     * looking somewhere else. A thread that is *working* is not counted, because
     * the mark's animation already says so and a figure that changes every few
     * seconds reads as something to act on rather than as a state.
     *
     * Two phrases rather than one sentence with two counts: i18next inflects
     * around a single `count`, the pending clause is dropped entirely when it
     * is zero, and only one of the two is ever tinted.
     */
    activeThreads_one: '{{count}} active thread',
    activeThreads_other: '{{count}} active threads',
    pendingThreads_one: '{{count}} pending',
    pendingThreads_other: '{{count}} pending',

    /**
     * What a thread is called when its subject has no name yet — the assistant
     * names threads after what they are attached to, and an unnamed post is
     * ordinary while it is being drafted.
     */
    untitledCampaign: 'Untitled campaign',
    untitledPost: 'Untitled post',

    /**
     * Fired when a turn ends while the user is somewhere else. The dot on the
     * trigger says a thread is waiting; this says which one, once, at the
     * moment it happens — threads run on across navigation, so without it the
     * only report of a finished run is a mark in the corner.
     */
    finished: 'The strategist finished',
    failed: 'The strategist could not finish',
  },

  /**
   * The workspace a user is in, as opposed to the settings screen for it
   * (`workspaceSettings` below) and the /workspaces chooser (`workspaces`
   * below). Two roles, because that is what the server recognises (CON-26).
   */
  workspace: {
    role: {
      owner: 'Owner',
      member: 'Member',
    },
    /**
     * What each role can do — whole sentences that stand on their own beside
     * the role picker, with no carrier phrase naming the invitee: the address
     * is in the field alongside. Kept to within a few characters of each other
     * on purpose, since they swap in place as the select changes.
     */
    ability: {
      owner: 'Can invite people, change roles, connect accounts and rename the workspace.',
      member: 'Can plan, write and publish content, but not manage the workspace or its people.',
    },
  },

  /** The chooser at `/workspaces` — one login, several workspaces (CON-147). */
  workspaces: {
    title: 'Your workspaces',
    loadFailed: 'Failed to load your workspaces.',
    create: 'NEW WORKSPACE',
    /** Marks the workspace *this tab* is in — another tab may be somewhere else. */
    current: 'Current',
    memberCount_one: '{{count}} member',
    memberCount_other: '{{count}} members',
    loggedInAs: 'Logged in as',
    wrongAccount: 'Wrong account?',
    logOut: 'Log out',
    switchFailed: 'Unable to switch workspace',
    createDialog: {
      title: 'New workspace',
      /** Why you'd want one — the second-accounts case is the feature's point. */
      body: 'A workspace has its own campaigns, content and connected accounts — and its own set of social accounts, so a second workspace is how you run a second LinkedIn or Facebook page alongside this one.',
      nameLabel: 'Name',
      namePlaceholder: 'Northwind Client',
      cancel: 'Cancel',
      createOnly: 'Create only',
      createAndSwitch: 'Create and switch',
      created: '{{name}} created',
      createdNote: 'Switch to it from the workspace menu when you need it.',
      createFailed: 'Unable to create the workspace',
    },
  },

  profile: {
    title: 'Profile',
    account: {
      title: 'Account',
      description:
        'Personal details. Workspace-level settings, including who else has access, live in Workspace Settings.',
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      /** Not an Explainer: a warning the user needs while working cannot live
       *  somewhere it can be dismissed for good (CLAUDE.md). */
      emailWarning:
        'This is the address you log in with. It changes as soon as you save, and nothing sends a confirmation to check it works — a typo here locks you out at your next login.',
    },
    password: {
      title: 'Password',
      /** The reason is the feature: the emailed route is the one that also
       *  revokes every other session (CON-193), so the copy says so. */
      body: "Your password is changed by email. We'll send a link to <email>{{email}}</email> — it's the only route that also signs out your other devices, which is usually the point.",
      sentBody:
        'A link to set a new password is on its way to <email>{{email}}</email>. It expires in an hour, and using it signs out every device — including this one.',
      send: 'EMAIL ME A RESET LINK',
      resend: 'SEND IT AGAIN',
      resentNote: 'Sent again — give it a minute.',
    },
    dangerZone: {
      title: 'Danger Zone',
      /** Leave-workspace, not account deletion: CON-147 split memberships from
       *  accounts and the API offers no account delete — the copy must not
       *  promise one. */
      body: 'Leaving this workspace removes your access and deletes everything you created in it — for everyone. Your login and your other workspaces are untouched. This cannot be undone.',
      action: 'LEAVE THIS WORKSPACE',
    },
    leave: {
      title: 'Leave {{workspace}}?',
      body: 'This removes <strong>{{email}}</strong> from the workspace and deletes everything you created in it — your campaigns, their posts, your uploaded assets and tags — for every member. Posts that already went out stay live on the social networks. It cannot be undone.',
      shared:
        'Your login keeps working: any other workspace you belong to is untouched, and <strong>{{workspace}}</strong> itself carries on without you. If you are its only owner, appoint another owner first — a workspace can’t be left ownerless.',
      thisWorkspace: 'this workspace',
      confirmLabel: 'Type <email>{{email}}</email> to confirm',
      keep: 'STAY IN THIS WORKSPACE',
      confirm: 'LEAVE THIS WORKSPACE',
    },
  },

  workspaceSettings: {
    title: 'Workspace Settings',
    loadFailed: 'Failed to load settings',
    workspace: {
      /** The row title doubles as the section heading, e.g. "BN Digital Workspace". */
      rowTitle: '{{name}} Workspace',
      loadFailed: 'Failed to load the workspace.',
      nameLabel: 'Workspace name',
      nameEmpty: 'Name can’t be empty',
      slugLabel: 'Slug',
      slugNote: "Set from the name at creation; renaming the workspace won't change it.",
      /** The way out of this card — every field in it describes one workspace. */
      switch: 'SWITCH',
      timeZoneLabel: 'Time zone',
      timeZoneNote:
        'Everything is scheduled in UTC for now; per-workspace time zones land with CON-94.',
    },
    people: {
      title: 'People',
      membersHeading: 'Workspace members',
      pendingHeading: 'Pending invitations',
      inviteHeading: 'Invite someone',
      you: '(that’s you)',
      /** Reading the invitation list is owner-only server-side, so a member sees neither it nor the form. */
      memberNote: 'Only the workspace owner can invite people or change roles.',
      emailLabel: 'Email',
      emailPlaceholder: 'name@company.com',
      roleLabel: 'Role',
      invite: 'INVITE',
      remove: 'REMOVE',
      resend: 'RESEND',
      cancel: 'CANCEL',
      cancelInvitation: 'Cancel the invitation to {{email}}',
      invitedBy: 'invited by {{name}}',
      /** Nought days is neither "in 0 days" nor "0 days ago", so it gets its own line. */
      expiresToday: 'expires today',
      expiresIn_one: 'expires tomorrow',
      expiresIn_other: 'expires in {{count}} days',
      expiredToday: 'expired today',
      expiredAgo_one: 'expired yesterday',
      expiredAgo_other: 'expired {{count}} days ago',
      roleChanged: 'Role updated for {{name}}',
      roleChangeFailed: 'Unable to change the role',
      removed: '{{name}} removed',
      removeFailed: 'Unable to remove',
      invitationSent: 'Invitation sent to {{email}}',
      inviteFailed: 'Unable to send the invitation',
      resendFailed: 'Unable to send it again',
      invitationRevoked: 'Invitation revoked',
      revokeFailed: 'Unable to revoke',
      removeTitle: 'Remove {{name}}?',
      /** The API detaches the membership and cascades into what it created
       *  here — their account and other workspaces survive. The copy carries
       *  both halves: what goes, and what doesn't (CON-147). */
      removeBody:
        'This removes {{name}} from the workspace and deletes everything they created in it — their campaigns, those campaigns’ posts, and their uploaded assets — for everyone. Their login and their other workspaces are untouched. Posts that already went out stay live on the social networks. It cannot be undone.',
      removeConfirmLabel: 'Type their email address to confirm',
      removeDismiss: 'KEEP THEM',
      removeConfirm: 'REMOVE FROM WORKSPACE',
    },
    dangerZone: {
      title: 'Danger Zone',
      /** Soft-delete server-side, but the copy must not offer that as an undo —
       *  recovery is a manual support request (CON-147). */
      body: 'Deleting this workspace removes its campaigns, posts, assets and connected social accounts, and every member loses access. Already-published posts stay live on the social networks. You can’t undo this yourself — recovering a deleted workspace is a manual support request.',
      lastWorkspace: 'This is your only workspace. Deleting it leaves you with nowhere to work — create another one first.',
      action: 'DELETE WORKSPACE',
      confirmTitle: 'Delete {{name}}?',
      confirmBody: 'Everything in this workspace is deleted, for every member, and you can’t restore it yourself. Type <strong>{{name}}</strong> to confirm.',
      confirmLabel: 'Workspace name',
      keep: 'KEEP WORKSPACE',
      confirm: 'DELETE WORKSPACE',
      /** The server's own last-workspace guard, arriving from another tab's race. */
      onlyWorkspace: 'This is your only workspace',
      onlyWorkspaceNote: 'Create another workspace before deleting this one.',
      deleteFailed: 'Unable to delete the workspace',
    },
    platforms: {
      title: 'Platform Settings',
      empty: 'No platforms connected yet — pick one under “Connect Platforms” below.',
      cadence: 'Cadence',
      constraints: 'Constraints',
      /** Cadence and constraints await real backend data — see PlatformRow. */
      comingSoon: 'Coming soon',
      contentTypes: 'Available Content Types',
      contentTypesEmpty: 'None',
      accountInactive: 'Inactive on {{platform}} — can’t receive posts',
      reconnect: 'Reconnect',
      disconnectAccount: 'Disconnect {{name}}',
      disconnectTooltip: 'Disconnect this account',
      status: {
        connected: 'Connected',
        degradedMessage:
          'Connected, but the {{publisher}} sync is degraded — we retry automatically.',
        disabledMessage:
          'Connected, but the publishing integration is currently disabled on the server.',
      },
    },
    autoPublish: {
      allowedTitle: 'Auto-publishing allowed',
      allowedBody: 'Scheduled posts go out on their own, across every campaign.',
      blockedTitle: 'Auto-publishing not allowed',
      blockedBody: 'Scheduled posts wait for you to publish them by hand.',
      allow: 'ALLOW',
      disallow: 'DISALLOW',
      checkFailed: "Unable to check {{platform}}'s scheduled posts",
      pending: {
        title_one: '{{platform}} has {{count}} post queued to publish',
        title_other: '{{platform}} has {{count}} posts queued to publish',
        body_one:
          'Turning auto-publishing off only changes how posts are scheduled from now on. This post is already queued with the publisher and will still go out unless it is converted.',
        body_other:
          'Turning auto-publishing off only changes how posts are scheduled from now on. These posts are already queued with the publisher and will still go out unless they are converted.',
        untitledPost: 'Untitled post',
        noDate: 'no date',
        progress:
          'Converting {{done}} of {{total}} — each post has to be unqueued with the publisher first. Leave this open until it finishes.',
        keep: 'Keep auto-publishing',
        convert_one: 'Switch it to manual',
        convert_other: 'Switch all {{count}} to manual',
        converted_one: '{{count}} post moved to manual publishing',
        converted_other: '{{count}} posts moved to manual publishing',
        convertFailed_one: '{{failed}} of {{count}} post could not be converted',
        convertFailed_other: '{{failed}} of {{count}} posts could not be converted',
        convertFailedDetail:
          'They are still scheduled to auto-publish. Auto-publishing was left on.',
      },
    },
    connect: {
      title: 'Connect Platforms',
      integrationOff:
        'The publishing integration isn’t configured on this server, so connecting is unavailable for now.',
      noPlatforms: 'No platforms are available to connect.',
      connect: 'Connect',
      connectedCount_one: '{{count}} connected',
      connectedCount_other: '{{count}} connected',
      modalTitle: 'Connect {{platform}}',
      preparing: 'Preparing your connect link…',
      redirecting: 'Taking you to {{platform}}…',
      success: '{{platform}} is connected. You’ll find it under Platform Settings.',
      settling: 'Finishing setup — the account appears here in a moment.',
      errors: {
        expired: 'That connection link expired. Please start the connection again.',
        mismatch: 'Something went wrong connecting your account. Please try again.',
        upstream: 'We couldn’t reach the platform. Please try again in a moment.',
        noTargets:
          'This account doesn’t have any pages or profiles we can publish to.',
        generic: 'We couldn’t connect your account. Please try again.',
      },
      picker: {
        title: 'Choose what to connect',
        body: 'Your {{platform}} account manages more than one profile. Pick the one Ogen should publish to.',
        legend: 'Available {{platform}} profiles',
        submit: 'CONNECT {{platform}}',
        cancel: 'CANCEL',
        // Sentence case on purpose: this one is only ever read aloud, as the
        // label of the header's icon button.
        back: 'Back to Workspace Settings',
        backToAccounts: 'BACK TO WORKSPACE SETTINGS',
        expired:
          'This connection expired or was already used. Start the connection again from Workspace Settings.',
        empty: 'There’s nothing on this account we can publish to.',
        invalidTarget:
          'That option is no longer available. Reload the page and pick again.',
        kind: {
          organization: 'Company page',
          page: 'Page',
          personal: 'Personal profile',
        },
      },
    },
    disconnect: {
      title: 'Disconnect {{name}}?',
      body: 'Ogen will stop publishing to this {{platform}} account, and the connection is removed on the publishing provider too — so it won’t come back on the next sync.',
      published:
        'Posts already published stay live on {{platform}}. You can reconnect the account later, but it has to go through the authorization flow again.',
      keep: 'KEEP CONNECTED',
      confirm: 'DISCONNECT ACCOUNT',
      succeeded: 'Disconnected {{name}}',
      blocked: {
        title: 'This account has scheduled posts',
        body_one:
          '<strong>1 scheduled post publishes</strong> as {{name}}. Disconnecting now leaves it pointing at an account that no longer exists, so it will fail to publish.',
        body_other:
          '<strong>{{count}} scheduled posts publish</strong> as {{name}}. Disconnecting now leaves them pointing at an account that no longer exists, so they will fail to publish.',
        keep_one:
          'To keep it, close this and unschedule the post first — then you can pick a different account for it.',
        keep_other:
          'To keep them, close this and unschedule those posts first — then you can pick a different account for each.',
        confirm: 'DISCONNECT ANYWAY',
      },
    },
  },

  /** Failures the publishing provider reports as bare machine codes. */
  integration: {
    rateLimited: 'Too many attempts — try again shortly.',
    rateLimitedIn: 'Too many attempts — try again in {{seconds}}s.',
    disabled: 'The publishing integration is not configured on this server.',
    degraded:
      'The publishing integration is temporarily unavailable. Try again in a moment.',
    alreadyDisconnected: 'This account is already disconnected.',
    /** The server stops before touching local state on an upstream failure, so
     *  "nothing changed" is a guarantee rather than a guess. */
    removalUnconfirmed:
      'The publishing provider didn’t confirm the removal, so nothing was changed. Try again in a moment.',
  },

  postsTable: {
    sortSaveFailed: "Couldn't save the order you sorted by",

    /**
     * The column headers, also drawn in the empty state's sketch of the table
     * — one set of words for both, so the sketch is of *this* table.
     */
    columnTitle: 'Title',
    columnStatus: 'Status',
    columnPlatform: 'Platform',
    columnPublishDate: 'Publish date',
    columnWhen: 'When',

    /** A post with no publish date, in either date column. */
    notSet: 'Not set',

    /** The table with no rows in it — the campaign has posts, this filter doesn't. */
    noPosts: 'No posts',

    /**
     * The select column. The header's name changes with what pressing it will
     * do, because a tick box that both selects all and clears all cannot say
     * which from its state alone.
     */
    selectAll: 'Select all posts',
    clearSelection: 'Clear selection',
    selectPost: 'Select {{title}}',

    /**
     * The `When` column, which says the same date as `Publish date` in the
     * terms a person would use out loud. The three named days come first
     * because they are the ones worth recognising without arithmetic; beyond
     * that it counts.
     */
    today: 'Today',
    tomorrow: 'Tomorrow',
    yesterday: 'Yesterday',
    inDays_one: 'In {{count}} day',
    inDays_other: 'In {{count}} days',
    daysAgo_one: '{{count}} day ago',
    daysAgo_other: '{{count}} days ago',
  },

  posts: {
    /**
     * The post statuses, as the app names them. Not the server's words: these
     * are read on a card at a glance, so `scheduled` is written as the thing
     * that will happen to the post ("Auto-publish") rather than as the state
     * it is sitting in.
     */
    status: {
      draft: 'Draft',
      ready_for_publish: 'Ready for Publish',
      scheduled: 'Auto-publish',
      scheduled_for_manual_publishing: 'Manual publish',
      failed: 'Failed',
      published: 'Published',
      not_published: 'Not Published',
    },

    /**
     * The two absences a calendar card can carry. Both are shown in place of a
     * name, so each has to read as a fact about the post rather than as a
     * missing value.
     */
    noPlatform: 'No platform',
    noAccount: 'No account',

    /**
     * The card's warning mark. What is wrong is in the post itself — the mark
     * only says to go and look — so this is deliberately the whole of it.
     */
    hasProblem: 'This post has a problem',

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
       * a person needs while writing may live here (CLAUDE.md).
       */
      explainer:
        'Each post below publishes on its own, replying to the one before it. The character limit applies to every post separately, and media rides the post it sits on.',

      /** The row's accessible name. The number is what the gutter shows. */
      postLabel: 'Post {{position}} of {{total}}',
      placeholderFirst: 'Write the first post…',
      placeholderNext: 'Continue the thread…',

      addPost: 'Add post',
      addPostAfter: 'Add a post after post {{position}}',
      removePost: 'Remove post {{position}}',
      moveUp: 'Move post {{position}} earlier',
      moveDown: 'Move post {{position}} later',
      /** Reached the editor's own ceiling, which no platform imposes. */
      capReached: 'A thread here holds up to {{max}} posts.',

      addMedia: 'Add media to post {{position}}',
      /** On a thumbnail's menu: which post of the thread carries this file. */
      mediaOn: 'On post {{position}}',
      moveMediaTo: 'Move to post {{position}}',
      uploadFailed: 'Some files were not uploaded.',
      saveFailed: 'Could not save the thread.',

      /**
       * The per-post counter. `chars` and not `count` on purpose: `count` is
       * i18next's plural variable, and this is a bare number beside another.
       */
      counter: '{{chars}}/{{limit}}',
      postCount_one: '{{count}} post',
      postCount_other: '{{count}} posts',

      /**
       * What is wrong with one post of the thread, said on that post. Each one
       * names the platform, because the rule is the platform's rather than
       * ours and the same thread is legal on the other network.
       */
      issue: {
        empty: 'This post is empty, so the thread would break here.',
        overLimit: 'Past {{limit}} characters — {{platform}} will reject this post.',
        tooManyImages: '{{platform}} takes at most {{cap}} images on one post.',
        tooManyVideos: 'A post can carry one video.',
      },

      /** The row this adds to the pre-publish bar. */
      check: {
        label: 'Thread',
        issues_one: 'Post {{positions}} needs fixing',
        issues_other: 'Posts {{positions}} need fixing',
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
  },
  /**
   * Workspace tiers (CON-232) — what the app says when the plan is the reason.
   *
   * Two vocabularies, and keeping them apart is the point. *Not in your plan*
   * is a fact about what was bought and is only ever answered by buying more.
   * *You've reached your limit* is a fact about this month, usually answered by
   * waiting — so it never appears without the count and, where there is one,
   * the date the allowance comes back. Collapsing the two into one "upgrade"
   * message would turn "wait until Tuesday" into a sales pitch.
   *
   * Nothing here names a tier. Tiers are versioned and configurable, and two
   * workspaces can both be on something called "Pro" while holding different
   * allowances — so a sentence like "included in Pro" would be true on one
   * screen and a lie on the next.
   */
  tiers: {
    notInPlan: 'Not in your plan',
    notInPlanBody:
      "This isn't part of the plan your workspace is on. Upgrading turns it on for everyone here.",

    /**
     * The limit case. The headline carries no number on purpose — the count
     * lives on the meter below it, where it can be a byte size or a tally
     * without the sentence having to be rewritten for each.
     */
    limitReached: "You've reached your limit",
    resets: 'Your allowance goes back to full on {{when}}.',

    /**
     * The meter. Each period is a whole sentence: where "this month" sits in
     * the line is a different answer in every language, and gluing it onto a
     * stem would decide that in English for everyone.
     */
    usage: '{{used}} of {{limit}}',
    usageDay: '{{used}} of {{limit}} today',
    usageMonth: '{{used}} of {{limit}} this month',
    usagePost: '{{used}} of {{limit}} on this post',
    usagePublish: '{{used}} of {{limit}} for this publish',
    /** For the tier that paid to have no number here. */
    unlimited: 'Unlimited',

    /** Capitalised like every other action label in the app. */
    upgrade: 'UPGRADE',

    /**
     * A downgrade suspends; it never deletes. The body's first job is that
     * reassurance — a campaign that stops accepting edits reads as a campaign
     * that has been taken away, and it hasn't been.
     */
    suspended: 'Read-only',
    suspendedBody:
      "Your plan changed, so this is read-only for now. Nothing has been deleted — it's all here, and upgrading makes it editable again.",
    suspendedSince: 'Read-only since {{when}}.',

    /**
     * The plan screen. Note what is *not* here: the names and taglines of the
     * tiers themselves. The tier list is editorial data the server owns, so its
     * copy arrives in one language and cannot be put in a catalogue — see
     * `services/api/tiers.ts`. Everything the app says *about* a tier is here.
     */
    plansTitle: 'Plans',
    planIntro: 'What this workspace can do, and what the other plans would change.',
    /**
     * Not an Explainer, and not dismissible. Someone looking at a page of plans
     * with a button on each is entitled to know that the button does not buy
     * anything — hiding that behind a note they may have closed months ago is
     * exactly the case the Explainer rule exists to keep out.
     */
    planMock: 'Plans are not connected to billing yet. Choosing one only changes what this workspace is allowed to do.',
    planLoadFailed: 'The plans could not be loaded.',
    plansClose: 'Close plans',
    /**
     * Inside the plan's own card, where the card names what is being changed —
     * the same shape, and the same word, as a campaign's type.
     */
    changePlan: 'CHANGE',

    /**
     * Plan & billing — one card in Workspace Settings, with no screen behind
     * it. The provider is the merchant of record and holds everything a
     * customer could edit, so what is left to say fits on the card.
     *
     * "Plan & billing" rather than "Plan": the card is the answer to "where do
     * I change my card", and somebody looking for that scans headings for the
     * word billing.
     */
    billingTitle: 'Plan & billing',
    /** Same standing as `planMock`, and for the same reason — see below. */
    billingMock:
      "Billing isn't connected yet. Nothing here charges anyone, and no payment details are held.",
    /**
     * "& details" because the button beside it opens all of them — the address,
     * the tax id, the invoices — and a row called "Payment method" would make
     * that door look like it led to a card form.
     */
    paymentMethod: 'Payment Method & Details',
    /** The brand is printed beside this; the catalogue carries only the tail. */
    cardEnding: 'ending {{last4}}',
    /**
     * A subscription with no card *in our copy of it* — never phrased as a
     * missing payment method. A live subscription has one by definition, so
     * "none on file" under a plan somebody is paying for reads as *we lost your
     * card*: alarming, and untrue. It is held, elsewhere, by the seller.
     */
    cardWithProvider: 'Your payment method is held by Lemon Squeezy.',
    /** The free-tier line: a statement about money, not about a missing card. */
    noSubscription: 'Nothing is being charged for this workspace.',
    /**
     * Both tenses written out, chosen by the provider's status rather than by
     * comparing the date to the clock. `cancelled` is paid up and still
     * running; `expired` is over. Nothing derives that from `when`.
     */
    accessEnds: 'Access ends on {{when}}.',
    accessEnded: 'Access ended on {{when}}.',
    ownersOnly: 'Only workspace owners can see billing details.',

    /**
     * The one place the provider is named, and it has to be named: Lemon
     * Squeezy is the seller of record, so it is the name on the customer's
     * statement and on the invoice. The sentence exists to answer the question
     * this card will be asked — where do I change my VAT number — whose answer
     * is a place rather than a field.
     */
    providerHolds:
      'Your payment method, billing address, tax ID, invoices and cancellation are handled by Lemon Squeezy, which sells Ogen as merchant of record.',
    /** The row title says what is managed, the way SWITCH sits under a name. */
    managePortal: 'MANAGE',
    portalFailed: 'The billing portal could not be opened.',

    /**
     * Only the states worth interrupting for. "Active" beside "auto-renews on
     * the 22nd" is noise; a failed payment is not.
     */
    statusPastDue: 'Payment failed',
    statusCancelled: 'Cancelled',
    statusPaused: 'Paused',
    statusExpired: 'Expired',
    statusUnpaid: 'Unpaid',

    /**
     * The third line on the plan, and only for the two states that are a
     * problem to be solved. The tag says what happened and the line above says
     * what happens to the plan; this one says whose move it is.
     *
     * Worded apart because the provider means different things by them.
     * `past_due` is still inside the retry schedule, so the instruction is to
     * wait — sending someone to re-enter a card the provider is about to charge
     * successfully is how a card gets changed for no reason. `unpaid` has run
     * out of retries, so nothing else will happen without them.
     *
     * The provider is named in both: the card is not held here, so "update your
     * payment method" without saying where is an instruction with no address.
     */
    paymentRetrying: 'The last payment failed, and Lemon Squeezy will try it again.',
    paymentStopped:
      'The last payment failed and will not be retried — update your payment method with Lemon Squeezy to keep this plan.',

    currentPlan: 'Current plan',
    currentBadge: 'Current',
    /** The tier a change has already been made to, waiting on its date. */
    scheduledBadge: 'Scheduled',
    /** A tier version that is still held but can no longer be bought. */
    retired: 'No longer offered',
    since: 'On this plan since {{when}}.',

    /**
     * What the workspace is on. Three whole sentences rather than a stem plus
     * "monthly", because where the cadence sits in the line is a different
     * answer in every language — and a tier nobody pays for has no cadence to
     * put anywhere.
     */
    onPlan: "You're on the {{name}} plan.",
    onPlanMonthly: "You're on the {{name}} plan, billed monthly.",
    onPlanYearly: "You're on the {{name}} plan, billed yearly.",

    /**
     * When it renews. Both dates are given — the distance because that is what
     * anyone actually wants ("is it soon?"), the date because that is what they
     * will check against a calendar or a statement.
     *
     * `{{relative}}` is `Intl.RelativeTimeFormat`'s work, not the catalogue's:
     * it knows every language's plural rules and its own words for tomorrow and
     * today, so no `_one`/`_other` pair belongs here. The plain form is the
     * fallback for a date that would not parse.
     */
    autoRenews: 'It auto-renews on {{when}}.',
    autoRenewsIn: 'It auto-renews {{relative}}, on {{when}}.',

    choose: 'CHOOSE',
    /** For the button's accessible name, where "CHOOSE" alone says too little. */
    chooseNamed: 'Choose {{name}}',
    /** Undoing a scheduled downgrade — the only way back from one. */
    cancelChange: 'CANCEL CHANGE',

    /**
     * A change that has been made but has not happened yet. Both directions are
     * worded, because "Max starts on the 1st" and "you drop to Trial on the
     * 1st" want opposite tones, and only the server knows which one it is.
     */
    changeScheduled: 'You move to {{name}} on {{when}}.',
    changeScheduledUp: '{{name}} starts on {{when}}.',
    /**
     * The same two with the distance in them, for the screens that are read at
     * a glance rather than during the decision. A pending change outranks the
     * renewal line: telling a workspace its plan auto-renews when it is about
     * to drop a tier is the opposite of what happens next.
     */
    changeScheduledIn: 'You move to {{name}} {{relative}}, on {{when}}.',
    changeScheduledUpIn: '{{name}} starts {{relative}}, on {{when}}.',
    /**
     * The reassurance leads, because a plan change reads as a threat to the
     * work already in the workspace and it isn't one.
     */
    changeScheduledBody:
      "Nothing will be deleted. If you're over the new plan's limits, some things become read-only until you move back up.",
    changeFailed: 'Your plan could not be changed.',
    changedNow: "You're now on {{name}}.",
    changeCancelled: 'That change has been called off.',

    /** How a tier states an allowance, as opposed to how a meter spends one. */
    limitFlat: '{{value}}',
    limitDay: '{{value}} per day',
    limitMonth: '{{value}} per month',
    limitPost: '{{value}} per post',
    limitPublish: '{{value}} per publish',
    included: 'Included',
    excluded: 'Not included',

    price: '{{price}} per month',
    priceYear: '{{price}} per year',
    priceFree: 'Free',

    /**
     * The name each entitlement key goes by on screen. Keyed by the key rather
     * than assembled anywhere, so a feature is called the same thing on the
     * price list and on the lock that mentions it.
     */
    features: {
      seats: 'Team members',
      social_accounts: 'Connected accounts',
      multiple_accounts_per_platform: 'Several accounts on one platform',
      campaigns: 'Campaigns',
      custom_campaign_types: 'Custom campaign types',
      content_plan_runs: 'Content plan runs',
      post_assistant: 'Post Assistant',
      post_quality_reviews: 'Post quality reviews',
      post_versions: 'Version history',
      brand_personas: 'Brand personas',
      brand_voices: 'Brand voices',
      media_storage_bytes: 'Media storage',
    },
  },

  /**
   * The Content Bank. Still largely hard-coded English (CON-174) — these are
   * the strings converted so far, not the screen's full copy.
   */
  content: {
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
  },

  errors: {
    notFound: {
      code: '404',
      title: 'Page not found',
      message: "The page you're looking for doesn't exist or has been moved.",
      type: 'NOT FOUND',
      home: 'Go home',
    },
    serverUnavailable: {
      code: '503',
      title: "Can't reach the server",
      message: "The app can't connect to the server right now.",
      messageSecondLine: 'It may be restarting or temporarily offline.',
      type: 'OFFLINE',
    },
  },
}

export type Translation = typeof en
