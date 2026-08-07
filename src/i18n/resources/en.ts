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
      unchanged: 'That is already your password',
    },
    currentPassword: {
      required: 'Enter your current password',
      wrong: "That's not your current password",
    },
    confirmPassword: {
      required: 'Confirm your password',
      requiredNew: 'Confirm your new password',
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
      expired: 'Your session expired. Log in again to pick up where you left off.',
      afterReset: 'Your password has been changed. Log in with the new one.',
      emailLabel: 'Email',
      emailPlaceholder: 'Enter your email',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter password',
      forgotLink: 'Forgot password?',
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
      posts: 'Posts',
      brief: 'Brief',
      assets: 'Assets',
      settings: 'Settings',
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
      current: 'Current password',
      new: 'New password',
      confirm: 'Confirm new password',
      forgotten: 'Forgotten it? <reset>Reset it by email</reset> instead.',
      otherDevices:
        'Changing your password here does not sign out your other devices. To end every other session, use the emailed reset instead — that one does.',
      submit: 'CHANGE PASSWORD',
      changed: 'Password changed',
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
      contentTypes: 'Available Content Types',
      contentTypesEmpty: 'None',
      inactiveSuffix: ' (inactive)',
      disconnectAccount: 'Disconnect {{name}}',
      disconnectTooltip: 'Disconnect this account',
      status: {
        connected: 'Connected',
        degraded: 'Sync degraded',
        degradedMessage:
          'Connected, but the {{publisher}} sync is degraded — we retry automatically.',
        disabled: 'Integration off',
        disabledMessage:
          'Connected, but the publishing integration is currently disabled on the server.',
        inactive: 'Inactive',
        inactiveMessage:
          'The connected account is inactive on {{publisher}} and can’t receive posts.',
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
