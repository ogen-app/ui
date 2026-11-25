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
import { counted, formatDate, formatDateRange, formatList } from '@/lib/intl'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
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
    details.draftedPosts && (
      <DraftsCard
        t={t}
        drafted={details.draftedPosts}
        campaignId={campaignId}
      />
    ),
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

/**
 * What draftPost made (CON-484): DRAFTED, how many, where and when — "1 post
 * · Threads · Thu 24" — with OPEN, and a row per draft. The day is the
 * drafts' own, or "not scheduled" only when none of them has one.
 */
function DraftsCard({
  t,
  drafted,
  campaignId,
}: {
  t: TFunction
  drafted: NonNullable<AssistantResultDetails['draftedPosts']>
  campaignId?: string
}) {
  const { resolve } = usePlatformCatalog()
  if (drafted.postCount === 0)
    return (
      <ResultBlock
        status={t('assistant.word.done')}
        title={t('assistant.result.draftsNone')}
      >
        <Warnings warnings={drafted.warnings} />
      </ResultBlock>
    )
  const { posts } = drafted
  const platforms = [...new Set(posts.map((p) => p.platform).filter(Boolean))]
  const days = posts
    .map((p) => p.date)
    .filter((d): d is string => !!d)
    .sort()
  const when =
    posts.length === 0
      ? undefined
      : days.length === 0
        ? t('assistant.result.notScheduled')
        : days.length === posts.length
          ? days[0] === days[days.length - 1]
            ? dayLabel(days[0])
            : formatDateRange(
                startOfDay(days[0]),
                startOfDay(days[days.length - 1]),
                {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                },
              )
          : undefined
  const meta = [formatList(platforms), when].filter(Boolean).join(' · ')
  const open =
    campaignId && posts.length === 1 ? (
      <Link
        to="/campaigns/$campaignId/posts/$postId"
        params={{ campaignId, postId: posts[0].id }}
        className={TEXT_ACTION_CLASS}
      >
        {t('assistant.result.openPost')}
      </Link>
    ) : campaignId && posts.length > 1 ? (
      <Link
        to="/campaigns/$campaignId/list"
        params={{ campaignId }}
        className={TEXT_ACTION_CLASS}
      >
        {t('assistant.result.openPosts')}
      </Link>
    ) : undefined
  return (
    <ResultBlock
      status={t('assistant.result.draftedWord')}
      title={t('assistant.result.drafted', counted(drafted.postCount))}
      meta={meta || undefined}
      action={open}
    >
      {posts.map((post) => {
        const type =
          resolve(post.platformId)?.postTypes?.find(
            (pt) => pt.slug === post.postType,
          )?.label ?? post.postType
        return (
          <ResultRow key={post.id} className="flex flex-col gap-0.5">
            <span className="text-sm text-foreground">{post.title}</span>
            <span className="text-xs text-tertiary-foreground">
              {[post.platform, type].filter(Boolean).join(' · ')}
            </span>
          </ResultRow>
        )
      })}
      <Warnings warnings={drafted.warnings} />
      {drafted.grounding && <SourcesLine grounding={drafted.grounding} />}
    </ResultBlock>
  )
}

/** A `YYYY-MM-DD` day as the card prints it: "Thu 24 Apr". */
function dayLabel(day: string): string {
  return (
    formatDate(startOfDay(day), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }) ?? day
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
  const left = postsLeft?.posts ?? 0
  // What a removal did to the posts on it, whether or not the same change
  // also added something.
  const consequences = (
    <>
      {kept.map((post) => (
        <ResultRow key={post.id} className="flex flex-col gap-0.5">
          <span className="text-sm text-foreground">{post.title}</span>
          <span className="text-xs text-tertiary-foreground">
            {[post.platform, post.postType].filter(Boolean).join(' · ')}
          </span>
        </ResultRow>
      ))}
      {left - kept.length > 0 && (
        <p className="pt-2.5 text-xs text-tertiary-foreground">
          {t('assistant.answered.notMade.more', counted(left - kept.length))}
        </p>
      )}
      {left > 0 && (
        <ResultRow>
          <p className="text-xs text-warning-ink">
            {t('assistant.result.keptNote', counted(left))}
          </p>
        </ResultRow>
      )}
      {unscheduled > 0 && (
        <ResultRow>
          <p className="text-xs text-secondary-foreground">
            {t('assistant.result.unscheduled', counted(unscheduled))}
          </p>
        </ResultRow>
      )}
    </>
  )
  if (added && removed) {
    return (
      <ResultBlock
        status={t('assistant.word.done')}
        title={t('assistant.result.platformsUpdated')}
        meta={t('assistant.result.platformsChanged', { added, removed })}
        action={action}
      >
        <UndoNote t={t} undoId={undoId} undo={undo} />
        {consequences}
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
      {consequences}
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

/** The brief fields the catalogue names; another is shown by its slug. */
const BRIEF_FIELDS = [
  'description',
  'targetPersona',
  'keyMessages',
  'toneGuidelines',
] as const

/**
 * enrichBrief (CON-484): BRIEF, "Messaging rewritten · 4 fields", a row per
 * field with its new value, and UNDO. A server that names no fields gets
 * the plain line it always had.
 */
function brief(
  t: TFunction,
  details: AssistantResultDetails,
  undo?: ResultUndo,
) {
  if (!details.brief) return null
  const { applied, undoId, fields } = details.brief
  const named = applied && fields.length > 0
  return (
    <ResultBlock
      status={
        named
          ? t('assistant.result.briefWord')
          : applied
            ? t('assistant.word.done')
            : t('assistant.word.notApplied')
      }
      tone={applied ? 'neutral' : 'warning'}
      title={
        named
          ? t('assistant.result.briefRewritten')
          : applied
            ? t('assistant.result.briefApplied')
            : t('assistant.result.briefNotApplied')
      }
      meta={
        named
          ? t('assistant.result.briefFields', counted(fields.length))
          : undefined
      }
      action={
        applied ? <UndoAction t={t} undoId={undoId} undo={undo} /> : undefined
      }
    >
      <UndoNote t={t} undoId={undoId} undo={undo} />
      {named &&
        fields.map(({ field, value }) => {
          const known = BRIEF_FIELDS.find((f) => f === field)
          return (
            <ResultRow key={field} className="flex flex-col gap-0.5">
              <span className="text-sm text-foreground">
                {known ? t(`assistant.result.briefField.${known}`) : field}
              </span>
              <span className="text-xs whitespace-pre-line text-secondary-foreground">
                {value}
              </span>
            </ResultRow>
          )
        })}
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
        <p className="text-xs text-warning">
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
