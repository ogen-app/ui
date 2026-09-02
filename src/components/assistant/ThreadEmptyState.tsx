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
const LINES: Record<ThreadSubject['kind'], string[]> = {
  campaign: [
    'Plan the campaign and fill it with posts.',
    'Sharpen the brief. Move the schedule.',
    'Review what is here and flag the drift.',
  ],
  post: [
    'Rewrite the post, or just its opening.',
    'Shift the tone, the length, the ending.',
    'Work in anything from the assets.',
  ],
}

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
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <Logo variant="mark" className="size-8 text-quinary-foreground" />
      <div className="flex max-w-72 flex-col gap-1 text-sm text-tertiary-foreground">
        {LINES[kind].map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      {showStarters && (
        <StarterChips kind={kind} onPick={onPick} disabled={disabled} />
      )}
    </div>
  )
}
