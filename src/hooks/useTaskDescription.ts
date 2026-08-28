import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { Task } from '@/lib/tasks'

/**
 * What a task is about, in a paragraph (CON-225).
 *
 * Two sources, and which one applies is the difference between the two kinds
 * of task:
 *
 * - **A person's task carries its own words.** Whatever the author typed, and
 *   nothing else — the system has no opinion about work it did not raise.
 * - **A rule's task borrows the rule's paragraph.** Every campaign that trips
 *   `failed-posts` trips it for the same reason and is answered the same way,
 *   so the explanation belongs to the rule rather than to the row: written
 *   once, translated once, and re-worded without touching the tasks already
 *   raised. Which is why nothing is stored on the row (`Task.description`).
 *
 * The map is exhaustive over the rules that *can* raise a task — only `alert`
 * and `risk` do — and a rule with no entry simply has no paragraph, which is
 * how a new rule behaves until someone writes one rather than a crash or a raw
 * key on screen.
 *
 * The paragraphs say what to do, not what is wrong. The title already carries
 * the condition ("2 posts failed to publish"); repeating it at greater length
 * would be a description that describes the sentence above it.
 */
const RULE_DESCRIPTIONS = {
  'failed-posts': 'tasks.rule.failedPosts',
  'manual-publish-due': 'tasks.rule.manualPublishDue',
  'auto-publish-overdue': 'tasks.rule.autoPublishOverdue',
  'not-published': 'tasks.rule.notPublished',
  'planned-today-unscheduled': 'tasks.rule.plannedTodayUnscheduled',
  'pipeline-gap': 'tasks.rule.pipelineGap',
  'accounts-missing-blocking': 'tasks.rule.accountsMissingBlocking',
  'account-inactive': 'tasks.rule.accountInactive',
  'channel-dropped-scheduled': 'tasks.rule.channelDroppedScheduled',
  'behind-pace': 'tasks.rule.behindPace',
} as const

export function useTaskDescription() {
  const { t } = useTranslation()

  return useCallback(
    (task: Task): string => {
      const written = task.description.trim()
      if (written) return written
      if (task.source.kind !== 'rule') return ''
      const key = RULE_DESCRIPTIONS[task.source.ruleId as keyof typeof RULE_DESCRIPTIONS]
      return key ? t(key) : ''
    },
    [t],
  )
}
