import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CaretDownIcon, CaretRightIcon, CheckIcon } from '@phosphor-icons/react'
import { formatDuration, stepDetail, stepLabel } from '@/lib/assistantTools'
import { useTick } from '@/hooks/useTick'
import { cn } from '@/lib'
import type { AssistantStep } from '@/types/assistant'

type ThinkingTimelineProps = {
  steps: AssistantStep[]
  streaming: boolean
  startedAt: number
  endedAt: number | null
}

/** Below this, a finished turn leaves no timing behind. */
const NEWS_MS = 10_000

/**
 * The assistant's work, while it happens. A turn can take around a minute, so
 * while it runs this is the difference between "working" and "frozen": the
 * steps stay open and live.
 *
 * Once it ends, timing is only shown when the wait was news (CON-451): a turn
 * under ten seconds leaves nothing behind, and a longer one leaves one
 * collapsed line the curious can open. Per-step durations are gone — they were
 * debugging data, not something a marketer acts on.
 */
export function ThinkingTimeline({
  steps,
  streaming,
  startedAt,
  endedAt,
}: ThinkingTimelineProps) {
  useTick(streaming)
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  if (steps.length === 0) return null

  const now = performance.now()
  const total = (endedAt ?? now) - startedAt
  if (!streaming && total < NEWS_MS) return null
  const expanded = streaming || open

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={streaming}
        className="flex w-full items-center gap-2 py-1 text-left text-xs text-tertiary-foreground hover:text-foreground cursor-pointer disabled:cursor-default disabled:hover:text-tertiary-foreground"
      >
        {/* Both states share one 12px slot, so the label doesn't shift when the
            run ends. */}
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
          {t(
            streaming
              ? 'assistant.timeline.thinking'
              : 'assistant.timeline.thought',
            { duration: formatDuration(total) },
          )}
        </span>
      </button>

      {expanded && (
        <ol className="flex flex-col gap-1.5 py-2">
          {steps.map((step) => {
            const running = step.endedAt === null
            const detail = stepDetail(t, step)
            return (
              <li
                key={step.id}
                className="flex items-start gap-2 text-xs leading-tight"
              >
                {/* The same 12px slot the caret sits in, so a step's mark lands
                    directly under it. */}
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
                  {stepLabel(t, step)}
                  {detail && (
                    <span className="text-quaternary-foreground">
                      {' '}
                      · {detail}
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
