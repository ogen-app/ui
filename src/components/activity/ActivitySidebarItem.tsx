import { useTranslation } from 'react-i18next'
import { BellSimpleIcon } from '@phosphor-icons/react'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { useNotificationUnreadCount } from '@/hooks/useNotifications'

/**
 * The Activity row, first in the sidebar's Modules section.
 *
 * Its own component so the feature's query mounts with the feature: with the
 * flag off this never renders, so nothing is fetched for a feature nobody can
 * see. The count is the inbox's own (`GET /api/notifications/unread-count`) —
 * one small request from a row that is on every screen, rather than the page of
 * rows only the feed renders.
 *
 * A row rather than the conventional bell in the top-right corner: that corner
 * is for views of the object on screen (CON-178), and the right rail is
 * panel-scoped per screen with the assistant as its floor. Activity is global
 * and belongs where the other global destinations are.
 */
export function ActivitySidebarItem({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation()
  const unread = useNotificationUnreadCount()

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
      countLabel={
        unread > 0 ? t('nav.activityUnread', { count: unread }) : undefined
      }
    />
  )
}
