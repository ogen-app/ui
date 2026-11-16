import { useTranslation } from 'react-i18next'
import { InboxIcon, PaletteIcon } from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { LiveStatus } from '@/components/layout/LiveStatus'
import { NavIcon } from '@/components/layout/nav/NavIcon'
import { TasksSidebarItem } from '@/components/tasks/TasksSidebarItem'
import { useFeatureFlag } from '@/config/featureFlags'
import { useCampaignScope } from '@/hooks/useCampaignScope'
import { useUndecidedIdeaCount } from '@/hooks/useIdeaList'
import { useNotificationUnreadCount } from '@/hooks/useNotifications'
import { campaignSection } from '@/lib/campaignSections'
import { placeLink, type PlaceId } from '@/lib/campaignScope'

/** The work, in the order it happens. */
const MAIN: PlaceId[] = [
  'overview',
  'strategy',
  'ideas',
  'assets',
  'posts',
  'calendar',
  'analytics',
]

/** Around the work rather than the work, at the rail's foot. */
const BAND: PlaceId[] = ['foundation', 'activity', 'settings']

/**
 * The menu — one list, the same at every scope.
 *
 * Which campaign it is filtered to is chosen above the page
 * (`CampaignSwitcher`); a row keeps its place in the list and its name
 * whatever is chosen, and only where it leads changes (`lib/campaignScope`).
 * That is the whole of the design: the rail used to be two menus, the
 * workspace's and a campaign's, and moving between them rewrote the list
 * under the pointer. Now choosing a campaign changes the page and nothing
 * else.
 *
 * The figures on Ideas and Activity are the workspace's — the endpoints
 * behind them take no campaign — so they show only while no campaign is
 * chosen, rather than answering a different question than the row is asking.
 */
export function NavPlaces({ isCollapsed }: { isCollapsed: boolean }) {
  const { t } = useTranslation()
  const { where, scope, soleCampaignId } = useCampaignScope()
  const workspaceCalendar = useFeatureFlag('workspace-calendar')
  const inboxEnabled = useFeatureFlag('tasks')
  const undecided = useUndecidedIdeaCount()
  const unread = useNotificationUnreadCount()

  const row = (place: PlaceId) => {
    const link = placeLink(place, scope, {
      workspaceCalendar,
      soleCampaignId,
    })
    const icon = iconOf(place)
    const label =
      place === 'foundation'
        ? t('nav.foundation')
        : place === 'inbox'
          ? t('nav.inbox')
          : t(campaignSection(place).labelKey)
    const counts =
      scope !== null
        ? []
        : place === 'ideas'
          ? [{ value: undecided }]
          : place === 'activity'
            ? [{ value: unread }]
            : []
    const countLabel =
      place === 'ideas' && undecided > 0
        ? t('ideas.undecidedCount', { count: undecided })
        : place === 'activity' && unread > 0
          ? t('nav.activityUnread', { count: unread })
          : undefined
    return (
      <AppSidebarButtonMenu
        key={place}
        icon={<NavIcon icon={icon} />}
        text={label}
        isActive={where.place === place}
        to={link.to}
        params={link.params}
        search={link.search}
        counts={counts}
        countLabel={countLabel}
      />
    )
  }

  return (
    <>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
        {inboxEnabled && (
          <TasksSidebarItem isActive={where.place === 'inbox'} />
        )}
        {MAIN.map(row)}
      </nav>
      <div className="flex flex-col gap-0.5 px-3 pb-3">
        <LiveStatus isCollapsed={isCollapsed} />
        {BAND.map(row)}
      </div>
    </>
  )
}

function iconOf(place: PlaceId): IconSvgElement {
  if (place === 'foundation') return PaletteIcon
  if (place === 'inbox') return InboxIcon
  return campaignSection(place).icon
}
