export const workspaceSettings = {
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
    switch: 'Switch',
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
    invite: 'Invite',
    remove: 'Remove',
    resend: 'Resend',
    cancel: 'Cancel',
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
    removeDismiss: 'Keep them',
    removeConfirm: 'Remove from workspace',
  },
  dangerZone: {
    title: 'Danger Zone',
    /** Soft-delete server-side, but the copy must not offer that as an undo —
     *  recovery is a manual support request (CON-147). */
    body: 'Deleting this workspace removes its campaigns, posts, assets and connected social accounts, and every member loses access. Already-published posts stay live on the social networks. You can’t undo this yourself — recovering a deleted workspace is a manual support request.',
    lastWorkspace:
      'This is your only workspace. Deleting it leaves you with nowhere to work — create another one first.',
    action: 'Delete workspace',
    confirmTitle: 'Delete {{name}}?',
    confirmBody:
      'Everything in this workspace is deleted, for every member, and you can’t restore it yourself. Type <strong>{{name}}</strong> to confirm.',
    confirmLabel: 'Workspace name',
    keep: 'Keep workspace',
    confirm: 'Delete workspace',
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
    needsReconnect: 'Needs reconnecting',
    reconnectDialog: {
      title: 'Reconnect {{platform}}',
      body: 'You’ll sign in to {{platform}} and come back here. Your posts and settings stay as they are, and the posts scheduled through this account go out once it is back.',
      continue: 'Continue to {{platform}}',
      cancel: 'Cancel',
    },
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
    allow: 'Allow',
    disallow: 'Disallow',
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
      upstream: 'We couldn’t reach the platform. Please try again in a moment.',
      permission:
        'We couldn’t connect a page or profile. Reconnect and make sure you allow access to a page or profile you manage.',
      noTargets:
        'This account doesn’t have any pages or profiles we can publish to.',
      generic: 'We couldn’t connect your account. Please try again.',
    },
    picker: {
      title: 'Choose what to connect',
      body: 'Your {{platform}} account manages more than one profile. Pick the one Ogen should publish to.',
      legend: 'Available {{platform}} profiles',
      submit: 'Connect {{platform}}',
      cancel: 'Cancel',
      nothingTitle: 'Nothing to connect',
      // Sentence case on purpose: this one is only ever read aloud, as the
      // label of the header's icon button.
      back: 'Back to Workspace Settings',
      backToAccounts: 'Back to Workspace Settings',
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
    keep: 'Keep connected',
    confirm: 'Disconnect account',
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
      confirm: 'Disconnect anyway',
    },
  },
}
