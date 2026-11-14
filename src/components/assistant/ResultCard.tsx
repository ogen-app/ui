import { Fragment, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Link } from '@tanstack/react-router'
import {
  ResolvedLine,
  ResultBlock,
  ResultRow,
  SourcesLine,
  TEXT_ACTION_CLASS,
  TextAction,
} from './blocks'
import type { AssistantResultDetails, UndoState } from '@/types/assistant'
import { counted, formatDateRange } from '@/lib/intl'
import { startOfDay } from '@/lib/assetFilter'

/**
 * The structured half of a campaign-pack turn. Its two reviews (CON-116) are
 * drawn as reviews since CON-478, by `RepairResults`, in the same grammar as
 * `reviewCampaign`'s.
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
  campaignId,
}: {
  details: AssistantResultDetails
  undo?: ResultUndo
  /** The thread's campaign, for OPEN to its Ideas (CON-483). */
  campaignId?: string
}) {
  const { t } = useTranslation()
  const blocks = [
    dates(t, details, undo),
    redistribute(t, details),
    ideas(t, details, undo, campaignId),
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

/**
 * Planning writes ideas, not posts (CON-449): they wait on the Ideas tab —
 * the days they target beside the count, OPEN to that tab, and UNDO, which
 * deletes the ideas still as made (CON-483).
 */
function ideas(
  t: TFunction,
  details: AssistantResultDetails,
  undo?: ResultUndo,
  campaignId?: string,
) {
  const planned = details.contentPlan ?? details.generatedPosts
  if (!planned) return null
  const generated = details.contentPlan ? undefined : details.generatedPosts
  const undoId = generated?.undoId
  const window =
    generated?.windowStart && generated.windowEnd
      ? t('assistant.result.ideasWindow', {
          range: formatDateRange(
            startOfDay(generated.windowStart),
            startOfDay(generated.windowEnd),
            { day: 'numeric', month: 'short' },
          ),
        })
      : undefined
  const open =
    campaignId && planned.ideaCount > 0 ? (
      <Link
        to="/campaigns/$campaignId/ideas"
        params={{ campaignId }}
        className={TEXT_ACTION_CLASS}
      >
        {t('assistant.result.openIdeas')}
      </Link>
    ) : undefined
  const undoAction = <UndoAction t={t} undoId={undoId} undo={undo} />
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={
        planned.ideaCount === 0
          ? t('assistant.result.ideasNone')
          : t('assistant.result.ideas', counted(planned.ideaCount))
      }
      meta={window}
      action={
        open || undoId ? (
          <span className="flex items-center gap-4">
            {undoAction}
            {open}
          </span>
        ) : undefined
      }
    >
      <UndoNote t={t} undoId={undoId} undo={undo} />
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

/**
 * What updateCampaignPlatforms changed. A removal or an addition on its own
 * names what it took off or put on (CON-483): "Facebook is off the
 * campaign", with "no posts on it" when nothing was, or the unpublished posts
 * it left where they were — flagged in Quality, never deleted — and how many
 * scheduled ones it withdrew first, which UNDO doesn't put back.
 */
function platforms(
  t: TFunction,
  details: AssistantResultDetails,
  undo?: ResultUndo,
) {
  if (!details.platforms) return null
  const { added, removed, postsLeft, kept, unscheduled, undoId } =
    details.platforms
  const action = <UndoAction t={t} undoId={undoId} undo={undo} />
  if (added && removed) {
    return (
      <ResultBlock
        status={t('assistant.word.done')}
        title={t('assistant.result.platformsUpdated')}
        meta={t('assistant.result.platformsChanged', { added, removed })}
        action={action}
      >
        <UndoNote t={t} undoId={undoId} undo={undo} />
      </ResultBlock>
    )
  }
  if (added) {
    return (
      <ResultBlock
        status={t('assistant.result.addedWord')}
        title={t('assistant.result.platformsOn', { what: added })}
        action={action}
      >
        <UndoNote t={t} undoId={undoId} undo={undo} />
      </ResultBlock>
    )
  }
  if (!removed) return null
  const left = postsLeft?.posts ?? 0
  const more = left - kept.length
  return (
    <ResultBlock
      status={t('assistant.result.removedWord')}
      title={t('assistant.result.platformsOff', { what: removed })}
      meta={
        postsLeft && left === 0 ? t('assistant.result.noPostsOn') : undefined
      }
      action={action}
    >
      <UndoNote t={t} undoId={undoId} undo={undo} />
      {kept.map((post) => (
        <ResultRow key={post.id} className="flex flex-col gap-0.5">
          <span className="text-sm text-foreground">{post.title}</span>
          <span className="text-[12.5px] text-tertiary-foreground">
            {[post.platform, post.postType].filter(Boolean).join(' · ')}
          </span>
        </ResultRow>
      ))}
      {more > 0 && (
        <p className="pt-2.5 text-[12.5px] text-tertiary-foreground">
          {t('assistant.answered.notMade.more', counted(more))}
        </p>
      )}
      {left > 0 && (
        <ResultRow>
          <p className="text-[12.5px] text-warning-ink">
            {t('assistant.result.keptNote', counted(left))}
          </p>
        </ResultRow>
      )}
      {unscheduled > 0 && (
        <ResultRow>
          <p className="text-[12.5px] text-secondary-foreground">
            {t('assistant.result.unscheduled', counted(unscheduled))}
          </p>
        </ResultRow>
      )}
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
      {details.brief.grounding && (
        <SourcesLine grounding={details.brief.grounding} />
      )}
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
  undone,
  changed,
}: {
  t: TFunction
  undoId?: string
  undo?: ResultUndo
  /** What was put back, when the card can say: "5 ideas back on the desk". */
  undone?: string
  /** Why it can't, and what to do instead, when the card can say. */
  changed?: ReactNode
}) {
  const state = undoId ? undo?.states[undoId] : undefined
  if (!state || state === 'pending') return null
  return (
    <ResultRow>
      {state === 'undone' ? (
        <ResolvedLine>{undone ?? t('assistant.undo.undone')}</ResolvedLine>
      ) : (
        <p className="text-[12.5px] text-warning">
          {state === 'changed'
            ? (changed ?? t('assistant.undo.changed'))
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
