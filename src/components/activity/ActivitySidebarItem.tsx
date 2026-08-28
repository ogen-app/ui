import { useTranslation } from 'react-i18next'
import { BellSimpleIcon } from '@phosphor-icons/react'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { useActivityUnreadCount } from '@/hooks/useActivity'

/**
 * The Activity row, first in the sidebar's Modules section.
 *
 * Its own component so the feature's queries mount with the feature: the count
 * is derived from the workspace's campaign summaries in Phase 1, and with the
 * flag off this never renders, so nothing is fetched for a feature nobody can
 * see.
 *
 * A row rather than the conventional bell in the top-right corner: that corner
 * is for views of the object on screen (CON-178), and the right rail is
 * panel-scoped per screen with the assistant as its floor. Activity is global
 * and belongs where the other global destinations are.
 */
export function ActivitySidebarItem({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation()
  const unread = useActivityUnreadCount()

  return (
    <AppSidebarButtonMenu
      icon={<BellSimpleIcon weight="regular" className="size-5 flex-none" />}
      text={t('nav.activity')}
      isActive={isActive}
      to="/activity"
      // Unread entries — things that happened, where the Tasks row below counts
      // things being asked of someone. Drawn alike all the same: the difference
      // is what the two rows are, and the rail says that with their names.
      counts={[{ value: unread }]}
      countLabel={unread > 0 ? t('nav.activityUnread', { count: unread }) : undefined}
    />
  )
}
