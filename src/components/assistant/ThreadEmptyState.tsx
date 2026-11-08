import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/Logo'
import { StarterChips } from './StarterChips'
import type { ThreadSubject } from '@/types/assistant'

/**
 * What an unused thread says for itself. Campaign and post threads get the
 * same shape — mark, three lines of what the assistant can do here, then the
 * starters — because the difference between them is the work, not the layout.
 *
 * Three lines, not a paragraph: each one is a capability the user can act on,
 * and the chips below are the same list in a form they can click.
 */
const LINES = {
  campaign: [
    'assistant.empty.campaign1',
    'assistant.empty.campaign2',
    'assistant.empty.campaign3',
  ],
  post: [
    'assistant.empty.post1',
    'assistant.empty.post2',
    'assistant.empty.post3',
  ],
} as const satisfies Record<ThreadSubject['kind'], readonly string[]>

export function ThreadEmptyState({
  kind,
  onPick,
  showStarters = true,
  disabled = false,
}: {
  kind: ThreadSubject['kind']
  onPick: (text: string) => void
  /** The composer's lightbulb owns this: the chips hide, the lines stay. */
  showStarters?: boolean
  disabled?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <Logo variant="mark" className="size-8 text-quinary-foreground" />
      <div className="flex max-w-72 flex-col gap-1 text-sm text-tertiary-foreground">
        {LINES[kind].map((key) => (
          <p key={key}>{t(key)}</p>
        ))}
      </div>
      {showStarters && (
        <StarterChips kind={kind} onPick={onPick} disabled={disabled} />
      )}
    </div>
  )
}
