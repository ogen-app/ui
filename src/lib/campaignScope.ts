/**
 * Where a change of campaign scope lands.
 *
 * The menu is one list and the campaign switcher above the page narrows it:
 * picking a campaign keeps you on the same kind of place — the workspace's
 * Ideas become that campaign's Ideas — and "All campaigns" widens it back. A
 * place with no twin on the other side (Foundation, Strategy, the campaigns
 * list) lands on the nearest thing that is the scope's own front page:
 * a campaign's Overview, or the Campaigns list.
 */

/** A campaign's sections, as the last segment of its own routes. */
const CAMPAIGN_SECTIONS = [
  'overview',
  'strategy',
  'ideas',
  'assets',
  'list',
  'calendar',
  'analytics',
  'activity',
  'settings',
] as const

/** Workspace places that have a campaign twin, by their first segment. */
const TO_CAMPAIGN: Record<string, string> = {
  ideas: 'ideas',
  assets: 'assets',
  calendar: 'calendar',
  analytics: 'analytics',
  activity: 'activity',
  'workspace-settings': 'settings',
}

/** A campaign section's workspace twin; anything else goes to the list. */
const TO_WORKSPACE: Record<string, string> = {
  ideas: '/ideas',
  assets: '/assets',
  analytics: '/analytics',
  activity: '/activity',
  settings: '/workspace-settings',
}

const CAMPAIGN_PATH = /^\/campaigns\/([^/]+)(?:\/([^/]+))?/

/** The section a campaign path is on, folding the editor screens into their list. */
function sectionOf(pathname: string): string {
  const section = CAMPAIGN_PATH.exec(pathname)?.[2]
  if (section === 'posts') return 'list'
  return (CAMPAIGN_SECTIONS as readonly string[]).includes(section ?? '')
    ? section!
    : 'overview'
}

/**
 * The address to go to when the scope becomes `target` (a campaign id, or
 * `null` for all campaigns) from `pathname`.
 */
export function scopeTarget(
  pathname: string,
  target: string | null,
  { workspaceCalendar }: { workspaceCalendar: boolean },
): string {
  const inCampaign = CAMPAIGN_PATH.test(pathname)

  if (target === null) {
    if (!inCampaign) return pathname
    const section = sectionOf(pathname)
    if (section === 'calendar' && workspaceCalendar) return '/calendar'
    return TO_WORKSPACE[section] ?? '/campaigns'
  }

  const id = encodeURIComponent(target)
  if (inCampaign) return `/campaigns/${id}/${sectionOf(pathname)}`

  const first = pathname.split('/')[1] ?? ''
  return `/campaigns/${id}/${TO_CAMPAIGN[first] ?? 'overview'}`
}
