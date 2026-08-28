import { useTranslation } from 'react-i18next'
import { useAssistantStore } from '@/stores/assistantStore'

/**
 * What the assistant has open, on a line of its own under the panel title.
 *
 * It reports two numbers and withholds a third. *Active* is every thread open
 * in the rail; *pending* is the subset with an answer the user has not seen,
 * tinted because it is the one that asks for something. A thread that is
 * *working* is not counted: the mark animates while anything runs, and a figure
 * that changed every few seconds would read as a queue draining rather than as
 * a state of the rail.
 *
 * It sits below the title rather than beside it because the title row is also
 * the way back out of a thread — a count on the same line reads as part of the
 * heading, and grew to where it pushed against the close button.
 */
export function ThreadStatusSummary() {
  const threads = useAssistantStore((s) => s.threads)
  const { t } = useTranslation()

  const list = Object.values(threads)
  if (list.length === 0) return null

  const pending = list.filter((thread) => thread.unread).length

  return (
    // No padding above it: the title's line box already leaves the pair enough
    // air, and the 2px on top of that read as a gap between two things rather
    // than as the second line of one heading.
    <p className="text-xs text-tertiary-foreground">
      {t('assistant.activeThreads', { count: list.length })}
      {pending > 0 && (
        <>
          {', '}
          <span className="text-accent">
            {t('assistant.pendingThreads', { count: pending })}
          </span>
        </>
      )}
    </p>
  )
}
