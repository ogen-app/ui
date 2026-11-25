import { Question } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { Button } from '@/components/ui/button'
import { useFeatureFlag } from '@/config/featureFlags'
import { useHelpIndex } from '@/hooks/useHelp'
import type { HelpTopic } from '@/lib/helpTopics'
import { useHelpStore } from '@/stores/helpStore'

/**
 * The "?" that opens contextual help for one place in the app (CON-173).
 *
 * **Renders nothing when no article serves its topic.** A trigger that opens an
 * apology is worse than no trigger, and this is what lets triggers be placed
 * before the article is written: put one here, and it appears by itself the day
 * someone publishes the article that claims the topic.
 */
export function HelpTrigger({
  topic,
  className,
}: {
  topic: HelpTopic
  className?: string
}) {
  const { t } = useTranslation()
  const enabled = useFeatureFlag('help-center')
  const { data: index } = useHelpIndex({ enabled })
  const open = useHelpStore((s) => s.open)

  const articleKey = index?.topics[topic]
  if (!enabled || !articleKey) return null

  return (
    <Button
      variant="ghost"
      size="rowIcon"
      onClick={() => open(articleKey)}
      aria-label={t('help.trigger.label')}
      title={t('help.trigger.label')}
      // 24px to press, 20px in the line: the heading beside it keeps its height.
      className={cn('-m-0.5 rounded-full', className)}
    >
      <Question />
    </Button>
  )
}
