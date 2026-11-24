export const profile = {
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
  /** The password row of `signInMethods`: changed by email and only by email
   *  (CON-193), because the emailed route also revokes every other session. */
  password: {
    sentBody:
      'A link to set a new password is on its way to <email>{{email}}</email>. It expires in an hour, and using it signs out every device — including this one.',
    send: 'Email me a reset link',
    resend: 'Send it again',
    resentNote: 'Sent again — give it a minute.',
  },
  /** Every way into the account, one row each (CON-396). */
  signInMethods: {
    title: 'Sign-in methods',
    loadFailed: "Couldn't load your sign-in methods.",
    password: 'Password',
    passwordSet: 'Email and password',
    passwordNotSet: 'Not set — you sign in with Google',
    /** The same reset email: there is no current password to ask for. */
    setPassword: 'Set a password',
    google: 'Google',
    googleConnected: '{{email}} · connected {{date}}',
    googleNotConnected: 'Not connected',
    connect: 'Connect',
    disconnect: 'Disconnect',
    onlyWayIn:
      'Google is your only way in. Set a password first, then you can disconnect it.',
    connectedToast: 'Google connected',
    connectFailedToast: "Couldn't connect Google",
  },
  dangerZone: {
    title: 'Danger Zone',
    /** Leave-workspace, not account deletion: CON-147 split memberships from
     *  accounts and the API offers no account delete — the copy must not
     *  promise one. */
    body: 'Leaving this workspace removes your access and deletes everything you created in it — for everyone. Your login and your other workspaces are untouched. This cannot be undone.',
    action: 'Leave this workspace',
  },
  leave: {
    title: 'Leave {{workspace}}?',
    body: 'This removes <strong>{{email}}</strong> from the workspace and deletes everything you created in it — your campaigns, their posts, your uploaded assets and tags — for every member. Posts that already went out stay live on the social networks. It cannot be undone.',
    shared:
      'Your login keeps working: any other workspace you belong to is untouched, and <strong>{{workspace}}</strong> itself carries on without you. If you are its only owner, appoint another owner first — a workspace can’t be left ownerless.',
    thisWorkspace: 'this workspace',
    confirmLabel: 'Type <email>{{email}}</email> to confirm',
    keep: 'Stay in this workspace',
    confirm: 'Leave this workspace',
  },
}
