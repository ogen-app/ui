/** The chooser at `/workspaces` — one login, several workspaces (CON-147). */
export const workspaces = {
  title: 'Your workspaces',
  loadFailed: 'Failed to load your workspaces.',
  create: 'New workspace',
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
    /** 403 `workspace_limit` — the per-account cap while signup is invite-only (CON-333). */
    workspaceLimit:
      "You've reached the number of workspaces available during the beta.",
  },
}
