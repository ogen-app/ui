import type { ReactNode } from 'react'
import {
  CheckCircleIcon,
  CheckIcon,
  CircleIcon,
  QuotesIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import { evidenceLabel } from '@/lib/brandDistillCopy'
import type { DistillAnswer, DistillEvidence } from '@/types/brandDistill'

/**
 * The small furniture of a brand read's review (CON-400). Everything here is
 * the app's own except `SourceLabel`, which is the one new piece the issue
 * allows itself.
 */

/**
 * Where an item came from — a quote mark and the page or the file.
 *
 * **Every proposed item carries one**, because that is the promise the offer
 * makes: your own words, and you can see which words. An item whose evidence
 * is an answer names the question, since "your answer" alone does not say
 * which of seven it was.
 *
 * Several pieces of evidence are joined, the way the audience on board 3 is
 * three pages long; the same page twice is said once.
 */
export function SourceLabel({
  evidence,
  answers,
  bare,
  className,
}: {
  evidence: DistillEvidence[]
  /** The run's answers, to name a question an answer was given to. */
  answers: DistillAnswer[]
  /**
   * Without the quote mark — for a line, where the label sits in its own
   * column at the end of a row of lines and the mark down every row is noise.
   */
  bare?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const labels = [
    ...new Set(
      evidence.map((e) => evidenceLabel(t, e, answers)).filter(Boolean),
    ),
  ]
  if (labels.length === 0) return null
  return (
    <span
      className={cn(
        'flex min-w-0 items-start gap-1 text-xs leading-4 text-tertiary-foreground',
        className,
      )}
    >
      {!bare && (
        <QuotesIcon
          weight="fill"
          aria-label={t('brand.distill.source.from')}
          className="mt-0.5 size-3 shrink-0 text-senary-foreground"
        />
      )}
      <span className="min-w-0 break-words">{labels.join(', ')}</span>
    </span>
  )
}

/**
 * Keep or drop, for the items big enough to have a card of their own — a
 * voice, an audience.
 *
 * The ideas inbox's answer group, joined outline buttons under a rule, with
 * two answers instead of three: there is no *later* for something that is
 * about to be saved or not. Keep starts pressed, because everything starts
 * kept.
 */
export function KeepDrop({
  kept,
  onKeep,
  onDrop,
  trailing,
}: {
  kept: boolean
  onKeep: () => void
  onDrop: () => void
  /** The far end of the line — `EDIT`. */
  trailing?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-t border-quaternary pt-3">
      <div
        role="group"
        aria-label={t('brand.distill.review.keepOrDrop')}
        className="flex [&>*]:rounded-none [&>*+*]:-ml-px [&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md [&>[data-active=true]]:z-10"
      >
        <Button
          variant="outline"
          size="sm"
          active={kept}
          aria-pressed={kept}
          onClick={onKeep}
        >
          <CheckIcon />
          {t('brand.distill.review.keep')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          active={!kept}
          aria-pressed={!kept}
          onClick={onDrop}
        >
          <XIcon />
          {t('brand.distill.review.drop')}
        </Button>
      </div>
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  )
}

/**
 * The marker a line is kept or dropped with — `LineItem`'s, as a button.
 *
 * Green check is kept and the empty circle dropped, which is exactly what the
 * two mean on every checklist in the app: something is behind this, or not.
 * One click toggles. A dropped line goes grey but stays legible, so changing
 * your mind is reading the line again rather than finding it.
 */
export function KeepMark({
  kept,
  label,
  onToggle,
}: {
  kept: boolean
  /** The line's own words, for the button's name. */
  label: string
  onToggle: () => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={kept}
      aria-label={
        kept
          ? t('brand.distill.review.dropLine', { line: label })
          : t('brand.distill.review.keepLine', { line: label })
      }
      className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {kept ? (
        <CheckCircleIcon weight="fill" className="size-4 text-positive" />
      ) : (
        <CircleIcon className="size-4 text-senary-foreground" />
      )}
    </button>
  )
}

/**
 * A section of the review, laid out like the hub's card for the same section —
 * the hue on the glyph, the display heading, and the count opposite. Same
 * cards in the same order, so what is proposed is already where it will live.
 */
export function ReviewSection({
  icon: Glyph,
  tone,
  title,
  qualifier,
  children,
}: {
  icon: Icon
  tone: string
  title: string
  qualifier?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mx-auto flex w-full min-w-0 max-w-content flex-col gap-5 bg-primary px-6 py-6">
      <header className="flex min-w-0 items-center justify-between gap-4">
        <h2 className="flex min-w-0 items-center gap-2 font-display text-xl font-medium tracking-tight">
          <Glyph
            className="size-5 shrink-0"
            style={{ color: tone }}
            aria-hidden
          />
          <span className="truncate">{title}</span>
        </h2>
        {qualifier != null && (
          <span className="shrink-0 text-sm text-secondary-foreground">
            {qualifier}
          </span>
        )}
      </header>
      {children}
    </section>
  )
}

/** A small capitals label over a group — `MAY CLAIM`, `YOUR WEBSITE`. */
export function GroupLabel({
  children,
  htmlFor,
}: {
  children: ReactNode
  htmlFor?: string
}) {
  const className =
    'font-grotesk text-xs font-medium uppercase tracking-wide text-secondary-foreground'
  return htmlFor ? (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ) : (
    <p className={className}>{children}</p>
  )
}
