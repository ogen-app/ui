import { XIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { chipText } from '@/lib/assistantView'
import { useViewContextStore } from '@/stores/viewContextStore'
import type { ThreadSubject } from '@/types/assistant'

/**
 * What goes with the next message (CON-451): the selection, or the detail
 * screen that is open. Dismissing it sends that one message with the screen
 * alone; the chip comes back with the next change to the selection.
 *
 * The helper sentence beside it is teaching, so it only shows on a thread that
 * has not been used yet — after that the chip is its own label.
 */
export function ContextChip({
  subject,
  firstRun,
}: {
  subject: ThreadSubject
  firstRun: boolean
}) {
  const { t } = useTranslation()
  const location = useViewContextStore((s) => s.location)
  const page = useViewContextStore((s) => s.page)
  const dismissed = useViewContextStore((s) => s.dismissed)
  const dismiss = useViewContextStore((s) => s.dismiss)

  const text = chipText(t, subject, location, page)
  if (!text || dismissed) return null

  return (
    <div className="flex min-w-0 items-center gap-2 px-4">
      <span className="flex min-w-0 items-center gap-2 rounded-full border border-accent/10 bg-accent/5 py-1 pr-1.5 pl-3 text-xs text-secondary-foreground">
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full bg-accent"
        />
        <span className="min-w-0 truncate">{text}</span>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('assistant.chip.dismiss')}
          className="flex size-4 shrink-0 cursor-pointer items-center justify-center text-tertiary-foreground hover:text-foreground"
        >
          <XIcon className="size-3" weight="bold" />
        </button>
      </span>
      {firstRun && (
        <span className="min-w-0 truncate text-[11px] text-tertiary-foreground">
          {t('assistant.chip.helper')}
        </span>
      )}
    </div>
  )
}
