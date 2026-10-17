import { useTranslation } from 'react-i18next'
import { LightbulbIcon } from '@phosphor-icons/react'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { useUndecidedIdeaCount } from '@/hooks/useIdeaList'

/**
 * The Ideas row — how much of the backlog is still a question.
 *
 * Its own component so the count's query mounts with the row — the same
 * shape as `TasksSidebarItem`.
 *
 * **Undecided rather than the whole pile**, because the number that belongs in
 * a rail is the one you can do something about. A backlog is meant to be long
 * — that is the point of one, and the difference between this module and the
 * Inbox above it — so "142 ideas" would be a figure that only ever goes up and
 * is never a reason to click. What is being counted is the *unanswered*, which
 * is work: it goes down when somebody triages, and the row falls quiet when
 * the backlog has been answered.
 *
 * It is the server's count of the undecided pile — the same pile the Ideas
 * page's first tab counts — so a woken postponement is in it, and the rail and
 * the screen cannot disagree. One `limit=1` read rather than the whole list.
 */
export function IdeasSidebarItem({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation()
  const undecided = useUndecidedIdeaCount()

  return (
    <AppSidebarButtonMenu
      icon={<LightbulbIcon weight="regular" className="size-5 flex-none" />}
      text={t('nav.ideas')}
      isActive={isActive}
      to="/ideas"
      counts={[{ value: undecided }]}
      countLabel={
        undecided > 0
          ? t('ideas.undecidedCount', { count: undecided })
          : undefined
      }
    />
  )
}
