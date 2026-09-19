import { useTranslation } from 'react-i18next'
import { LightbulbIcon } from '@phosphor-icons/react'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { useIdeas } from '@/hooks/useIdeas'
import { countIdeas } from '@/lib/ideas'

/**
 * The Ideas row — how much of the backlog is still a question.
 *
 * Its own component so the feature's query mounts with the feature: with the
 * flag off this never renders, so nothing is fetched for a screen nobody can
 * reach. The same reason `TasksSidebarItem` exists, and the same shape.
 *
 * **Undecided rather than the whole pile**, because the number that belongs in
 * a rail is the one you can do something about. A backlog is meant to be long
 * — that is the point of one, and the difference between this module and the
 * Inbox above it — so "142 ideas" would be a figure that only ever goes up and
 * is never a reason to click. What is being counted is the *unanswered*, which
 * is work: it goes down when somebody triages, and the row falls quiet when
 * the backlog has been answered.
 *
 * It includes a woken postponement, because `countIdeas` does and the piles
 * have to agree: an idea whose day has come is back to being a question, and a
 * rail saying 3 over a screen showing 4 undecided is the kind of disagreement
 * people report as "the count is wrong" long after they have stopped trusting
 * either number.
 *
 * The clock is read per render rather than held, and the rail lives for the
 * whole session — so an idea that comes due at two o'clock appears in this
 * count at the next render rather than on the stroke. That is the same
 * granularity the Ideas screen has (it reads the clock when it opens), and the
 * alternative is a timer ticking all day to catch a boundary nobody is
 * watching for.
 */
export function IdeasSidebarItem({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation()
  const { ideas } = useIdeas()
  const undecided = countIdeas(ideas, new Date()).waiting

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
