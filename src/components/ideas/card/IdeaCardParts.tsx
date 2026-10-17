import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'
import { CaretDownIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { VERDICT_ICON } from '@/components/content/verdictIcons'
import { HORIZON_KEYS, VERDICTS } from '@/components/ideas/verdicts'
import { cn } from '@/lib'
import type { VerdictKey } from '@/lib/assetList'
import { FIT_CRITERIA, fitLevelStrength, fitRows } from '@/lib/ideaFit'
import {
  POSTPONE_HORIZONS,
  isWaiting,
  postponeUntil,
  type Idea,
  type IdeaVerdict,
} from '@/lib/ideas'
import { formatDate } from '@/lib/intl'

/**
 * The idea card's parts (CON-387), shared by every list that draws one: the
 * asset page's ideas and the Ideas page (CON-388). One card across the
 * product means one copy of each of these.
 */

/** The answer a row gives, or `null` to put it back with the undecided. */
export type Answer = (
  verdict: IdeaVerdict | null,
  remindAt?: string | null,
) => void

/**
 * The verdict as its mark alone, in the pill's colours — undecided teal too,
 * which used to have no mark. The word is the mark's name and its tooltip.
 */
export function VerdictMark({ verdict }: { verdict: VerdictKey }) {
  const { t } = useTranslation()
  const label = t(`assetInsights.ideas.pile.${verdict}`)
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        'flex h-6 items-center',
        verdict === 'waiting' && 'text-accent',
        verdict === 'yes' && 'text-positive',
        (verdict === 'later' || verdict === 'no') &&
          'text-secondary-foreground',
      )}
    >
      <HugeiconsIcon
        icon={VERDICT_ICON[verdict]}
        size={16}
        strokeWidth={1.8}
        aria-hidden
      />
    </span>
  )
}

/** A section of the opened row: a pale rule, then a small heading. */
export function Part({
  heading,
  aside,
  children,
}: {
  heading: string
  aside?: string | null
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-quaternary pt-3">
      <h4 className="text-xs font-semibold text-foreground">
        {heading}
        {aside && (
          <span className="font-normal text-secondary-foreground">
            {' · '}
            {aside}
          </span>
        )}
      </h4>
      {children}
    </div>
  )
}

type CriterionKey = (typeof FIT_CRITERIA)[keyof typeof FIT_CRITERIA][number]
const KNOWN_CRITERIA = new Set<string>([
  ...FIT_CRITERIA.campaign,
  ...FIT_CRITERIA.workspace,
])
const KNOWN_CAPS = ['guardrail_breach', 'off_brief', 'unsupported'] as const
type CapKey = (typeof KNOWN_CAPS)[number]

/** "zeitgeist_fit" → "Zeitgeist fit", for a criterion this build predates. */
function humanise(key: string): string {
  const words = key.replace(/_/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * Why the idea scores what it does (CON-385): each criterion, heaviest first,
 * with its rating — a figure in a disc and five segments, both in the fit
 * track's own colour at that rating — and the model's reason. A cap overrides
 * every rating, so it is said above them. An unscored idea has nothing to
 * explain and no section.
 */
export function FitSection({
  idea,
  scoredFor,
}: {
  idea: Idea
  /** Which reading the score is for, beside the heading. */
  scoredFor: string | null
}) {
  const { t } = useTranslation()
  const breakdown = idea.fitBreakdown
  if (idea.fitScore == null || !breakdown) return null
  const rows = fitRows(breakdown)
  if (rows.length === 0) return null
  const caps = (breakdown.caps ?? []).filter((cap): cap is CapKey =>
    (KNOWN_CAPS as readonly string[]).includes(cap),
  )
  return (
    <Part
      heading={t('assetInsights.ideaFit.heading', { score: idea.fitScore })}
      aside={scoredFor}
    >
      {caps.map((cap) => (
        <p key={cap} className="text-xs text-foreground">
          {t(`assetInsights.ideaFit.cap.${cap}`)}
        </p>
      ))}
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => {
          const name = KNOWN_CRITERIA.has(row.key)
            ? t(`assetInsights.ideaFit.criterion.${row.key as CriterionKey}`)
            : humanise(row.key)
          const tone = `color-mix(in oklab, var(--fit-high) ${fitLevelStrength(row.level)}%, var(--fit-low))`
          return (
            <li
              key={row.key}
              className="grid grid-cols-[8.5rem_auto_minmax(0,1fr)] items-start gap-x-3 text-[12.5px]/[18px]"
            >
              <span className="text-foreground">{name}</span>
              <span
                role="img"
                aria-label={t('assetInsights.ideaFit.rating', {
                  criterion: name,
                  level: row.level,
                })}
                className="flex items-center gap-3"
              >
                <span
                  aria-hidden
                  className="-mt-px flex size-5 items-center justify-center rounded-full font-mono text-[11px] font-semibold text-secondary-foreground"
                  style={{ background: tone }}
                >
                  {row.level}
                </span>
                <span aria-hidden className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <span
                      key={step}
                      className={cn(
                        'h-1.5 w-2.5 rounded-[2px]',
                        step > row.level && 'bg-quaternary',
                      )}
                      style={
                        step <= row.level ? { background: tone } : undefined
                      }
                    />
                  ))}
                </span>
              </span>
              <span className="text-secondary-foreground">
                {row.hint && (
                  <span className="mr-1 inline-block rounded-full bg-border px-1.5 text-[11.5px]/[18px] font-medium text-foreground">
                    {row.hint}
                  </span>
                )}
                {row.why}
              </span>
            </li>
          )
        })}
      </ul>
    </Part>
  )
}

/**
 * The answer, last — after everything that informs it. Yes / Not now / No as
 * one joined button group on the inbox's own rules (`VerdictControls`): Yes
 * and No are one click and no confirmation, both being reversible; Not now
 * asks when, because a postponement that names no day is an archive. Choosing
 * another button changes the answer; the record line under the group says
 * when it was given and offers the way back.
 */
export function AnswerGroup({
  idea,
  now,
  onAnswer,
  pending = false,
  trailing,
  record,
}: {
  idea: Idea
  now: Date
  onAnswer: Answer
  /** While an answer is on its way the controls hold still. */
  pending?: boolean
  /** What sits at the far end of the group's line — a link onwards. */
  trailing?: React.ReactNode
  /** The line under the group; the answer's own record when not given. */
  record?: React.ReactNode
}) {
  const { t } = useTranslation()
  // A woken postponement is a question again, so nothing is held.
  const current = isWaiting(idea, now) ? null : idea.verdict
  const line =
    record === undefined ? (
      <AnswerRecord
        idea={idea}
        now={now}
        onAnswer={onAnswer}
        pending={pending}
      />
    ) : (
      record
    )

  const YesIcon = VERDICTS.yes.icon
  const LaterIcon = VERDICTS.later.icon
  const NoIcon = VERDICTS.no.icon

  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-t border-quaternary pt-3">
      <div
        role="group"
        aria-label={t('assetInsights.ideas.answer')}
        aria-busy={pending || undefined}
        className="flex [&>*:disabled]:opacity-60 [&>*]:rounded-none [&>*+*]:-ml-px [&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md [&>[data-active=true]]:z-10"
      >
        <Button
          variant="outline"
          size="sm"
          active={current === 'yes'}
          aria-pressed={current === 'yes'}
          disabled={pending}
          onClick={() => onAnswer('yes')}
        >
          <YesIcon className={VERDICTS.yes.tone} />
          {t(VERDICTS.yes.actionKey)}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              active={current === 'later'}
              aria-pressed={current === 'later'}
              disabled={pending}
            >
              <LaterIcon className={VERDICTS.later.tone} />
              {t(VERDICTS.later.actionKey)}
              <CaretDownIcon className="size-3 text-secondary-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4}>
            {POSTPONE_HORIZONS.map((horizon) => (
              <DropdownMenuItem
                key={horizon}
                onSelect={() =>
                  onAnswer('later', postponeUntil(new Date(), horizon))
                }
              >
                {t(HORIZON_KEYS[horizon])}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="sm"
          active={current === 'no'}
          aria-pressed={current === 'no'}
          disabled={pending}
          onClick={() => onAnswer('no')}
        >
          <NoIcon className={VERDICTS.no.tone} />
          {t(VERDICTS.no.actionKey)}
        </Button>
      </div>
      {trailing && <span className="ml-auto">{trailing}</span>}
      {line && (
        <div className="order-last basis-full text-xs text-secondary-foreground">
          {line}
        </div>
      )}
    </div>
  )
}

/** When the answer was given, and the way back from it. */
export function AnswerRecord({
  idea,
  now,
  onAnswer,
  pending = false,
}: {
  idea: Idea
  now: Date
  onAnswer: Answer
  pending?: boolean
}) {
  const { t, i18n } = useTranslation()
  const current = isWaiting(idea, now) ? null : idea.verdict
  if (!current) return null
  const day = (iso: string | null) =>
    iso
      ? (formatDate(iso, { day: 'numeric', month: 'short' }, i18n.language) ??
        '')
      : ''
  return (
    <>
      {current === 'later'
        ? t('ideas.record.returns', { at: day(idea.remindAt) })
        : t('ideas.record.decided', {
            verdict: t(VERDICTS[current].labelKey),
            at: day(idea.decidedAt),
          })}
      {' · '}
      <button
        type="button"
        disabled={pending}
        onClick={() => onAnswer(null)}
        className="cursor-pointer underline decoration-quinary underline-offset-3 hover:decoration-foreground disabled:cursor-default disabled:opacity-60"
      >
        {t('ideas.action.undecide')}
      </button>
    </>
  )
}
