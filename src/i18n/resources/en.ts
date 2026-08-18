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
    campaigns: 'Campaigns',
    contentBank: 'Content Bank',
    workspaceSettings: 'Workspace Settings',
    profile: 'Profile',
    help: 'Help and support',
    logOut: 'Log out',
    closeSidebar: 'Close sidebar',
    untitledCampaign: 'Untitled campaign',
    campaign: {
      overview: 'Overview',
      // Named for where it goes, not for what it holds: this row opens the
      // calendar, and "Posts" alone read like a list.
      posts: 'Posts calendar',
      analytics: 'Analytics',
      brief: 'Brief',
      assets: 'Assets',
      settings: 'Settings',
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
    openAssets: 'OPEN ASSETS',
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
     * Calendar Settings. One picture switch for the whole calendar, then one
     * section of row switches per view. The note is state rather than teaching
     * — a post with no picture has nothing to preview, and a user who turns
     * this on and sees half their cards unchanged is owed the reason.
     */
    imagePreviews: 'Show cards as image previews',
    imagePreviewsNote: 'Only posts that have a picture',
    weekCard: 'WEEK CARD',
    monthCard: 'MONTH CARD',
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
      body: 'Deleting your account also deletes the campaigns, posts and assets you created in this workspace. This cannot be undone.',
      action: 'DELETE ACCOUNT',
    },
    delete: {
      title: 'Delete your account?',
      body: 'This permanently deletes <strong>{{email}}</strong> and everything you created in this workspace — your campaigns, their posts, your uploaded assets and tags. It cannot be undone.',
      shared:
        'If anyone else uses <strong>{{workspace}}</strong>, that content disappears for them too. The workspace itself is not deleted.',
      thisWorkspace: 'this workspace',
      confirmLabel: 'Type <email>{{email}}</email> to confirm',
      keep: 'KEEP MY ACCOUNT',
      confirm: 'DELETE MY ACCOUNT',
    },
  },

  workspaceSettings: {
    title: 'Workspace Settings',
    loadFailed: 'Failed to load settings',
    workspace: {
      /** The row title doubles as the section heading, e.g. "BN Digital Workspace". */
      rowTitle: '{{name}} Workspace',
      loadFailed: 'Failed to load the workspace.',
      nameLabel: 'Organization name',
      nameEmpty: 'Name can’t be empty',
      slugLabel: 'Slug',
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
      authorize:
        'Authorize your {{platform}} account in the tab that just opened. If nothing opened, use the button below.',
      openConnectPage: 'Open the {{platform}} connect page',
      expiry:
        'The link expires at {{time}}. Once you finish, the account appears here automatically — this can take a minute.',
      expirySoon: 'soon',
      checkNow: 'Check now',
      success: '{{platform}} is connected. You’ll find it under Platform Settings.',
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
  },

  posts: {
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
