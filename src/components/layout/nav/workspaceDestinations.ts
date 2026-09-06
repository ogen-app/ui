import { useTranslation } from 'react-i18next'
import {
  ChartLineUpIcon,
  TargetIcon,
  ToolboxIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { LinkProps } from '@tanstack/react-router'
import { useFeatureFlag } from '@/config/featureFlags'

/**
 * The workspace's destinations — level 0's list, in one table.
 *
 * One table because the same set is drawn twice under the drill-down: as rows
 * on level 0, and as the glyph row (and menu) that carries the workspace into
 * level 1, where the rail belongs to a campaign. Two hand-maintained copies of
 * a nav is how a module ends up reachable from one level and not the other,
 * which is precisely the kind of asymmetry the user reads as a bug in their
 * own memory rather than in ours.
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
  const tasksEnabled = useFeatureFlag('tasks')
  const analyticsEnabled = useFeatureFlag('analytics-overview')

  const destinations: WorkspaceDestination[] = []

  // First, because it is what is being asked of you — the one destination
  // whose contents are addressed to the person reading the rail.
  if (tasksEnabled) {
    destinations.push({
      id: 'tasks',
      label: t('nav.tasks'),
      icon: TargetIcon,
      to: '/tasks',
      isActive: (p) => p.startsWith('/tasks'),
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
