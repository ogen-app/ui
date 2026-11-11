import { Fragment, type ReactNode } from 'react'
import { LockSimpleIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { counted, formatDate } from '@/lib/intl'
import { useAssistantStore } from '@/stores/assistantStore'
import type {
  CalendarPlan,
  CampaignReview,
  PostRevised,
  PostsChanged,
  RepairResults as Results,
  UndoState,
} from '@/types/assistant'
import { ResolvedLine, ResultBlock, ResultRow, SourcesLine } from './blocks'
import { FindingRow, FixActions } from './FindingsBlock'
import { UndoAction, UndoNote, type ResultUndo } from './ResultCard'

/**
 * What the repair pack's review, optimise and post fixes did this turn
 * (CON-462), one card each. The calendar check is `FindingsBlock`, drawn
 * beside these.
 */
export function RepairResults({
  threadId,
  turnId,
  results: r,
  ignored = [],
  undoStates,
  disabled,
}: {
  threadId: string
  turnId: string
  results: Results
  ignored?: string[]
  undoStates: Record<string, UndoState>
  disabled: boolean
}) {
  const { t } = useTranslation()
  const undo = useAssistantStore((s) => s.undo)
  const undoFor: ResultUndo = {
    states: undoStates,
    onUndo: (undoId) => void undo(threadId, turnId, undoId),
  }

  const entries: [string, ReactNode][] = [
    [
      'review',
      r.review && (
        <ReviewCard
          review={r.review}
          threadId={threadId}
          turnId={turnId}
          ignored={ignored}
          disabled={disabled}
        />
      ),
    ],
    ['plan', r.plan && <PlanCard t={t} plan={r.plan} />],
    ['revised', r.revised && <RevisedCard t={t} revised={r.revised} />],
    [
      'converted',
      r.converted && (
        <ChangedCard
          t={t}
          word={t('assistant.repair.converted.word')}
          title={t(
            'assistant.repair.converted.title',
            counted(r.converted.changed),
          )}
          change={r.converted}
          undo={undoFor}
        />
      ),
    ],
    [
      'unscheduled',
      r.unscheduled && (
        <ChangedCard
          t={t}
          word={t('assistant.repair.unscheduled.word')}
          title={t(
            'assistant.repair.unscheduled.title',
            counted(r.unscheduled.changed),
          )}
          change={r.unscheduled}
          undo={undoFor}
        />
      ),
    ],
    [
      'deleted',
      r.deleted && (
        <ChangedCard
          t={t}
          word={t('assistant.repair.deleted.word')}
          title={t(
            'assistant.repair.deleted.title',
            counted(r.deleted.changed),
          )}
          change={r.deleted}
        />
      ),
    ],
  ]
  const blocks = entries.filter(([, node]) => Boolean(node))
  if (blocks.length === 0) return null
  return (
    <div className="flex flex-col gap-5">
      {blocks.map(([key, block]) => (
        <Fragment key={key}>{block}</Fragment>
      ))}
    </div>
  )
}

/**
 * The brief and the posts read against each other. Each finding carries its
 * own fixes — the brief's own edit, or rewriting the post — and IGNORE, which
 * the next review honours while the brief or the post stays the same.
 */
function ReviewCard({
  review,
  threadId,
  turnId,
  ignored,
  disabled,
}: {
  review: CampaignReview
  threadId: string
  turnId: string
  ignored: string[]
  disabled: boolean
}) {
  const { t } = useTranslation()
  const ignore = useAssistantStore((s) => s.ignoreFinding)
  const { campaignId } = review
  const open = review.findings.filter((f) => !ignored.includes(f.key))
  const gone = review.findings.filter((f) => ignored.includes(f.key))
  return (
    <ResultBlock
      status={t('assistant.repair.review.word')}
      tone={open.length > 0 ? 'warning' : 'neutral'}
      title={
        open.length === 0
          ? t('assistant.repair.review.none')
          : t('assistant.repair.review.title', counted(open.length))
      }
      meta={
        review.postsChecked > 0
          ? t('assistant.repair.review.read', counted(review.postsChecked))
          : undefined
      }
    >
      {open.length > 0 && (
        <ol className="flex flex-col">
          {open.map((f, i) => (
            <FindingRow
              key={f.key || i}
              n={i + 1}
              warn={f.severity === 'high'}
              title={f.issue}
              detail={
                f.label && f.suggestion
                  ? t('assistant.repair.review.detail', {
                      label: f.label,
                      suggestion: f.suggestion,
                    })
                  : (f.label ?? f.suggestion)
              }
              onIgnore={
                f.key && campaignId
                  ? () => void ignore(threadId, turnId, campaignId, f.key)
                  : undefined
              }
              disabled={disabled}
            >
              <FixActions
                threadId={threadId}
                campaignId={campaignId}
                fixes={f.fixes}
                posts={f.postId ? 1 : 0}
                disabled={disabled}
              />
            </FindingRow>
          ))}
        </ol>
      )}
      {gone.map((f) => (
        <ResolvedLine key={f.key}>
          {t('assistant.findings.ignored', { finding: f.issue })}
        </ResolvedLine>
      ))}
      {review.dismissed > 0 && (
        <p className="pt-1 text-xs text-tertiary-foreground">
          {t('assistant.findings.dismissed', counted(review.dismissed))}
        </p>
      )}
    </ResultBlock>
  )
}

/** Moves listed before the rest are summed up. */
const PLAN_ROWS = 8

/**
 * The moves an optimise offers, with the scheduled posts it leaves where they
 * are, locked. Confirming is the offer's own card, under this one.
 */
function PlanCard({ t, plan }: { t: TFunction; plan: CalendarPlan }) {
  const day = (value: string) =>
    formatDate(value, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      // A day, not an instant: read in UTC so no timezone moves it.
      timeZone: 'UTC',
    }) ?? value
  const shown = plan.moves.slice(0, PLAN_ROWS)
  const more = plan.moves.length - shown.length
  return (
    <ResultBlock
      status={t('assistant.repair.plan.word')}
      title={
        plan.moves.length === 0
          ? t('assistant.repair.plan.even')
          : t('assistant.repair.plan.title', counted(plan.moves.length))
      }
      meta={
        plan.locked.length > 0
          ? t('assistant.repair.plan.locked', counted(plan.locked.length))
          : undefined
      }
    >
      {shown.map((m) => (
        <ResultRow key={m.postId} className="flex gap-3 text-sm">
          <span className="w-2/5 shrink-0 truncate text-tertiary-foreground">
            {m.title || t('assistant.repair.untitled')}
          </span>
          <span className="text-foreground">
            {t('assistant.repair.plan.move', {
              from: day(m.from),
              to: day(m.to),
            })}
          </span>
        </ResultRow>
      ))}
      {more > 0 && (
        <ResultRow className="text-[12.5px] text-tertiary-foreground">
          {t('assistant.repair.plan.more', counted(more))}
        </ResultRow>
      )}
      {plan.locked.map((l) => (
        <ResultRow key={l.postId} className="flex gap-3 text-sm">
          <span className="w-2/5 shrink-0 truncate text-tertiary-foreground">
            {l.title || t('assistant.repair.untitled')}
          </span>
          <span className="flex items-center gap-1.5 text-tertiary-foreground">
            <LockSimpleIcon aria-hidden className="size-3.5 shrink-0" />
            {t('assistant.repair.plan.stays', { date: day(l.date) })}
          </span>
        </ResultRow>
      ))}
    </ResultBlock>
  )
}

/**
 * Posts a fix changed. A withdrawal from publishing is said apart, because
 * no undo reaches it; a post the fix left is named with the server's reason.
 */
function ChangedCard({
  t,
  word,
  title,
  change,
  undo,
}: {
  t: TFunction
  word: string
  title: string
  change: PostsChanged
  undo?: ResultUndo
}) {
  return (
    <ResultBlock
      status={word}
      title={title}
      action={<UndoAction t={t} undoId={change.undoId} undo={undo} />}
    >
      {change.withdrawing > 0 && (
        <ResultRow className="text-[12.5px] text-warning">
          {t('assistant.repair.withdrawing', counted(change.withdrawing))}
        </ResultRow>
      )}
      {change.skipped.map((s) => (
        <ResultRow
          key={s.postId}
          className="text-[12.5px] text-tertiary-foreground"
        >
          {t('assistant.repair.skipped', { reason: s.reason })}
        </ResultRow>
      ))}
      <UndoNote t={t} undoId={change.undoId} undo={undo} />
    </ResultBlock>
  )
}

/**
 * One post rewritten (`revisePost`), and where its words came from: a
 * rewrite keeps the post's sources, so the line is the post's own (CON-474).
 */
function RevisedCard({ t, revised }: { t: TFunction; revised: PostRevised }) {
  return (
    <ResultBlock
      status={t('assistant.repair.revised.word')}
      title={
        revised.revised
          ? t('assistant.repair.revised.title')
          : t('assistant.repair.revised.notRevised')
      }
      meta={
        revised.revised && revised.versioned
          ? t('assistant.repair.revised.versioned')
          : undefined
      }
    >
      {revised.revised && !revised.versioned && (
        <ResultRow className="text-[12.5px] text-warning">
          {t('assistant.repair.revised.unversioned')}
        </ResultRow>
      )}
      {revised.grounding && <SourcesLine grounding={revised.grounding} />}
    </ResultBlock>
  )
}
