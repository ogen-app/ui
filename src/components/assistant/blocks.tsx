import { CheckIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/styles'
import type { Grounding } from '@/types/assistant'

/**
 * The assistant's reply grammar (CON-451, approved 2026-11-08).
 *
 * - **A box means it waits on you.** Only a proposal or a choice is bordered
 *   (`PendingBox`); results, answers and history are unboxed — a status word,
 *   a headline, hairline rows (`ResultBlock`).
 * - **Status is a word, not a chip**, and headers carry no icon.
 * - **Sources always sit in one slot** (`SourcesLine`): teal names when the
 *   output is grounded, amber "Not grounded" in the same place when it is not.
 * - **History is one line** (`ResolvedLine`).
 */

const STATUS_TONE = {
  neutral: 'text-tertiary-foreground',
  warning: 'text-warning',
  destructive: 'text-destructive',
  accent: 'text-accent',
} as const

export type StatusTone = keyof typeof STATUS_TONE

/** Small capitals above a headline: what state the block is in. */
export function StatusWord({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: StatusTone
}) {
  return (
    <p
      className={cn(
        'text-[10.5px] font-semibold uppercase tracking-[0.1em]',
        STATUS_TONE[tone],
      )}
    >
      {children}
    </p>
  )
}

/**
 * A result: status word, headline, an optional action on the headline it acts
 * on (UNDO, OPEN), then whatever rows the result has, each on a hairline.
 */
export function ResultBlock({
  status,
  tone,
  title,
  meta,
  action,
  children,
}: {
  status?: React.ReactNode
  tone?: StatusTone
  title: React.ReactNode
  meta?: React.ReactNode
  action?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-1">
      {status && <StatusWord tone={tone}>{status}</StatusWord>}
      <div className="flex items-baseline gap-2">
        <h3 className="min-w-0 text-base/6 font-medium text-foreground">
          {title}
          {meta && (
            <span className="ml-2 text-sm font-normal text-tertiary-foreground">
              {meta}
            </span>
          )}
        </h3>
        {action && <div className="ml-auto shrink-0">{action}</div>}
      </div>
      {children && <div className="mt-1 flex flex-col">{children}</div>}
    </section>
  )
}

/** One row under a result, on its hairline. */
export function ResultRow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('border-t border-border py-2.5', className)}>
      {children}
    </div>
  )
}

/**
 * Where generated output came from. Always the same slot, so its absence is
 * visible: the source names in the accent, or "Not grounded" in amber with the
 * reason beside it.
 */
export function SourcesLine({ grounding }: { grounding: Grounding }) {
  const { t } = useTranslation()
  const names = grounding.sources.map((s) => s.title).filter(Boolean)
  return (
    <p className="border-t border-border pt-2.5 text-[12.5px]">
      <span className="text-tertiary-foreground">
        {t('assistant.sources.label')}
      </span>{' '}
      {grounding.mode === 'grounded' ? (
        <span className="font-medium text-accent">
          {names.length > 0
            ? names.join(', ')
            : t('assistant.sources.yourMaterial')}
        </span>
      ) : (
        <>
          <span className="font-medium text-warning">
            {t('assistant.sources.notGrounded')}
          </span>{' '}
          <span className="text-secondary-foreground">
            {t('assistant.sources.generalKnowledge')}
          </span>
        </>
      )}
    </p>
  )
}

/** A thing already decided, as one grey line: what, and how it ended. */
export function ResolvedLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[12.5px] text-tertiary-foreground">
      <CheckIcon aria-hidden className="size-3 shrink-0" weight="bold" />
      <span className="min-w-0 truncate">{children}</span>
    </p>
  )
}

/**
 * The only bordered thing in the thread: something waiting on the user — a
 * proposal to confirm, a choice to make.
 */
export function PendingBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border border-quinary-foreground px-4 py-4">
      {children}
    </div>
  )
}

/** A text action on a headline — UNDO, OPEN. */
export function TextAction({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer text-xs font-medium tracking-[0.03em] text-secondary-foreground hover:text-foreground disabled:cursor-default disabled:text-quinary-foreground"
    >
      {children}
    </button>
  )
}
