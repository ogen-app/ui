import { useEffect, useState } from 'react'
import { CaretDownIcon, CaretRightIcon, CheckIcon } from '@phosphor-icons/react'
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
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 py-1 text-left text-xs text-tertiary-foreground hover:text-foreground cursor-pointer"
      >
        {/* Both states share one 12px slot, so the label doesn't shift when the
            run ends. The caret fills the slot exactly — drawn any larger it
            outweighed the label it belongs to. */}
        <span
          className="flex size-3 shrink-0 items-center justify-center"
          aria-hidden
        >
          {streaming ? (
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
          ) : open ? (
            <CaretDownIcon className="size-3 shrink-0" weight="bold" />
          ) : (
            <CaretRightIcon className="size-3 shrink-0" weight="bold" />
          )}
        </span>
        <span className="flex-1">
          {/* The elapsed time is the label while running and part of the label
              once done, so there is never a second copy of it on the right. */}
          {streaming
            ? `Thinking… ${formatDuration(total)}`
            : `Thought for ${formatDuration(total)}`}
        </span>
      </button>

      {open && (
        <ol className="flex flex-col gap-1.5 py-2">
          {steps.map((step) => {
            const running = step.endedAt === null
            const end = step.endedAt ?? (streaming ? now : step.startedAt)
            return (
              <li
                key={step.id}
                className="flex items-start gap-2 text-xs leading-tight"
              >
                {/* The same 12px slot the caret sits in, so a step's mark lands
                    directly under it and its label under "Thinking…". */}
                <span
                  aria-hidden
                  className="mt-[1.5px] flex size-3 shrink-0 items-center justify-center"
                >
                  {running ? (
                    <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                  ) : (
                    <CheckIcon
                      className="size-3 text-quinary-foreground"
                      weight="bold"
                    />
                  )}
                </span>
                <span
                  className={cn(
                    'flex-1',
                    running ? 'text-foreground' : 'text-tertiary-foreground',
                  )}
                >
                  {step.label}
                  {step.detail && (
                    <span className="text-quaternary-foreground">
                      {' '}
                      · {step.detail}
                    </span>
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
