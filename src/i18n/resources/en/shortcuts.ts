/**
 * The keyboard shortcuts sheet (CON-394). Each label marks its key's letter
 * with `<k>`, so a language marks whichever letter the key is — and none,
 * where its word has no such letter.
 */
export const shortcuts = {
  title: 'Ogen keyboard shortcuts',
  menuItem: 'Keyboard shortcuts',
  goTo: 'Go to',
  goHint: 'Press g, then the letter.',
  anywhere: 'Anywhere',
  inCampaign: 'In this campaign',
  campaignNote: 'Posts and Calendar have keys inside a campaign.',
  thisCampaign: 'this campaign’s',
  foot: '<k1>?</k1> or <k2>esc</k2> to close',
  /** A two-key shortcut, as a screen reader says it. */
  sequence: '{{first}}, then {{second}}',
  go: {
    ideas: '<k>I</k>deas',
    assets: '<k>A</k>ssets',
    campaigns: '<k>C</k>ampaigns',
    analytics: 'A<k>n</k>alytics',
    workspaceSettings: 'Workspace <k>s</k>ettings',
    settings: '<k>S</k>ettings',
    strategy: 'S<k>t</k>rategy',
    posts: '<k>P</k>osts',
    calendar: 'Calenda<k>r</k>',
  },
  action: {
    toggleMenu: 'Toggle the menu',
    toggleRight: 'Toggle the right panel',
    openAssistant: 'Open the assistant',
    filterDetail: 'Add a filter detail, on Ideas and Assets',
  },
}
