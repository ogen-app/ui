import { XIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { useAsset } from '@/hooks/useContent'
import { chipText } from '@/lib/assistantView'
import { useViewContextStore } from '@/stores/viewContextStore'
import { useWindowWords } from './useWindowWords'
import type { ThreadSubject } from '@/types/assistant'
import { Button } from '@/components/ui/button'

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

  // The open asset by name, once its screen has loaded it (CON-476).
  const focusedAsset = useAsset(
    location.focus?.kind === 'asset' ? location.focus.id : '',
  )
  const words = useWindowWords()
  const text = chipText(
    t,
    subject,
    location,
    page,
    focusedAsset.data?.title,
    page?.window ? words.line(page.window) : null,
  )
  if (!text || dismissed) return null

  return (
    <div className="flex min-w-0 items-center gap-2 px-4">
      <span className="flex min-w-0 items-center gap-2 rounded-full border border-accent/10 bg-accent/5 py-1 pr-1.5 pl-3 text-xs text-secondary-foreground">
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full bg-accent"
        />
        <span className="min-w-0 truncate">{text}</span>
        <Button
          variant="ghost"
          size="xsIcon"
          className="shrink-0"
          onClick={dismiss}
          aria-label={t('assistant.chip.dismiss')}
        >
          <XIcon className="size-3" weight="bold" />
        </Button>
      </span>
      {firstRun && (
        <span className="min-w-0 truncate text-xs text-tertiary-foreground">
          {t('assistant.chip.helper')}
        </span>
      )}
    </div>
  )
}
