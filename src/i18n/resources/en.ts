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
      expired:
        'Your session expired — log in again to pick up where you left off',
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
      emailHint:
        'Use the address you log in with. The link stops working after an hour.',
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
      confirmHint:
        'Type it again — a typo here locks you out of your own account.',
      requestNewLink: 'Request a new link',
      knowPassword: 'Know your password?',
      logInLink: 'Log in',
      brokenTitle: "This link doesn't work",
      brokenSubtitle:
        'It looks incomplete — mail clients sometimes cut long links in half',
      brokenBody:
        'Open the link straight from the email, or <request>request a new one</request>.',
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
      /** The preview request failed for a reason that says nothing about the token — retryable. */
      previewFailedTitle: "We couldn't check this invitation",
      previewFailedSubtitle:
        'Something went wrong on our side — the link itself may still be fine',
      /** Already signed in as the invited address: nothing to create, one thing to confirm. */
      joinBody:
        "You're signed in as {{email}}, which is who this invitation is for. Accepting adds this workspace to your account.",
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
    /** CON-237. Behind the `analytics-overview` flag — hidden while it is off. */
    analytics: 'Analytics',
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
      descriptionPlaceholder:
        'What the work is, and anything the next person needs to know',
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
    loadFailed: 'Unable to load activity',
    /**
     * One of the feed's two sources failed while the other answered. The feed
     * still renders what arrived; this names the half that is missing so a
     * quiet page cannot be mistaken for a quiet workspace.
     */
    notificationsUnavailable:
      'Notifications could not be loaded — showing the daily reports only.',
    summariesUnavailable:
      'Campaign summaries could not be loaded — entries may be missing their links and the daily reports are unavailable.',
    /**
     * Said under the last day card when the recorded half came back a full
     * page. Names which half ran out — the day reports below it are computed
     * from posts and go back as far as the posts do.
     */
    truncated:
      'Showing the most recent 100 entries. The daily reports below go back further.',
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
    /**
     * What a recorded notification says (CON-242), one key per `type` this
     * build knows. The server sends its own English title beside every row and
     * these deliberately replace it: a sentence composed on the wire cannot be
     * translated or re-worded without a deploy on both sides. A `type` with no
     * key here falls back to the server's title, which is how a new producer
     * ships before its copy does — see `lib/notifications.ts`.
     *
     * Written as outcomes rather than as instructions: the feed is a record of
     * what happened, and what to do about it is the row you click through to.
     */
    notification: {
      connectionExpiring: 'Your {{channel}} connection expires soon',
      connectionActionRequired:
        'Your {{channel}} connection needs reconnecting',
      postPublished: 'A {{channel}} post was published',
      postPublishFailed: 'A {{channel}} post failed to publish',
      assetReady: 'A document finished processing',
      assetIngestFailed: 'A document could not be processed',
      /** The count is the point — it is what says whether the plan is worth opening. */
      campaignContentPlanReady_one: 'A content plan is ready — {{count}} post',
      campaignContentPlanReady_other:
        'A content plan is ready — {{count}} posts',
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
      coverage:
        'Counted from this workspace’s posts, by your local calendar day.',
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
    statusColourAlways:
      "The status colour down the card's left edge is always shown.",
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
    imagePreviewsNote:
      'Only posts that have a picture, and in the month only on the days with room for one',
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
      owner:
        'Can invite people, change roles, connect accounts and rename the workspace.',
      member:
        'Can plan, write and publish content, but not manage the workspace or its people.',
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
      slugNote:
        "Set from the name at creation; renaming the workspace won't change it.",
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
      lastWorkspace:
        'This is your only workspace. Deleting it leaves you with nowhere to work — create another one first.',
      action: 'DELETE WORKSPACE',
      confirmTitle: 'Delete {{name}}?',
      confirmBody:
        'Everything in this workspace is deleted, for every member, and you can’t restore it yourself. Type <strong>{{name}}</strong> to confirm.',
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
      empty:
        'No platforms connected yet — pick one under “Connect Platforms” below.',
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
      allowedBody:
        'Scheduled posts go out on their own, across every campaign.',
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
        convertFailed_one:
          '{{failed}} of {{count}} post could not be converted',
        convertFailed_other:
          '{{failed}} of {{count}} posts could not be converted',
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
      success:
        '{{platform}} is connected. You’ll find it under Platform Settings.',
      settling: 'Finishing setup — the account appears here in a moment.',
      errors: {
        expired:
          'That connection link expired. Please start the connection again.',
        mismatch:
          'Something went wrong connecting your account. Please try again.',
        upstream:
          'We couldn’t reach the platform. Please try again in a moment.',
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
  analytics: {
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
      ahead: 'Looking ahead — not affected by the period above',
      everyPlatform: 'Every platform — not affected by the filter above',
      allTimeEveryPlatform:
        'All time and every platform — not affected by the controls above',
      aheadEveryPlatform:
        'Looking ahead and every platform — not affected by the controls above',
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
      save_rate: {
        label: 'Saves',
        rawLabel: 'Saves',
        suffix: 'per 1,000 reached',
        heldOut_one:
          'One post did not report saves, or was seen by too few people to divide.',
        heldOut_other:
          '{{count}} posts did not report saves, or were seen by too few people to divide.',
      },
      follow_rate: {
        label: 'Follows',
        rawLabel: 'Follows',
        suffix: 'per 1,000 reached',
        heldOut_one:
          'One post did not report follows, or was seen by too few people to divide.',
        heldOut_other:
          '{{count}} posts did not report follows, or were seen by too few people to divide.',
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
      readingTotal: 'Running total',
      readingHour: '1H',
      readingDay: '1D',
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
     * The post editor's back arrow. Names the destination generically because
     * it is not always the same one — it returns to whichever arrangement of
     * the campaign's posts the user came from, calendar or table.
     */
    backToPosts: 'Back to posts',

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
        'This publishes as a chain of posts, each replying to the one before it. Type --- on its own line wherever you want a break; with no divider anywhere, blank lines are the breaks. Anything still past the character limit is cut to fit.',

      /**
       * The note under the editor: what the body will publish as. Two
       * sentences, never one assembled from clauses — only the second has a
       * limit in it, and only sometimes.
       */
      splitByDivider_one:
        'Publishes as {{count}} post, broken where you put a divider.',
      splitByDivider_other:
        'Publishes as {{count}} posts, broken where you put a divider.',
      splitByBlankLine_one:
        'Publishes as {{count}} post, broken at blank lines.',
      splitByBlankLine_other:
        'Publishes as {{count}} posts, broken at blank lines.',
      splitAutoCut_one:
        '{{count}} of them came from copy cut at {{limit}} characters.',
      splitAutoCut_other:
        '{{count}} of them came from copy cut at {{limit}} characters.',
      splitByLimit_one:
        'Publishes as {{count}} post, cut to fit {{limit}} characters.',
      splitByLimit_other:
        'Publishes as {{count}} posts, cut to fit {{limit}} characters.',
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

      saveFailed: 'Could not save which post carries which file.',

      postCount_one: '{{count}} post',
      postCount_other: '{{count}} posts',

      /**
       * The row this adds to the pre-publish bar. Length is not among the
       * things it can fail on: copy past the ceiling is cut to fit as the
       * chain is built, so what is left is the media, which only the author
       * can move.
       */
      check: {
        label: 'Thread',
        pending: 'Checking…',
        overflow: 'More than {{max}} posts',
        issues_one: 'Post {{positions}} carries more media than one post takes',
        issues_other:
          'Posts {{positions}} carry more media than one post takes',
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
     * What a post writes from. The same control renders as the card under the
     * copy and as a section in the settings rail, so the two empty states are
     * one idea at two lengths — the card can afford to explain what the list
     * is for, the rail cannot.
     */
    sources: {
      heading: 'Sources',
      /** The rail section's title. Its capitals are the copy, as everywhere. */
      sectionTitle: 'SOURCES',
      add: 'ADD SOURCE',
      fromBank: 'Choose from content bank',
      upload: 'Upload files',
      webPage: 'Add a web page',
      emptyCard:
        'This post writes from the campaign brief alone. Add the documents it should also draw on — the assistant reads exactly what is listed here.',
      emptyRail:
        'Nothing yet — this post writes from the campaign brief alone.',
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
      unlinked: {
        title: 'Nothing links this post to what was published',
        body: 'It went out by hand, so we have no way to find it on the platform and no figures for it. Adding the post link connects the two — from then on it is measured like any other.',
        action: 'ADD POST LINK',
      },
      waiting: {
        title: 'Numbers are on their way',
        body: 'This post has gone out and the first figures have not come back yet. They usually arrive within a few hours; this will fill in on its own.',
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
      liveDraft: 'Draft',
      liveDraftTime: 'Unsaved',
      liveDraftNote: 'Not snapshotted yet',
      liveSubmitted: 'Current text',
      liveSubmittedNote: 'Never snapshotted',
    },

    /**
     * The one forward move a published post has. It is not a status change
     * (`published` has no outgoing edge) but a new post, so the label says
     * where the copy lands rather than what happens to this one.
     */
    duplicate: {
      action: 'DUPLICATE INTO DRAFT',
      pending: 'Duplicating…',
      success: 'Draft created',
      error: "The post couldn't be duplicated. Try again.",
      /** Appended to the copy's title so the two are told apart in a list. */
      titleSuffix: '{{title}} (copy)',
    },

    /**
     * The post's notes (CON-188) — draft theses the content plan captured,
     * prompts the assistant wrote, and anything typed by hand.
     */
    notes: {
      heading: 'Notes',
      add: 'ADD NOTE',
      save: 'SAVE',
      cancel: 'CANCEL',
      delete: 'DELETE',
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
    planIntro:
      'What this workspace can do, and what the other plans would change.',
    /**
     * Not an Explainer, and not dismissible. Someone looking at a page of plans
     * with a button on each is entitled to know that the button does not buy
     * anything — hiding that behind a note they may have closed months ago is
     * exactly the case the Explainer rule exists to keep out.
     */
    planMock:
      'Plans are not connected to billing yet. Choosing one only changes what this workspace is allowed to do.',
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
    paymentRetrying:
      'The last payment failed, and Lemon Squeezy will try it again.',
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
  brand: {
    binding: {
      voice: 'Voice',
      audience: 'Audience',
      campaignVoiceHint:
        'The voice this campaign writes in. Posts open in it and can be changed one by one; leave it unset to use the workspace default.',
      campaignAudienceHint:
        'Who this campaign is written to. A post that addresses somebody else says so on the post.',
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
      openBrand: 'Open Brand',
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
        whenEmpty:
          'Nothing is off limits. Any voice here may promise anything.',
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
       * How the parts of a fact are joined — a comma and a space in English.
       * On the catalogue rather than in the helper because the separator is a
       * property of the language, and a hard-coded `', '` is the same class of
       * bug as a hard-coded date format.
       */
      separator: ', ',
    },

    /** The furniture every Brand screen is built from — `shell.tsx`. */
    shell: {
      readByNothing:
        "Nothing reads this yet — you can fill it in, but it won't change what comes out.",
      comingSoon: 'COMING SOON',
      /** The word beside the star. Lower case is deliberate — it sits in a row of facts. */
      default: 'default',
      chipMore: '+{{count}} more',
      origin: {
        blank: 'Written here',
        template: 'From a template',
        website: 'Read off the website',
        posts: 'Learned from published posts',
        promoted: 'Saved from a post',
      },
      /** The detail beside `origin.posts` — how many posts it was learned from. */
      originPostCount_one: '{{count}} post',
      originPostCount_other: '{{count}} posts',
      offer: {
        dismiss: "Don't offer this again",
        title: 'Read the rest off your website',
        body: 'One pass fills {{fills}} — from your own copy, not from a template. You see everything it proposes before any of it is saved.',
        fallback:
          'If none of it is written down anywhere, Ogen will ask you a handful of questions and draft it with you. If it is — a brand deck, a tone-of-voice PDF, an old style guide — that works as well as the site does.',
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
        },
      },
    },

    /** The hub — `BrandOverview.tsx`. */
    overview: {
      /**
       * The honesty rule at index length. The section's own screen says it in a
       * sentence (`shell.readByNothing`); five sentences down one page is the
       * noise that made this screen read as an essay, so here it is three
       * words.
       */
      nothingReads: 'Nothing reads this yet',
      /** The right margin of a row that counts a list. */
      stated: '{{count}} stated',
      none: 'none',
      logosWithJobs: '{{count}} with jobs',
      coloursWithRoles: '{{count}} with roles',
      bannedWordCount: '{{count}} words',
      written: 'written',
      guardrails: {
        facts: 'Facts',
        factsEmpty: 'Every number and product detail is invented fresh.',
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
      back: 'Back to Brand',
      backToVoices: 'Back to voices',
      backToAudiences: 'Back to audiences',
      errorHeader: 'Brand could not be loaded',
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
      created: '{{name}} is in the library.',
      saved: '{{name}} saved.',
      deleted: '{{name}} was deleted.',
      guardrailsSaved: 'The guardrails are saved.',
      guardrailsCreated: 'The guardrails are set.',
      guardrailsDeleted: 'The guardrails were deleted.',
    },

    /** The screen every workspace sees on the day this ships — `FirstRun.tsx`. */
    firstRun: {
      title:
        'Everything generated here sounds like everything else generated anywhere',
      body: 'People use social media to be distinct — that is what branding is for. Generated content has no voice of its own and nothing stopping it from reading like the rest of the feed. This is where you keep the material that makes yours yours: how you sound, who you are talking to, and what you may never claim.',
      manual: {
        title: 'Fill it in yourself',
        body: 'Straight to the three sections, empty. The fastest path when you already know how you sound and only need somewhere to put it.',
      },
      guided: {
        title: 'Build it with Ogen',
        body: 'Answer a handful of questions and Ogen drafts the whole thing with you — the path that works when none of this is written down anywhere, and the only one that needs no website, no archive and no file.',
      },
      website: {
        title: 'Read it off your website',
        body: 'Point us at your site and we propose the whole thing in one step — voice samples from your own copy, the disclaimer you already run, and the product facts behind every claim.',
      },
      posts: {
        title: 'Learn it from your posts',
        body: "The voice you already have, in your own words. Fix what's wrong rather than inventing something from scratch.",
      },
      template: {
        title: 'Start from a template',
        body: 'A short setup that walks the whole brand one question at a time — voice, audience and the things you can never claim. Individual starter voices and audiences already exist inside those two sections; what is coming is doing all three in one pass.',
      },
    },

    /** The visual half — `LookSection.tsx`. */
    look: {
      edit: 'EDIT',
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
      writeFromScratch: 'WRITE ONE FROM SCRATCH',
      add: 'ADD VOICE',
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
        },
        emoji: {
          never: 'no emoji',
          sparingly: 'some emoji',
          freely: 'emoji freely',
        },
        hashtags: {
          never: 'no hashtags',
          few: 'few hashtags',
          many: 'hashtag-heavy',
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
        save: 'Save voice',
        create: 'Create voice',
        introNamed: '{{name}} Voice',
        introNew: 'A new voice',
        introBody:
          'Three to eight real posts you would be happy to have written are what make one. Everything else on this screen is what a sample cannot say for itself.',
        forkedNote:
          'Nothing is saved yet, and the samples are empty: that is the half a template cannot give you, and the half that does the work.',
        general: 'General',
        defaultDoes: 'Posts start in this voice unless another one is picked.',
        defaultCosts: 'Takes the default off whichever voice has it now.',
        name: 'Name',
        namePlaceholder: 'Founder, off the cuff',
        description: 'Description',
        descriptionHint:
          'When to use it — one line, and the one a picker shows under the name.',
        descriptionPlaceholder:
          'The lighter end-of-week post, and nothing else',
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
        moreSampleOptions: 'More sample options',
        resetSamples: 'Reset samples',
        bulkUpload: 'Bulk upload',
        bulkUploadSoon: 'Coming soon',
        rules: 'Rules',
        rulesHint:
          'What a sample cannot say for itself. A pasted post shows the register; it cannot promise that the next thirty avoid hashtags.',
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
          'Not built yet. Every channel uses this voice exactly as written above.',
        /**
         * The five scales, as the *editor* words them — deliberately not
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
          },
          emojiLabel: 'Emoji',
          emoji: {
            never: 'never',
            sparingly: 'sparingly',
            freely: 'freely',
          },
          hashtagsLabel: 'Hashtags',
          hashtags: {
            never: 'never',
            few: 'a few',
            many: 'many',
          },
          lengthLabel: 'Length',
          length: {
            short: 'short',
            medium: 'medium',
            long: 'long',
          },
        },
        noun: 'VOICE',
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
      describeYourself: 'DESCRIBE ONE YOURSELF',
      add: 'ADD AUDIENCE',
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
        save: 'Save audience',
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
        noun: 'AUDIENCE',
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
      count: '· {{count}}',
      add: 'ADD TEMPLATE',
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
      coversNone:
        'Covers none of {{needed}}. Every picture here goes out bare.',
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
      save: 'Save guardrails',
      create: 'Set the guardrails',
      discard: 'Discard changes',
      forkedNote:
        'The rules arrived and the facts did not: a template knows what a business like yours may never claim, and nothing at all about what is true of you. Read every line before saving it — this is the section people stop checking.',
      starterGroupTitle: 'Start from a template',
      starterGroupBody:
        'Three shapes the rules take, rather than thirty industries. Pick the closest and it fills the lists below — every line is meant to be read and edited, because this is the one section people will trust.',
      facts: 'Facts',
      factsHint:
        'What is true, so it stops being invented. Figures, dates, what the product does and what it costs — the things a generator otherwise fills in plausibly.',
      factsPlaceholder:
        'Support answers within one working day, every day of the week.',
      addFact: 'Add a fact',
      mayClaim: 'May claim',
      mayClaimHint:
        'Claims already checked, in the form they were checked in. This is what stops a sentence that took a lawyer an hour being written from scratch every time.',
      mayClaimPlaceholder: 'That setup takes two weeks, start to finish.',
      addClaim: 'Add a claim',
      neverClaim: 'Never claim',
      neverClaimHint:
        'Write the claim itself rather than the topic — “any guaranteed outcome, in any form” rather than “results”. A topic is something to avoid mentioning; a claim is something a sentence can be checked against.',
      neverClaimEmpty:
        'Nothing is off limits yet. Every voice in the workspace may promise anything, in any words.',
      neverClaimPlaceholder: 'That the result is guaranteed, in any form.',
      addRule: 'Add a rule',
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
      unsaved: 'Unsaved changes',
      unsavedShort: 'Unsaved',
      saved: 'Saved',
      noun: 'GUARDRAILS',
      /** The `name` in the delete dialog's title — a singleton has no name of its own. */
      dangerName: 'Guardrails',
      deleteCost:
        'The section goes back to empty: no stated facts, nothing sanctioned and nothing off limits, for every voice in the workspace. Posts already published are untouched — their text was written and it stands.',
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
       * The fork note's first sentence. `<name>` is the starter's name, set in
       * the foreground colour — a `<Trans>` rather than three JSX fragments,
       * because where the emphasis falls inside a sentence is the translator's
       * decision and not the layout's.
       */
      forkedFrom:
        'Started from <name>{{name}}</name>, and copied rather than linked — ours changing will never change yours.',
      danger: {
        title: 'Danger zone',
        /**
         * `{{noun}}` arrives already in capitals (`VOICE`, `AUDIENCE`) because
         * the caps are part of the copy for a destructive action — they survive
         * copy/paste, screen readers and any restyle, which a `uppercase` class
         * does not. Every language writes its own here.
         */
        delete: 'DELETE {{noun}}',
        keep: 'KEEP {{noun}}',
        confirmTitle: 'Delete "{{name}}"?',
        confirmBody: '{{cost}} This cannot be undone.',
      },
      default: 'Default',
      makeDefault: 'MAKE DEFAULT',
    },
  },

  campaigns: {
    title: 'Campaigns',
    add: 'ADD CAMPAIGN',
    error: 'Failed to load campaigns',
    untitled: 'this campaign',
    empty: {
      title: 'No campaigns yet',
      subtitle: 'Create your first campaign to get started',
    },
    /** The drawer at the foot of the list, not a second view of the screen. */
    archivedSection: 'Archived campaigns',
    archivedError: 'Failed to load archived campaigns',
    archivedOn: 'Archived {{archivedOn}}',
    unarchive: 'UNARCHIVE',
    archivedEmpty:
      'Nothing is archived. Archiving a campaign takes it off the list without deleting anything: its posts, schedule and content stay exactly as they are.',
    /**
     * One card holds both ways of stopping a campaign, so its own copy stays
     * general and each modal carries the consequences of the button that
     * opened it — read where they are acted on rather than skipped on the way
     * down the page.
     */
    dangerZone: {
      title: 'Danger Zone',
      body: 'Two ways to stop running this campaign. Archiving keeps everything and can be undone; deleting removes the campaign and its posts for good.',
      archive: {
        action: 'ARCHIVE CAMPAIGN',
        confirmTitle: 'Archive {{name}}?',
        confirmBody:
          'The campaign comes off the Campaigns list and stops being offered anywhere new work is filed. Nothing is deleted. Its posts, schedule, brief and content stay exactly as they are, and you can bring it back from the archive at any time.',
        keep: 'KEEP IT ACTIVE',
        confirm: 'ARCHIVE CAMPAIGN',
      },
      delete: {
        action: 'DELETE CAMPAIGN',
        confirmTitle: 'Delete {{name}}?',
        confirmBody:
          'The campaign, its posts and its schedule are removed, and nothing in the app can bring them back. Posts that have already been published stay live on the social networks. Archive it instead if you only want it off the list.',
        keep: 'KEEP CAMPAIGN',
        confirm: 'DELETE CAMPAIGN',
      },
    },
  },

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

    /**
     * An image asset's screen (CON-246). The two text fields are the whole
     * point of it, so their help lines carry the distinction rather than
     * leaving it to be guessed from the labels: one is read out to a person,
     * the other is read by the assistant looking for a picture.
     */
    image: {
      titlePlaceholder: 'Title',
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
    },

    /** The floating bar over a ticked selection in the documents list. */
    selection: {
      count_one: '{{count}} selected',
      count_other: '{{count}} selected',
      clear: 'CLEAR',
      delete: 'DELETE',
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
      action: 'TAG',
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
      cancel: 'CANCEL',
      submit: 'APPLY',
      done_one: '{{count}} document updated',
      done_other: '{{count}} documents updated',
    },
  },

  /**
   * The upload modal and its drop zone.
   *
   * The limits are two lines rather than one because they answer two different
   * questions — "will it take my PDF" and "will it take my photo" — and a
   * reader looking for one of them should not have to read past the other.
   * Their sizes are interpolated from the caps in `lib/assetStatus`, so the
   * copy never states a number that has drifted from the one enforced.
   */
  uploads: {
    limitDocs: 'Markdown up to {{md}}, PDF up to {{pdf}}',
    limitImages: 'Images (JPEG, PNG, WebP, GIF) up to {{size}}',
    /** Why an upload can finish and the document still not be readable. */
    pdfNote: 'PDFs are read in the background, so they finish after upload.',
    browse: 'Drop files here or click to browse',
    remove: 'Remove {{name}}',
    cancel: 'CANCEL',
    submit: 'UPLOAD',
    /** The count is what makes the button worth reading twice before clicking. */
    submitCount: 'UPLOAD ({{n}})',
    /** Named while a drag is over the page — the one moment the destination
        can be stated without being asked for. */
    dropInto: 'Add these to {{scope}}',
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
