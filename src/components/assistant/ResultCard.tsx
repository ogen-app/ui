import {
  ArrowsOutLineHorizontalIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  NotePencilIcon,
  WarningIcon,
} from '@phosphor-icons/react'
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

export function ResultCard({ details }: { details: AssistantResultDetails }) {
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

  if (details.dates) {
    const { startDate, endDate, postsOutsideRange } = details.dates
    return (
      <Card>
        <CardHeader icon={CalendarBlankIcon} title="Campaign dates updated" />
        <p className="px-3 pb-3 text-sm text-secondary-foreground">
          <span className="text-foreground">{startDate}</span>
          {' → '}
          <span className="text-foreground">{endDate}</span>
        </p>
        {postsOutsideRange > 0 && (
          <p className="border-t border-border px-3 py-2 text-xs text-warning">
            {countLabel(postsOutsideRange, 'post')} now fall outside the range — ask to
            redistribute them.
          </p>
        )}
      </Card>
    )
  }

  if (details.redistribute) {
    const { postsUpdated, phaseCount } = details.redistribute
    return (
      <Card>
        <CardHeader icon={ArrowsOutLineHorizontalIcon} title="Posts redistributed" />
        <p className="px-3 pb-3 text-sm text-secondary-foreground">
          Re-dated <span className="text-foreground">{countLabel(postsUpdated, 'post')}</span>{' '}
          across {countLabel(phaseCount, 'phase')}.
        </p>
      </Card>
    )
  }

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
          <ul className="flex flex-col gap-1 border-t border-border px-3 py-2">
            {generated.warnings.map((warning, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-warning">
                <WarningIcon className="mt-0.5 size-3.5 shrink-0" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    )
  }

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
  return <div className="flex flex-col border border-border bg-secondary">{children}</div>
}

const TONE_CLASS = {
  positive: 'text-positive',
  warning: 'text-warning',
  neutral: 'text-tertiary-foreground',
} as const

function CardHeader({
  icon: Icon,
  title,
  detail,
  tone = 'neutral',
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  detail?: string
  tone?: keyof typeof TONE_CLASS
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <Icon className={cn('size-4 shrink-0', TONE_CLASS[tone])} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{title}</span>
      {detail && <span className="shrink-0 text-xs text-tertiary-foreground">{detail}</span>}
    </div>
  )
}

const SEVERITY_CLASS: Record<ReviewSeverity, string> = {
  high: 'text-destructive',
  medium: 'text-warning',
  low: 'text-tertiary-foreground',
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
      <p className="border-t border-border px-3 py-2 text-xs text-tertiary-foreground">
        {emptyLabel}
      </p>
    )
  }
  return (
    <ul className="flex flex-col">
      {findings.map((finding, i) => (
        <li key={i} className="flex flex-col gap-1 border-t border-border px-3 py-2.5">
          <div className="flex items-baseline gap-2">
            {finding.severity && (
              <span
                className={cn(
                  'shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em]',
                  SEVERITY_CLASS[finding.severity],
                )}
              >
                {finding.severity}
              </span>
            )}
            {finding.label && (
              <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                {finding.label}
              </span>
            )}
          </div>
          <p className="text-sm/[1.5] text-secondary-foreground">{finding.issue}</p>
          {finding.suggestion && (
            <p className="text-sm/[1.5] text-tertiary-foreground">→ {finding.suggestion}</p>
          )}
        </li>
      ))}
    </ul>
  )
}

function countLabel(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}
