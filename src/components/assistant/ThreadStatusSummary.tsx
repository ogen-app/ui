import { useTranslation } from 'react-i18next'
import { useAssistantStore } from '@/stores/assistantStore'
import { counted } from '@/lib/intl'

/**
 * How many threads the rail has open, as a badge beside the panel's close
 * button — the header is one line, so this is not a line of its own.
 *
 * It reports one number and marks a second. *Threads* is every thread open in
 * the rail; a teal dot says some of them have an answer the user has not seen,
 * and names how many on hover. A thread that is *working* is not counted: the
 * mark animates while anything runs, and a figure that changed every few
 * seconds would read as a queue draining rather than as a state of the rail.
 */
export function ThreadStatusSummary() {
  const threads = useAssistantStore((s) => s.threads)
  const { t } = useTranslation()

  const list = Object.values(threads)
  if (list.length === 0) return null

  const pending = list.filter((thread) => thread.unread).length
  const pendingLabel =
    pending > 0 ? t('assistant.pendingThreads', counted(pending)) : undefined

  return (
    <span
      title={pendingLabel}
      className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border px-2 text-xs text-tertiary-foreground"
    >
      {pendingLabel && (
        <span
          role="img"
          aria-label={pendingLabel}
          className="size-1.5 shrink-0 rounded-full bg-accent"
        />
      )}
      {t('assistant.threadCount', counted(list.length))}
    </span>
  )
}
