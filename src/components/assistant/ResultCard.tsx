import { Fragment } from 'react'
import {
  ArrowsOutLineHorizontalIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  NotePencilIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import type {
  AssistantResultDetails,
  ReviewFinding,
  ReviewSeverity,
} from '@/types/assistant'

/**
 * The structured half of a campaign turn. The reviews (CON-116) return their
 * findings *only* in this payload — nothing else in the app surfaces them — so
 * the reply renders them in full rather than leaning on the prose summary.
 *
 * Every card describes work the server has already done; none of them offer an
 * apply/undo, because there is nothing left to apply.
 */
/**
 * Whether there is anything to draw. History persists only `{action,
 * explanation}` — the result payload is dropped — so a reloaded turn arrives
 * with empty details and falls back to the one-line footer.
 */
export function hasResultCard(details: AssistantResultDetails | undefined): boolean {
  return !!details && Object.keys(details).length > 0
}

/**
 * One turn can run several tools — "improve the brief" routinely reviews it
 * first — so more than one result key comes back populated. Render every one:
 * showing only the first would hide the write behind the review, which is
 * precisely the half the user needs to know about.
 */
export function ResultCard({ details }: { details: AssistantResultDetails }) {
  const cards = [
    briefReviewCard(details),
    postsReviewCard(details),
    datesCard(details),
    redistributeCard(details),
    generatedCard(details),
    briefCard(details),
  ].filter(Boolean)

  if (cards.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      {cards.map((card, i) => (
        <Fragment key={i}>{card}</Fragment>
      ))}
    </div>
  )
}

function briefReviewCard(details: AssistantResultDetails) {
  if (details.briefReview) {
    const { consistent, findings } = details.briefReview
    return (
      <Card>
        <CardHeader
          icon={consistent ? CheckCircleIcon : WarningIcon}
          tone={consistent ? 'positive' : 'warning'}
          title={consistent ? 'Brief is consistent' : 'Brief has issues'}
          detail={countLabel(findings.length, 'finding')}
        />
        <Findings findings={findings} emptyLabel="Nothing to flag." />
      </Card>
    )
  }
  return null
}

function postsReviewCard(details: AssistantResultDetails) {
  if (details.postsReview) {
    const { checked, total, capped, findings } = details.postsReview
    return (
      <Card>
        <CardHeader
          icon={findings.length === 0 ? CheckCircleIcon : WarningIcon}
          tone={findings.length === 0 ? 'positive' : 'warning'}
          title={`Checked ${checked} of ${total} posts`}
          detail={`${countLabel(findings.length, 'drift')}${capped ? ' · capped' : ''}`}
        />
        <Findings findings={findings} emptyLabel="Every post follows the brief." />
      </Card>
    )
  }
  return null
}

function datesCard(details: AssistantResultDetails) {
  if (details.dates) {
    const { startDate, endDate, postsOutsideRange } = details.dates
    return (
      <Card>
        <CardHeader icon={CalendarBlankIcon} title="Campaign dates updated" />
        <CardRow className="pt-0">
          <p className="text-sm text-secondary-foreground">
            <span className="text-foreground">{startDate}</span>
            {' → '}
            <span className="text-foreground">{endDate}</span>
          </p>
        </CardRow>
        {postsOutsideRange > 0 && (
          <CardRow icon={WarningIcon} tone="warning" className="border-t border-border">
            <p className="text-sm text-warning">
              {countLabel(postsOutsideRange, 'post')} now fall outside the range — ask to
              redistribute them.
            </p>
          </CardRow>
        )}
      </Card>
    )
  }
  return null
}

function redistributeCard(details: AssistantResultDetails) {
  if (details.redistribute) {
    const { postsUpdated, phaseCount } = details.redistribute
    return (
      <Card>
        <CardHeader icon={ArrowsOutLineHorizontalIcon} title="Posts redistributed" />
        <CardRow className="pt-0">
          <p className="text-sm text-secondary-foreground">
            Re-dated <span className="text-foreground">{countLabel(postsUpdated, 'post')}</span>{' '}
            across {countLabel(phaseCount, 'phase')}.
          </p>
        </CardRow>
      </Card>
    )
  }
  return null
}

function generatedCard(details: AssistantResultDetails) {
  const generated = details.contentPlan ?? details.generatedPosts
  if (generated) {
    return (
      <Card>
        <CardHeader
          icon={NotePencilIcon}
          title={`${generated.postCount === 0 ? 'No' : `+${generated.postCount}`} ${
            generated.postCount === 1 ? 'draft post' : 'draft posts'
          } added`}
        />
        {generated.warnings.length > 0 && (
          <ul className="flex flex-col border-t border-border">
            {generated.warnings.map((warning, i) => (
              <li key={i}>
                <CardRow icon={WarningIcon} tone="warning">
                  <p className="text-sm text-warning">{warning}</p>
                </CardRow>
              </li>
            ))}
          </ul>
        )}
      </Card>
    )
  }
  return null
}

function briefCard(details: AssistantResultDetails) {
  if (details.brief) {
    return (
      <Card>
        <CardHeader
          icon={details.brief.applied ? CheckCircleIcon : WarningIcon}
          tone={details.brief.applied ? 'positive' : 'warning'}
          title={
            details.brief.applied
              ? 'Brief updated and saved'
              : 'Brief suggested but not applied'
          }
        />
      </Card>
    )
  }

  return null
}

function Card({ children }: { children: React.ReactNode }) {
  // Border only. A filled panel competed with the user's bubble for weight,
  // and these cards sit inside the reply rather than beside it.
  return <div className="flex flex-col border border-border">{children}</div>
}

const TONE_CLASS = {
  positive: 'text-positive',
  warning: 'text-warning',
  neutral: 'text-tertiary-foreground',
} as const

/**
 * Every row in every card, icon or not. The 16px slot is kept even when it is
 * empty, so a card's body sits on the same column as its title instead of
 * sliding back under the icon.
 */
function CardRow({
  icon: Icon,
  tone = 'neutral',
  className,
  children,
}: {
  icon?: PhosphorIcon
  tone?: keyof typeof TONE_CLASS
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex items-start gap-2 px-3 py-2.5', className)}>
      {/* `mt-0.5` centres a 16px glyph on a 20px first line and leaves the
          rest of a multi-line row alone. */}
      <span aria-hidden className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
        {Icon && <Icon className={cn('size-4', TONE_CLASS[tone])} weight="regular" />}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function CardHeader({
  icon,
  title,
  detail,
  tone = 'neutral',
}: {
  icon: PhosphorIcon
  title: string
  detail?: string
  tone?: keyof typeof TONE_CLASS
}) {
  return (
    <CardRow icon={icon} tone={tone}>
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{title}</span>
        {detail && <span className="shrink-0 text-sm text-tertiary-foreground">{detail}</span>}
      </div>
    </CardRow>
  )
}

/**
 * Severity reads as a tag: the severity colour for the type, over a
 * tenth-opacity wash of the same colour. Small caps at 10px need the contrast
 * a tint alone doesn't give them.
 */
const SEVERITY_CLASS: Record<ReviewSeverity, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-tertiary-foreground/10 text-tertiary-foreground',
}

function Findings({
  findings,
  emptyLabel,
}: {
  findings: ReviewFinding[]
  emptyLabel: string
}) {
  if (findings.length === 0) {
    return (
      <CardRow className="border-t border-border">
        <p className="text-sm text-tertiary-foreground">{emptyLabel}</p>
      </CardRow>
    )
  }
  return (
    <ul className="flex flex-col">
      {findings.map((finding, i) => (
        <li key={i}>
          {/* No icon of its own, but the empty slot keeps every line of a
              finding on the card title's column. */}
          <CardRow className="border-t border-border">
            <div className="flex flex-col gap-0.5">
              {(finding.label || finding.severity) && (
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                    {finding.label}
                  </span>
                  {finding.severity && (
                    <span
                      className={cn(
                        'shrink-0 px-[3px] py-[2px] text-[10px] font-semibold uppercase tracking-[0.08em]',
                        SEVERITY_CLASS[finding.severity],
                      )}
                    >
                      {finding.severity}
                    </span>
                  )}
                </div>
              )}
              <p className="text-sm/[1.5] text-foreground">{finding.issue}</p>
              {finding.suggestion && (
                <p className="text-sm/[1.5] text-tertiary-foreground">→ {finding.suggestion}</p>
              )}
            </div>
          </CardRow>
        </li>
      ))}
    </ul>
  )
}

function countLabel(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}
