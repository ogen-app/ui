import { useTranslation } from 'react-i18next'
import { TargetIcon } from '@phosphor-icons/react'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { useTasks } from '@/hooks/useTasks'
import { openTasks } from '@/lib/tasks'

/**
 * The Tasks row, directly under Activity.
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
 * A target, not a checkbox: the mark should say what the module is *for* — the
 * things to aim at — rather than repeat the control every card carries.
 */
export function TasksSidebarItem({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation()
  const { tasks } = useTasks()
  const open = openTasks(tasks).length

  return (
    <AppSidebarButtonMenu
      icon={<TargetIcon weight="regular" className="size-5 flex-none" />}
      text={t('nav.tasks')}
      isActive={isActive}
      to="/tasks"
      counts={[{ value: open }]}
      countLabel={open > 0 ? t('tasks.openCount', { count: open }) : undefined}
    />
  )
}
