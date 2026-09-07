import { useTranslation } from 'react-i18next'
import { TrayIcon } from '@phosphor-icons/react'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { useTasks } from '@/hooks/useTasks'
import { openTasks } from '@/lib/tasks'

/**
 * The Inbox row — the workspace's open tasks, at the top of the rail.
 *
 * Its own component so the feature's query mounts with the feature: with the
 * flag off this never renders, so nothing is fetched for a screen nobody can
 * reach.
 *
 * One figure, and it is open work. The two counts were one row's worth of
 * numbers while tasks lived inside the feed, and splitting the modules is what
 * let each carry the one that belongs to it. A sum was never possible anyway —
 * reading the feed clears one and does nothing to the other.
 *
 * A tray rather than the target it used to wear, and Inbox rather than Tasks.
 * The row is the level's first slot — the one place addressed to *you* — and
 * one level down that same slot is the campaign's Overview. Naming it for the
 * slot is what makes the pair legible; the module behind it is still Tasks,
 * and says so everywhere else (`/tasks`, `useTasks`, its own flag).
 */
export function TasksSidebarItem({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation()
  const { tasks } = useTasks()
  const open = openTasks(tasks).length

  return (
    <AppSidebarButtonMenu
      icon={<TrayIcon weight="regular" className="size-5 flex-none" />}
      text={t('nav.inbox')}
      isActive={isActive}
      to="/tasks"
      counts={[{ value: open }]}
      countLabel={open > 0 ? t('tasks.openCount', { count: open }) : undefined}
    />
  )
}
