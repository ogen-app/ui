import { Fragment } from 'react'
import { CheckIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/styles'
import { groundingAssets } from '@/lib/grounding'
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
  neutral: 'text-secondary-foreground',
  warning: 'text-warning-ink',
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
        'text-xs font-semibold uppercase tracking-[0.12em]',
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
            <span className="ml-2 text-sm font-normal text-secondary-foreground">
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
 * reason beside it. `label` replaces "Sources" where the card read rather than
 * made ("Read from"); `letters` puts a comparison's letter before each name.
 */
/** The catalogue's sentence for each reason output drew on nothing. */
const UNGROUNDED_REASON = {
  no_sources: 'assistant.sources.reason.noSources',
  chosen: 'assistant.sources.reason.chosen',
  none_relevant: 'assistant.sources.reason.noneRelevant',
} as const

export function SourcesLine({
  grounding,
  label,
  letters,
  note,
}: {
  grounding: Grounding
  label?: string
  letters?: Record<string, string>
  /**
   * What an ungrounded result was written from, when the card can say better
   * than "general knowledge" — "the ideas' own words" (CON-481).
   */
  note?: string
}) {
  const { t } = useTranslation()
  const names = groundingAssets(grounding.sources)
  // Why it drew on nothing, worded here from the server's reason (CON-484);
  // its own sentence only for a reason this build doesn't know.
  const why =
    note ??
    (grounding.reason && grounding.reason in UNGROUNDED_REASON
      ? t(UNGROUNDED_REASON[grounding.reason as keyof typeof UNGROUNDED_REASON])
      : (grounding.note ?? t('assistant.sources.generalKnowledge')))
  return (
    <p className="border-t border-border pt-2.5 text-xs">
      <span className="mr-2 text-secondary-foreground">
        {label ?? t('assistant.sources.label')}
      </span>
      {grounding.mode === 'grounded' ? (
        <span className="font-semibold text-accent-ink">
          {names.length > 0
            ? names.map((s, i) => (
                <Fragment key={s.id || s.title}>
                  {i > 0 && ', '}
                  {s.id && letters?.[s.id] && `${letters[s.id]} `}
                  {/* A post cited as a source (CON-479) is named, not linked:
                      the link is the asset screen's. */}
                  {s.id && s.kind !== 'post' ? (
                    <Link
                      to="/assets/$assetId"
                      params={{ assetId: s.id }}
                      className="transition-colors hover:text-foreground"
                    >
                      {s.title}
                    </Link>
                  ) : (
                    s.title
                  )}
                </Fragment>
              ))
            : t('assistant.sources.yourMaterial')}
        </span>
      ) : (
        <>
          <span className="mr-2 font-semibold text-warning-ink">
            {t('assistant.sources.notGrounded')}
          </span>
          <span className="text-secondary-foreground">{why}</span>
        </>
      )}
    </p>
  )
}

/**
 * A thing already decided, as one grey line: what, and how it ended. The tick
 * is for something that ran (CON-482); a line saying nothing ran — dismissed,
 * lapsed, not answered — has none. It wraps rather than cutting its end off,
 * which is where "nothing ran" sits.
 */
export function ResolvedLine({
  children,
  ran = true,
}: {
  children: React.ReactNode
  ran?: boolean
}) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-tertiary-foreground">
      {ran ? (
        <CheckIcon
          aria-hidden
          className="mt-[3px] size-3 shrink-0"
          weight="bold"
        />
      ) : (
        <span aria-hidden className="w-3 shrink-0" />
      )}
      <span className="min-w-0">{children}</span>
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
export const TEXT_ACTION_CLASS =
  'cursor-pointer text-xs font-semibold tracking-[0.06em] text-foreground hover:text-secondary-foreground disabled:cursor-default disabled:text-quinary-foreground'

export function TextAction({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  /** `submit` inside a card's own small form (CON-484). */
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={TEXT_ACTION_CLASS}
    >
      {children}
    </button>
  )
}
