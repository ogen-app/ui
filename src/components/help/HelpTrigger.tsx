import { Question } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { useFeatureFlag } from '@/config/featureFlags'
import { useHelpTopicMap } from '@/hooks/useHelp'
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
  const { data: topics } = useHelpTopicMap({ enabled })
  const open = useHelpStore((s) => s.open)

  const articleKey = topics?.[topic]
  if (!enabled || !articleKey) return null

  return (
    <button
      type="button"
      onClick={() => open(articleKey)}
      aria-label={t('help.trigger.label')}
      title={t('help.trigger.label')}
      className={cn(
        'text-tertiary-foreground hover:text-foreground inline-flex size-5 cursor-pointer items-center justify-center rounded-full transition-colors',
        className,
      )}
    >
      <Question size={14} weight="bold" />
    </button>
  )
}
