import { useEffect, useState } from 'react'
import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react'
import { formatDuration } from '@/lib/assistantTools'
import { useTick } from '@/hooks/useTick'
import { cn } from '@/lib'
import type { AssistantStep } from '@/types/assistant'

type ThinkingTimelineProps = {
  steps: AssistantStep[]
  streaming: boolean
  startedAt: number
  endedAt: number | null
}

/**
 * The assistant's step-by-step work with the time each step took. A turn
 * currently takes around a minute, so this is the difference between "working"
 * and "frozen" — it stays open and live while running, then collapses to a
 * "Thought for 58s" disclosure the user can re-open.
 */
export function ThinkingTimeline({
  steps,
  streaming,
  startedAt,
  endedAt,
}: ThinkingTimelineProps) {
  useTick(streaming)
  const [open, setOpen] = useState(streaming)

  useEffect(() => {
    if (!streaming) setOpen(false)
  }, [streaming])

  if (steps.length === 0) return null

  const now = performance.now()
  const total = (endedAt ?? now) - startedAt

  return (
    <div className="border border-border bg-secondary">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-tertiary-foreground hover:text-foreground cursor-pointer"
      >
        {streaming ? (
          <span className="size-1.5 shrink-0 rounded-full bg-accent animate-pulse" aria-hidden />
        ) : open ? (
          <CaretDownIcon className="size-3 shrink-0" />
        ) : (
          <CaretRightIcon className="size-3 shrink-0" />
        )}
        <span className="flex-1">
          {streaming ? 'Thinking…' : `Thought for ${formatDuration(total)}`}
        </span>
        <span className="font-mono text-[11px] text-quaternary-foreground">
          {formatDuration(total)}
        </span>
      </button>

      {open && (
        <ol className="flex flex-col gap-1.5 border-t border-border px-3 py-2">
          {steps.map((step) => {
            const running = step.endedAt === null
            const end = step.endedAt ?? (streaming ? now : step.startedAt)
            return (
              <li key={step.id} className="flex items-start gap-2 text-xs leading-tight">
                <span
                  aria-hidden
                  className={cn(
                    'mt-1 size-1.5 shrink-0 rounded-full',
                    running ? 'bg-accent animate-pulse' : 'bg-quinary-foreground',
                  )}
                />
                <span
                  className={cn('flex-1', running ? 'text-foreground' : 'text-tertiary-foreground')}
                >
                  {step.label}
                  {step.detail && (
                    <span className="text-quaternary-foreground"> · {step.detail}</span>
                  )}
                </span>
                <span className="font-mono text-[11px] text-quaternary-foreground">
                  {formatDuration(end - step.startedAt)}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
