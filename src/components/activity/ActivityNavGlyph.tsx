import { useTranslation } from 'react-i18next'
import { useLocation } from '@tanstack/react-router'
import { BellSimpleIcon } from '@phosphor-icons/react'
import { NavGlyph } from '@/components/layout/nav/NavGlyph'
import { useNotificationUnreadCount } from '@/hooks/useNotifications'

/**
 * Activity, as a glyph in the rail's utility strip.
 *
 * Still its own component, and still for the original reason: the feature's
 * query mounts with the feature. Rendered only behind the flag, so nothing is
 * fetched for a screen nobody can reach.
 *
 * What changed is where it sits. It was the first row of the list, on the
 * argument that "what happened while I was away" is the question you arrive
 * with — but the list is now the *work*, one level at a time, and looking back
 * is not work you do. Down in the strip it survives the drill instead, which
 * is worth more than being first: you check what happened *while* you are
 * inside a campaign, and a row that only exists at level 0 could not be.
 *
 * The figure becomes a dot. Three glyphs cannot carry three numbers, and the
 * count was never the point — that there is one is.
 */
export function ActivityNavGlyph() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const unread = useNotificationUnreadCount()

  return (
    <NavGlyph
      label={
        unread > 0
          ? `${t('nav.activity')} · ${t('nav.activityUnread', { count: unread })}`
          : t('nav.activity')
      }
      icon={BellSimpleIcon}
      to="/activity"
      isActive={pathname.startsWith('/activity')}
      dot={unread > 0}
    />
  )
}
