import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { cn } from '@/lib'
import {
  ResolvedLine,
  ResultBlock,
  ResultRow,
  SourcesLine,
  TextAction,
} from './blocks'
import type {
  AssistantResultDetails,
  ReviewFinding,
  ReviewSeverity,
  UndoState,
} from '@/types/assistant'
import { counted, formatNumber } from '@/lib/intl'

/**
 * The structured half of a campaign-pack turn. The reviews (CON-116) return
 * their findings *only* in this payload — nothing else in the app surfaces
 * them — so the reply renders them in full rather than leaning on the prose.
 *
 * Every block describes work the server has already done, so none is boxed:
 * a box is for what waits on the user (`blocks.tsx`).
 */
/**
 * Whether there is anything to draw. History persists only `{action,
 * explanation}` for rows migrated from the old tables — the result payload
 * was dropped — so such a turn arrives with empty details and falls back to
 * the one-line footer.
 */
export function hasResultCard(
  details: AssistantResultDetails | undefined,
): boolean {
  return !!details && Object.keys(details).length > 0
}

/**
 * One turn can run several tools — "improve the brief" routinely reviews it
 * first — so more than one result comes back. Render every one: showing only
 * the first would hide the write behind the review, which is precisely the
 * half the user needs to know about.
 */
/**
 * The undos a result can offer: the ids its writes were logged under, and
 * where each stands. A write the server could not log carries no id, and so
 * offers no UNDO.
 */
export type ResultUndo = {
  states: Record<string, UndoState>
  onUndo: (undoId: string) => void
}

export function ResultCard({
  details,
  undo,
}: {
  details: AssistantResultDetails
  undo?: ResultUndo
}) {
  const { t } = useTranslation()
  const blocks = [
    briefReview(t, details),
    postsReview(t, details),
    dates(t, details, undo),
    redistribute(t, details),
    ideas(t, details),
    drafts(t, details),
    platforms(t, details, undo),
    goal(t, details, undo),
    brief(t, details, undo),
  ].filter(Boolean)

  if (blocks.length === 0) return null
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, i) => (
        <Fragment key={i}>{block}</Fragment>
      ))}
    </div>
  )
}

function briefReview(t: TFunction, details: AssistantResultDetails) {
  if (!details.briefReview) return null
  const { consistent, findings } = details.briefReview
  return (
    <ResultBlock
      status={t('assistant.word.reviewed')}
      tone={consistent ? 'neutral' : 'warning'}
      title={
        consistent
          ? t('assistant.result.briefConsistent')
          : t('assistant.result.briefIssues')
      }
      meta={t('assistant.result.findings', counted(findings.length))}
    >
      <Findings
        findings={findings}
        emptyLabel={t('assistant.result.nothingToFlag')}
      />
    </ResultBlock>
  )
}

function postsReview(t: TFunction, details: AssistantResultDetails) {
  if (!details.postsReview) return null
  const { checked, total, capped, findings } = details.postsReview
  const drifts = t('assistant.result.drifts', counted(findings.length))
  return (
    <ResultBlock
      status={t('assistant.word.reviewed')}
      tone={findings.length === 0 ? 'neutral' : 'warning'}
      title={t('assistant.result.checkedPosts', {
        checked: formatNumber(checked),
        total: formatNumber(total),
      })}
      meta={capped ? t('assistant.result.capped', { drifts }) : drifts}
    >
      <Findings
        findings={findings}
        emptyLabel={t('assistant.result.everyPostFollows')}
      />
    </ResultBlock>
  )
}

function dates(
  t: TFunction,
  details: AssistantResultDetails,
  undo?: ResultUndo,
) {
  if (!details.dates) return null
  const { startDate, endDate, postsOutsideRange, undoId } = details.dates
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={t('assistant.result.datesUpdated')}
      meta={`${startDate} → ${endDate}`}
      action={<UndoAction t={t} undoId={undoId} undo={undo} />}
    >
      <UndoNote t={t} undoId={undoId} undo={undo} />
      {postsOutsideRange > 0 && (
        <ResultRow>
          <p className="text-sm text-warning">
            {t('assistant.result.outsideRange', counted(postsOutsideRange))}
          </p>
        </ResultRow>
      )}
    </ResultBlock>
  )
}

function redistribute(t: TFunction, details: AssistantResultDetails) {
  if (!details.redistribute) return null
  const { postsUpdated, phaseCount } = details.redistribute
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={t('assistant.result.postsRedistributed')}
    >
      <ResultRow>
        <p className="text-sm text-secondary-foreground">
          {t('assistant.result.redistributed', {
            ...counted(postsUpdated),
            phases: t('assistant.result.phases', counted(phaseCount)),
          })}
        </p>
      </ResultRow>
    </ResultBlock>
  )
}

/** Planning writes ideas, not posts (CON-449): they wait on the Ideas tab. */
function ideas(t: TFunction, details: AssistantResultDetails) {
  const planned = details.contentPlan ?? details.generatedPosts
  if (!planned) return null
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={
        planned.ideaCount === 0
          ? t('assistant.result.ideasNone')
          : t('assistant.result.ideas', counted(planned.ideaCount))
      }
    >
      <Warnings warnings={planned.warnings} />
      {planned.grounding && <SourcesLine grounding={planned.grounding} />}
    </ResultBlock>
  )
}

function drafts(t: TFunction, details: AssistantResultDetails) {
  const drafted = details.draftedPosts
  if (!drafted) return null
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={
        drafted.postCount === 0
          ? t('assistant.result.draftsNone')
          : t('assistant.result.drafts', counted(drafted.postCount))
      }
    >
      <Warnings warnings={drafted.warnings} />
      {drafted.grounding && <SourcesLine grounding={drafted.grounding} />}
    </ResultBlock>
  )
}

function platforms(
  t: TFunction,
  details: AssistantResultDetails,
  undo?: ResultUndo,
) {
  if (!details.platforms) return null
  const { added, removed, undoId } = details.platforms
  // What changed, in the server's words: "Threads", "the carousel post type
  // on LinkedIn". A removal leaves the posts on it, which the calendar check
  // then offers to deal with (CON-468).
  const meta = [
    added && t('assistant.result.platformsAdded', { what: added }),
    removed && t('assistant.result.platformsRemoved', { what: removed }),
  ].filter(Boolean)
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={t('assistant.result.platformsUpdated')}
      meta={meta.length > 0 ? meta.join(' · ') : undefined}
      action={<UndoAction t={t} undoId={undoId} undo={undo} />}
    >
      <UndoNote t={t} undoId={undoId} undo={undo} />
    </ResultBlock>
  )
}

/** The post goal raised (CON-468): a rate, so the total is said beside it. */
function goal(
  t: TFunction,
  details: AssistantResultDetails,
  undo?: ResultUndo,
) {
  if (!details.goal) return null
  const { perPeriod, cadence, target, undoId } = details.goal
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={t(`assistant.result.goal.${cadence}`, counted(perPeriod))}
      meta={t('assistant.result.goal.total', counted(target))}
      action={<UndoAction t={t} undoId={undoId} undo={undo} />}
    >
      <UndoNote t={t} undoId={undoId} undo={undo} />
    </ResultBlock>
  )
}

function brief(
  t: TFunction,
  details: AssistantResultDetails,
  undo?: ResultUndo,
) {
  if (!details.brief) return null
  const { applied, undoId } = details.brief
  return (
    <ResultBlock
      status={
        applied ? t('assistant.word.done') : t('assistant.word.notApplied')
      }
      tone={applied ? 'neutral' : 'warning'}
      title={
        applied
          ? t('assistant.result.briefApplied')
          : t('assistant.result.briefNotApplied')
      }
      action={
        applied ? <UndoAction t={t} undoId={undoId} undo={undo} /> : undefined
      }
    >
      <UndoNote t={t} undoId={undoId} undo={undo} />
    </ResultBlock>
  )
}

/** UNDO on the headline it undoes; gone once it has been asked for. */
export function UndoAction({
  t,
  undoId,
  undo,
}: {
  t: TFunction
  undoId?: string
  undo?: ResultUndo
}) {
  if (!undoId || !undo) return null
  const state = undo.states[undoId]
  if (state && state !== 'pending') return null
  return (
    <TextAction
      disabled={state === 'pending'}
      onClick={() => undo.onUndo(undoId)}
    >
      {t('assistant.undo.undo')}
    </TextAction>
  )
}

/** What became of an undo: done, or why it could not be. */
export function UndoNote({
  t,
  undoId,
  undo,
}: {
  t: TFunction
  undoId?: string
  undo?: ResultUndo
}) {
  const state = undoId ? undo?.states[undoId] : undefined
  if (!state || state === 'pending') return null
  return (
    <ResultRow>
      {state === 'undone' ? (
        <ResolvedLine>{t('assistant.undo.undone')}</ResolvedLine>
      ) : (
        <p className="text-[12.5px] text-warning">
          {state === 'changed'
            ? t('assistant.undo.changed')
            : t('assistant.undo.gone')}
        </p>
      )}
    </ResultRow>
  )
}

function Warnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null
  return (
    <>
      {warnings.map((warning, i) => (
        <ResultRow key={i}>
          <p className="text-sm text-warning">{warning}</p>
        </ResultRow>
      ))}
    </>
  )
}

/**
 * Severity is a word in small capitals, coloured by consequence. Medium uses
 * foreground ink: `--warning` is too light to carry text at this size at AA.
 */
const SEVERITY_CLASS: Record<ReviewSeverity, string> = {
  high: 'text-destructive',
  medium: 'text-foreground',
  low: 'text-tertiary-foreground',
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
      <ResultRow>
        <p className="text-sm text-tertiary-foreground">{emptyLabel}</p>
      </ResultRow>
    )
  }
  return (
    <ul className="flex flex-col">
      {findings.map((finding, i) => (
        <li key={i}>
          <ResultRow>
            <div className="flex flex-col gap-0.5">
              {(finding.label || finding.severity) && (
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                    {finding.label}
                  </span>
                  {finding.severity && (
                    <span
                      className={cn(
                        'shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em]',
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
          </ResultRow>
        </li>
      ))}
    </ul>
  )
}
