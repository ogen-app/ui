import type { ReactNode } from 'react'
import { Logo } from '@/components/Logo'

/**
 * Everything the panel says when there is no score on screen — never
 * assessed, a run that failed, a load that failed, the feature switched off.
 *
 * One shape for all four, matching the assistant's `ThreadEmptyState`: the
 * mark, a short block of centred prose, then the one thing to do about it.
 * They are the same kind of moment — an empty rail with a single next step —
 * and giving them the same shape means the panel doesn't lurch as it moves
 * between them.
 *
 * No technical detail here by design. When a run or a load fails, the reason
 * goes to a toast; a stack of HTTP text in the middle of the rail tells the
 * user nothing they can act on.
 */
export function QualityEmptyState({
  lines,
  action,
}: {
  /** One per line, centred. Each should stand on its own. */
  lines: string[]
  action?: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <Logo variant="mark" className="size-8 text-quinary-foreground" />
      <div className="flex max-w-72 flex-col gap-1 text-sm text-tertiary-foreground">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      {action}
    </div>
  )
}
