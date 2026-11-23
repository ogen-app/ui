/**
 * The workspace a user is in, as opposed to the settings screen for it
 * (`workspaceSettings` below) and the /workspaces chooser (`workspaces`
 * below). Two roles, because that is what the server recognises (CON-26).
 */
export const workspace = {
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
}
