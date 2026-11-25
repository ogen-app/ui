import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { FIT_CRITERIA, fitLevelStrength, fitRows } from '@/lib/ideaFit'
import { isWaiting, type Idea, type IdeaVerdict } from '@/lib/ideas'
import { formatDate } from '@/lib/intl'
import { TextButton } from '@/components/ui/text-button'

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
  compact = false,
}: {
  /** Only the score and its breakdown are read — the assistant's idea card
   *  (CON-465) has those and nothing else of an idea. */
  idea: Pick<Idea, 'fitScore' | 'fitBreakdown'>
  /** Which reading the score is for, beside the heading. */
  scoredFor: string | null
  /**
   * The rail's width (CON-481): no heading — the card's headline says the
   * score — and each reason under its row rather than in a column beside it.
   */
  compact?: boolean
}) {
  const { t } = useTranslation()
  const breakdown = idea.fitBreakdown
  if (idea.fitScore == null || !breakdown) return null
  const rows = fitRows(breakdown)
  if (rows.length === 0) return null
  const caps = (breakdown.caps ?? []).filter((cap): cap is CapKey =>
    (KNOWN_CAPS as readonly string[]).includes(cap),
  )
  const body = (
    <>
      {caps.map((cap) => (
        <p key={cap} className="text-xs text-foreground">
          {t(`assetInsights.ideaFit.cap.${cap}`)}
        </p>
      ))}
      {/* By the card's own width: in a side column the reason goes under its
          criterion rather than into a strip beside the rating. */}
      <ul className="@container flex flex-col gap-1.5">
        {rows.map((row) => {
          const name = KNOWN_CRITERIA.has(row.key)
            ? t(`assetInsights.ideaFit.criterion.${row.key as CriterionKey}`)
            : humanise(row.key)
          const tone = `color-mix(in oklab, var(--fit-high) ${fitLevelStrength(row.level)}%, var(--fit-low))`
          return (
            <li
              key={row.key}
              className={cn(
                'grid items-start gap-x-3 text-xs/[18px]',
                compact
                  ? 'grid-cols-[minmax(0,1fr)_auto] gap-y-0.5'
                  : 'grid-cols-[minmax(0,1fr)_auto] gap-y-0.5 @md:grid-cols-[8.5rem_auto_minmax(0,1fr)] @md:gap-y-0',
              )}
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
                  className="-mt-px flex size-5 items-center justify-center rounded-full font-mono text-mark font-semibold text-secondary-foreground"
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
              <span
                className={cn(
                  'text-secondary-foreground',
                  compact ? 'col-span-2' : 'col-span-2 @md:col-span-1',
                )}
              >
                {row.hint && (
                  <span className="mr-1 inline-block rounded-full bg-border px-1.5 text-xs/[18px] font-medium text-foreground">
                    {row.hint}
                  </span>
                )}
                {row.why}
              </span>
            </li>
          )
        })}
      </ul>
    </>
  )
  return compact ? (
    <div className="flex flex-col gap-2">{body}</div>
  ) : (
    <Part
      heading={t('assetInsights.ideaFit.heading', { score: idea.fitScore })}
      aside={scoredFor}
    >
      {body}
    </Part>
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
        : t(`ideas.record.${current}`, { at: day(idea.decidedAt) })}
      {' · '}
      <TextButton
        tone="quiet"
        disabled={pending}
        onClick={() => onAnswer(null)}
      >
        {t('ideas.action.undecide')}
      </TextButton>
    </>
  )
}
