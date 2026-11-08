import { Fragment } from 'react'
import {
  ArrowsOutLineHorizontalIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  LightbulbIcon,
  NotePencilIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
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
export function hasResultCard(
  details: AssistantResultDetails | undefined,
): boolean {
  return !!details && Object.keys(details).length > 0
}

/**
 * One turn can run several tools — "improve the brief" routinely reviews it
 * first — so more than one result key comes back populated. Render every one:
 * showing only the first would hide the write behind the review, which is
 * precisely the half the user needs to know about.
 */
export function ResultCard({ details }: { details: AssistantResultDetails }) {
  const { t } = useTranslation()
  const cards = [
    briefReviewCard(t, details),
    postsReviewCard(t, details),
    datesCard(t, details),
    redistributeCard(t, details),
    ideasCard(t, details),
    draftsCard(t, details),
    platformsCard(t, details),
    briefCard(t, details),
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

function briefReviewCard(t: TFunction, details: AssistantResultDetails) {
  if (details.briefReview) {
    const { consistent, findings } = details.briefReview
    return (
      <Card>
        <CardHeader
          icon={consistent ? CheckCircleIcon : WarningIcon}
          tone={consistent ? 'positive' : 'warning'}
          title={
            consistent
              ? t('assistant.result.briefConsistent')
              : t('assistant.result.briefIssues')
          }
          detail={t('assistant.result.findings', { count: findings.length })}
        />
        <Findings
          findings={findings}
          emptyLabel={t('assistant.result.nothingToFlag')}
        />
      </Card>
    )
  }
  return null
}

function postsReviewCard(t: TFunction, details: AssistantResultDetails) {
  if (details.postsReview) {
    const { checked, total, capped, findings } = details.postsReview
    return (
      <Card>
        <CardHeader
          icon={findings.length === 0 ? CheckCircleIcon : WarningIcon}
          tone={findings.length === 0 ? 'positive' : 'warning'}
          title={t('assistant.result.checkedPosts', { checked, total })}
          detail={
            capped
              ? t('assistant.result.capped', {
                  drifts: t('assistant.result.drifts', {
                    count: findings.length,
                  }),
                })
              : t('assistant.result.drifts', { count: findings.length })
          }
        />
        <Findings
          findings={findings}
          emptyLabel={t('assistant.result.everyPostFollows')}
        />
      </Card>
    )
  }
  return null
}

function datesCard(t: TFunction, details: AssistantResultDetails) {
  if (details.dates) {
    const { startDate, endDate, postsOutsideRange } = details.dates
    return (
      <Card>
        <CardHeader
          icon={CalendarBlankIcon}
          title={t('assistant.result.datesUpdated')}
        />
        <CardRow className="pt-0">
          <p className="text-sm text-secondary-foreground">
            <span className="text-foreground">{startDate}</span>
            {' → '}
            <span className="text-foreground">{endDate}</span>
          </p>
        </CardRow>
        {postsOutsideRange > 0 && (
          <CardRow
            icon={WarningIcon}
            tone="warning"
            className="border-t border-border"
          >
            <p className="text-sm text-warning">
              {t('assistant.result.outsideRange', { count: postsOutsideRange })}
            </p>
          </CardRow>
        )}
      </Card>
    )
  }
  return null
}

function redistributeCard(t: TFunction, details: AssistantResultDetails) {
  if (details.redistribute) {
    const { postsUpdated, phaseCount } = details.redistribute
    return (
      <Card>
        <CardHeader
          icon={ArrowsOutLineHorizontalIcon}
          title={t('assistant.result.postsRedistributed')}
        />
        <CardRow className="pt-0">
          <p className="text-sm text-secondary-foreground">
            {t('assistant.result.redistributed', {
              count: postsUpdated,
              phases: t('assistant.result.phases', { count: phaseCount }),
            })}
          </p>
        </CardRow>
      </Card>
    )
  }
  return null
}

/** Planning writes ideas, not posts (CON-449): they wait on the Ideas tab. */
function ideasCard(t: TFunction, details: AssistantResultDetails) {
  const planned = details.contentPlan ?? details.generatedPosts
  if (!planned) return null
  return (
    <Card>
      <CardHeader
        icon={LightbulbIcon}
        title={
          planned.ideaCount === 0
            ? t('assistant.result.ideasNone')
            : t('assistant.result.ideas', { count: planned.ideaCount })
        }
      />
      <Warnings warnings={planned.warnings} />
    </Card>
  )
}

function draftsCard(t: TFunction, details: AssistantResultDetails) {
  const drafted = details.draftedPosts
  if (!drafted) return null
  return (
    <Card>
      <CardHeader
        icon={NotePencilIcon}
        title={
          drafted.postCount === 0
            ? t('assistant.result.draftsNone')
            : t('assistant.result.drafts', { count: drafted.postCount })
        }
      />
      <Warnings warnings={drafted.warnings} />
    </Card>
  )
}

function platformsCard(t: TFunction, details: AssistantResultDetails) {
  if (!details.platforms) return null
  return (
    <Card>
      <CardHeader
        icon={CheckCircleIcon}
        tone="positive"
        title={t('assistant.result.platformsUpdated')}
        detail={details.platforms.added || undefined}
      />
    </Card>
  )
}

function Warnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null
  return (
    <ul className="flex flex-col border-t border-border">
      {warnings.map((warning, i) => (
        <li key={i}>
          <CardRow icon={WarningIcon} tone="warning">
            <p className="text-sm text-warning">{warning}</p>
          </CardRow>
        </li>
      ))}
    </ul>
  )
}

function briefCard(t: TFunction, details: AssistantResultDetails) {
  if (details.brief) {
    return (
      <Card>
        <CardHeader
          icon={details.brief.applied ? CheckCircleIcon : WarningIcon}
          tone={details.brief.applied ? 'positive' : 'warning'}
          title={
            details.brief.applied
              ? t('assistant.result.briefApplied')
              : t('assistant.result.briefNotApplied')
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
      <span
        aria-hidden
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center"
      >
        {Icon && (
          <Icon className={cn('size-4', TONE_CLASS[tone])} weight="regular" />
        )}
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
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {title}
        </span>
        {detail && (
          <span className="shrink-0 text-sm text-tertiary-foreground">
            {detail}
          </span>
        )}
      </div>
    </CardRow>
  )
}

/**
 * Severity reads as a tag: the severity colour for the type, over a
 * tenth-opacity wash of the same colour. Small caps at 10px need the contrast
 * a tint alone doesn't give them. Medium is the exception: `--warning` is too
 * light to carry text at AA, so its label is foreground ink over the wash. The
 * quality panel's tags (`posts/quality/tokens.ts`) use the same scale.
 */
const SEVERITY_CLASS: Record<ReviewSeverity, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-warning/15 text-foreground',
  low: 'bg-tertiary-foreground/10 text-tertiary-foreground',
}

function Findings({
  findings,
  emptyLabel,
}: {
  findings: ReviewFinding[]
  emptyLabel: string
}) {
  const { t } = useTranslation()
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
                      {t(`assistant.result.severity.${finding.severity}`)}
                    </span>
                  )}
                </div>
              )}
              <p className="text-sm/[1.5] text-foreground">{finding.issue}</p>
              {finding.suggestion && (
                <p className="text-sm/[1.5] text-tertiary-foreground">
                  → {finding.suggestion}
                </p>
              )}
            </div>
          </CardRow>
        </li>
      ))}
    </ul>
  )
}
