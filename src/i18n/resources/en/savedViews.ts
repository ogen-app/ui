/** Smart groups — saved filters of a list (CON-388 §5, CON-392). */
export const savedViews = {
  all: {
    ideas: 'All ideas',
    assets: 'All assets',
  },
  groups: 'Smart groups',
  shared: 'Shared with the workspace',
  menu: 'Actions for “{{name}}”',
  rename: 'Rename',
  share: 'Share with the workspace',
  unshare: 'Stop sharing',
  duplicate: 'Duplicate',
  /** The tab strip's menu of smart groups, beside Filter. */
  views: 'Views',
  /** The × after an open group's name, leading the pills row. */
  close: 'Close “{{name}}”',
  delete: 'Delete',
  copyName: '{{name}} (copy)',
  edited: 'edited',
  invalid: 'This group’s filter no longer works.',
  saveAs: 'Save as group',
  saveCurrent: 'Save current filter as a group',
  trigger: 'Views: {{name}}',
  emptyMenu: 'Filter the list, then save it here as a group.',
  saveChanges: 'Save changes',
  saveAsNew: 'Save as new…',
  revert: 'Revert',
  saved: 'Saved “{{name}}”.',
  save: {
    title: 'Save as a smart group',
    renameTitle: 'Rename the group',
    name: 'Name',
    share: 'Share with the workspace',
    what: 'Saves the filters, the grouping and the sort — not what they find.',
    cancel: 'Cancel',
    confirm: 'SAVE GROUP',
    renameConfirm: 'SAVE',
  },
  remove: {
    title: 'Delete “{{name}}”?',
    body: 'The group goes; nothing it shows is deleted.',
    bodyShared:
      'The group goes for everyone it is shared with; nothing it shows is deleted.',
    keep: 'KEEP GROUP',
    confirm: 'DELETE GROUP',
  },
}
