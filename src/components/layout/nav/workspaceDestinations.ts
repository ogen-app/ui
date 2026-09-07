import { useTranslation } from 'react-i18next'
import {
  BellSimpleIcon,
  CalendarDotsIcon,
  ChartLineUpIcon,
  GearSixIcon,
  LightbulbIcon,
  PaletteIcon,
  ToolboxIcon,
  TrayIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { LinkProps } from '@tanstack/react-router'
import { useFeatureFlag } from '@/config/featureFlags'

/**
 * The workspace's destinations — level 0's list, in one table.
 *
 * One table because the same set is drawn twice under the drill-down: as rows
 * on level 0, and as the menu that carries the workspace into level 1, where
 * the rail belongs to a campaign. Two hand-maintained copies of a nav is how a
 * module ends up reachable from one level and not the other, which is
 * precisely the kind of asymmetry the user reads as a bug in their own memory
 * rather than in ours.
 *
 * Every row here has a campaign-scoped twin one level down — see
 * `lib/campaignSections`, which is the same list narrowed. The pairing is the
 * design: Inbox → Overview, Ideas → Campaign ideas, Campaigns → Posts,
 * Calendar → Calendar, Analytics → Campaign analytics, and in the footer
 * Foundation → Campaign assets, Activity → Campaign activity, Workspace
 * settings → Campaign settings. Adding a module to one level without the
 * other breaks the thing the two levels are teaching.
 *
 * `to` is the router's own union rather than a string, for the reason spelled
 * out on `AppSidebarButtonMenu`: a `string` here is the one place in the app
 * where a dead route still compiles.
 *
 * Flags are read here rather than at each call site so a feature that is off
 * is absent from *every* rendering of the nav at once — a glyph row that keeps
 * a destination the list has dropped is the same asymmetry by another route.
 */
export type WorkspaceDestination = {
  id: string
  label: string
  icon: Icon
  to: LinkProps['to']
  /** True when the current path is this destination. */
  isActive: (pathname: string) => boolean
}

export function useWorkspaceDestinations(): WorkspaceDestination[] {
  const { t } = useTranslation()
  const inboxEnabled = useFeatureFlag('tasks')
  const ideasEnabled = useFeatureFlag('ideas')
  const calendarEnabled = useFeatureFlag('workspace-calendar')
  const analyticsEnabled = useFeatureFlag('analytics-overview')

  const destinations: WorkspaceDestination[] = []

  // First, because it is what is being asked of you — the one destination
  // whose contents are addressed to the person reading the rail. Inside a
  // campaign the same slot is that campaign's Overview.
  if (inboxEnabled) {
    destinations.push({
      id: 'inbox',
      label: t('nav.inbox'),
      icon: TrayIcon,
      to: '/tasks',
      isActive: (p) => p.startsWith('/tasks'),
    })
  }

  // Before Campaigns, because it is the earlier state of the same material:
  // an idea is what a campaign is made out of, and the order of the rail is
  // the order the work happens in.
  if (ideasEnabled) {
    destinations.push({
      id: 'ideas',
      label: t('nav.ideas'),
      icon: LightbulbIcon,
      to: '/ideas',
      isActive: (p) => p.startsWith('/ideas'),
    })
  }

  destinations.push({
    id: 'campaigns',
    label: t('nav.campaigns'),
    icon: ToolboxIcon,
    to: '/campaigns',
    // Exact: everything below `/campaigns/<id>` is level 1, and lighting the
    // module row up while the rail is drawing a campaign would say the two are
    // the same place — which is the conflation the drill-down exists to undo.
    isActive: (p) => p === '/campaigns',
  })

  if (calendarEnabled) {
    destinations.push({
      id: 'calendar',
      label: t('nav.calendar'),
      icon: CalendarDotsIcon,
      to: '/calendar',
      isActive: (p) => p.startsWith('/calendar'),
    })
  }

  if (analyticsEnabled) {
    destinations.push({
      id: 'analytics',
      label: t('nav.analytics'),
      icon: ChartLineUpIcon,
      to: '/analytics',
      isActive: (p) => p.startsWith('/analytics'),
    })
  }

  return destinations
}

/**
 * Everything level 0 offers, for the menu behind the workspace mark at level 1.
 *
 * The modules above, then the utilities the footer draws — Foundation,
 * Activity and the workspace's own settings. Inside a campaign that footer is
 * showing *this campaign's* settings, so this menu is the only way back to the
 * workspace's; the other two are duplicated from rows that are still on
 * screen, and deliberately, because a menu called Workspace that holds some of
 * the workspace is worse than one that repeats itself. Read it as "the level
 * you came from, whole".
 *
 * Flags again read once, here, for the reason above: a feature that is off is
 * absent from the menu and the rail together or the two disagree.
 */
export function useWorkspaceMenuEntries(): WorkspaceDestination[] {
  const { t } = useTranslation()
  const destinations = useWorkspaceDestinations()
  const brandEnabled = useFeatureFlag('brand-materials')
  const activityEnabled = useFeatureFlag('activity')

  const entries = [...destinations]

  if (brandEnabled) {
    entries.push({
      id: 'foundation',
      label: t('nav.foundation'),
      icon: PaletteIcon,
      to: '/foundation',
      isActive: (p) => p.startsWith('/foundation'),
    })
  }

  if (activityEnabled) {
    entries.push({
      id: 'activity',
      label: t('nav.activity'),
      icon: BellSimpleIcon,
      to: '/activity',
      isActive: (p) => p.startsWith('/activity'),
    })
  }

  entries.push({
    id: 'workspace-settings',
    label: t('nav.workspaceSettings'),
    icon: GearSixIcon,
    to: '/workspace-settings',
    isActive: (p) => p.startsWith('/workspace-settings'),
  })

  return entries
}
